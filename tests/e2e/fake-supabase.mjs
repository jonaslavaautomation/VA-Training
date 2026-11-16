// In-memory stand-in for Supabase (Auth, PostgREST incl. RPCs, Functions,
// Storage with TUS + signed URLs) used by the browser tests in this folder.
// It is a TEST DOUBLE: passing tests here do not replace testing your real project.
// RLS rules and audit triggers are emulated to match the real migrations.
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { handleLava } from './fake-lava.mjs'

const now = () => new Date().toISOString()
export const state = {
  users: new Map(), profiles: new Map(), tokens: new Map(), refresh: new Map(), authInfo: new Map(),
  categories: [], resources: [], progress: [], favorites: [], activity: [], announcements: [],
  buckets: {
    'training-pdfs': { limit: 50 * 1024 * 1024, mimes: ['application/pdf'] },
    'training-videos': { limit: 2 * 1024 * 1024 * 1024, mimes: ['video/mp4', 'video/webm'] },
    'resource-thumbnails': { limit: 5 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
    'announcement-images': { limit: 5 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  },
  objects: new Map(), tus: new Map(), signTokens: new Map(), emails: [], otps: new Map(), cspReports: [],
  confirmEmail: false, // Supabase Auth → Confirm email
  newAccountStatus: 'active', // portal_settings.new_account_status
  adminFunctionDeployed: true, // optional admin-members Edge Function (email features)
}
let seq = 0
const stamp = () => new Date(Date.now() + seq++).toISOString()

export function addUser(email, password, { role = 'member', status = 'active', first = '', last = '', phone = null, created = now(), lastSignIn = null, banned = false } = {}) {
  const id = randomUUID()
  state.users.set(id, { id, email, password, banned })
  state.profiles.set(id, { id, email, first_name: first, last_name: last, phone, role, status, avatar_url: null, created_at: created, updated_at: created })
  state.authInfo.set(id, { id, last_sign_in_at: lastSignIn, invited_at: null, email_confirmed_at: null })
  return id
}
export function log(uid, activity_type, target_type = null, target_id = null, target_label = null, details = null, resource_id = null) {
  state.activity.push({ id: randomUUID(), user_id: uid, activity_type, target_type, target_id, target_label, details, resource_id, created_at: stamp() })
}
const label = (p) => `${[p.first_name, p.last_name].filter(Boolean).join(' ')} <${p.email}>`.trim()

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function issue(id) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, role: 'authenticated', exp })}.sig`
  const refresh = randomUUID()
  state.tokens.set(access, id)
  state.refresh.set(refresh, id)
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: authUser(id) }
}
const authUser = (id) => ({ id, aud: 'authenticated', role: 'authenticated', email: state.users.get(id).email, app_metadata: {}, user_metadata: {}, created_at: now() })
const cors = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Range, Location, Upload-Offset, Upload-Length, Tus-Resumable, Content-Disposition, Accept-Ranges, Content-Length',
}
function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body)
  res.writeHead(status, { ...(isBuf ? {} : { 'Content-Type': 'application/json' }), ...cors, ...headers })
  res.end(body === undefined ? '' : isBuf ? body : JSON.stringify(body))
}
const callerId = (req) => state.tokens.get((req.headers.authorization ?? '').replace(/^Bearer /i, '')) ?? null
const isAdmin = (id) => { const p = id && state.profiles.get(id); return p?.role === 'admin' && p.status === 'active' }
const isActive = (id) => state.profiles.get(id)?.status === 'active'
const pub = (p) => (p ? { first_name: p.first_name, last_name: p.last_name, email: p.email, role: p.role } : null)
const categoryOf = (r) => state.categories.find((c) => c.id === r.category_id) ?? null
const shapeResource = (r, uid) => {
  const c = categoryOf(r)
  return { ...r, category: c && (isAdmin(uid) || c.is_visible) ? c : null, uploader: pub(state.profiles.get(r.uploaded_by)) }
}
const visibleResources = (uid) => (isAdmin(uid) ? state.resources : isActive(uid) ? state.resources.filter((r) => r.status === 'published') : [])
const liveAnnouncement = (a) => a.status === 'published' && (!a.publish_at || new Date(a.publish_at) <= new Date())

function canRead(uid, bucket, name) {
  if (isAdmin(uid)) return true
  if (!isActive(uid)) return false
  if (bucket === 'announcement-images') return state.announcements.some((a) => a.image_path === name && liveAnnouncement(a))
  return state.resources.some((r) => r.status === 'published' && (
    (bucket === 'training-pdfs' && r.resource_type === 'PDF' && r.storage_path === name) ||
    (bucket === 'training-videos' && r.resource_type === 'VIDEO' && r.storage_path === name) ||
    (bucket === 'resource-thumbnails' && r.thumbnail_path === name)))
}

function applyFilters(params, rows) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
    if (k === 'or') {
      const conds = v.replace(/^\(|\)$/g, '').split(',').map((c) => { const [col, , ...rest] = c.split('.'); return { col, val: rest.join('.').replace(/[%*]/g, '').toLowerCase() } })
      rows = rows.filter((r) => conds.some(({ col, val }) => String(r[col] ?? '').toLowerCase().includes(val)))
      continue
    }
    if (k === 'category.slug') { const slug = v.slice(3); rows = rows.filter((r) => categoryOf(r)?.slug === slug); continue }
    if (k.includes('.')) continue
    const i = v.indexOf('.')
    const op = v.slice(0, i)
    const val = v.slice(i + 1)
    if (op === 'eq') rows = rows.filter((r) => String(r[k]) === val)
    if (op === 'neq') rows = rows.filter((r) => String(r[k]) !== val)
    if (op === 'in') { const set = val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/"/g, '')); rows = rows.filter((r) => set.includes(String(r[k]))) }
    if (op === 'is' && val === 'null') rows = rows.filter((r) => r[k] === null || r[k] === undefined)
    if (op === 'ilike') rows = rows.filter((r) => String(r[k] ?? '').toLowerCase().includes(val.replace(/[%*]/g, '').toLowerCase()))
    if (op === 'gte') rows = rows.filter((r) => String(r[k]) >= val)
    if (op === 'lt') rows = rows.filter((r) => String(r[k]) < val)
  }
  const order = params.get('order')
  if (order) {
    const keys = order.split(',').map((o) => o.split('.'))
    rows = [...rows].sort((a, b) => {
      for (const [col, dir] of keys) {
        const x = String(a[col] ?? ''); const y = String(b[col] ?? '')
        if (x !== y) return (col === 'title' || col === 'name' ? x.localeCompare(y) : x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1)
      }
      return 0
    })
  }
  const total = rows.length
  const offset = Number(params.get('offset') ?? 0)
  const limit = params.get('limit')
  if (offset || limit) rows = rows.slice(offset, limit ? offset + Number(limit) : undefined)
  rows.total = total
  return rows
}
function respond(req, res, rows, status = 200) {
  if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) return rows.length === 1 ? send(res, status, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'not single' })
  send(res, status, rows)
}
function respondList(req, res, url, rows) {
  if (req.method === 'HEAD') return send(res, 200, undefined, { 'Content-Range': `*/${rows.total ?? rows.length}` })
  if ((req.headers.prefer ?? '').includes('count=exact')) {
    const off = Number(url.searchParams.get('offset') ?? 0)
    return send(res, 200, rows, { 'Content-Range': `${off}-${off + rows.length - 1}/${rows.total ?? rows.length}` })
  }
  return respond(req, res, rows)
}
const rls = (res, msg = 'new row violates row-level security policy') => send(res, 403, { code: '42501', message: msg })
function parseTusMeta(header = '') {
  return Object.fromEntries(header.split(',').filter(Boolean).map((pair) => { const [k, v] = pair.trim().split(' '); return [k, v ? Buffer.from(v, 'base64').toString() : ''] }))
}
function multipartFile(buf, contentType) {
  const boundary = contentType.match(/boundary=(.+)$/)?.[1]
  if (!boundary) return { data: buf }
  for (const p of buf.toString('latin1').split(`--${boundary}`)) {
    const idx = p.indexOf('\r\n\r\n')
    if (idx < 0) continue
    const head = p.slice(0, idx)
    if (!/filename=|name=""/.test(head)) continue
    return { data: Buffer.from(p.slice(idx + 4, p.length - 2), 'latin1'), type: head.match(/Content-Type: (.+)/i)?.[1]?.trim() }
  }
  return { data: buf }
}

// ---- admin-members Edge Function emulation (same rules as the real function)
function adminMembers(uid, body) {
  if (!isAdmin(uid)) return [403, { error: { code: 'forbidden', message: 'Only administrators can manage members.' } }]
  const p = body.user_id && state.profiles.get(body.user_id)
  switch (body.action) {
    case 'create': {
      if ([...state.profiles.values()].some((x) => x.email === body.email)) return [409, { error: { code: 'email_exists', message: 'An account with this email address already exists.' } }]
      if (body.phone && !/^[0-9+()\-. ]+$/.test(body.phone)) return [400, { error: { code: 'validation_failed', message: 'Enter a valid contact number.' } }]
      const id = addUser(body.email, null, { first: body.first_name, last: body.last_name, phone: body.phone ?? null, role: body.role ?? 'member', status: body.status ?? 'active', banned: body.status === 'inactive' })
      const invited = (body.status ?? 'active') === 'active'
      if (invited) { state.emails.push(`invite:${body.email}`); state.otps.set(`invite-${id}`, id) } // the 'email link' token
      log(uid, 'member_created', 'member', id, label(state.profiles.get(id)), { role: body.role ?? 'member', status: body.status ?? 'active', invited })
      return [201, { member: state.profiles.get(id), invited }]
    }
    case 'update': {
      if (!p) return [404, { error: { code: 'not_found', message: 'Member not found.' } }]
      if (body.role && body.role !== p.role && body.user_id === uid) return [400, { error: { code: 'cannot_change_self', message: 'You cannot change your own role.' } }]
      const fields = ['first_name', 'last_name', 'phone', 'email'].filter((f) => body[f] !== undefined && (body[f] ?? null) !== p[f])
      const roleChanged = body.role && body.role !== p.role
      const from = p.role
      for (const f of fields) p[f] = body[f] ?? null
      if (roleChanged) p.role = body.role
      if (fields.length) log(uid, 'member_updated', 'member', p.id, label(p), { fields })
      if (roleChanged) log(uid, 'member_role_changed', 'member', p.id, label(p), { from, to: p.role })
      return [200, { member: p }]
    }
    case 'set_status': {
      if (!p) return [404, { error: { code: 'not_found', message: 'Member not found.' } }]
      if (body.user_id === uid) return [400, { error: { code: 'cannot_change_self', message: 'You cannot change the status of your own account.' } }]
      if (p.status !== body.status) {
        p.status = body.status
        state.users.get(p.id).banned = body.status === 'inactive'
        log(uid, body.status === 'active' ? 'member_activated' : 'member_deactivated', 'member', p.id, label(p))
      }
      return [200, { member: p }]
    }
    case 'send_access_email': {
      if (!p) return [404, { error: { code: 'not_found', message: 'Member not found.' } }]
      if (p.status !== 'active') return [400, { error: { code: 'inactive_account', message: 'Reactivate this account before sending it an email.' } }]
      const invite = !state.authInfo.get(p.id)?.last_sign_in_at
      state.emails.push(`${invite ? 'invite' : 'recovery'}:${p.email}`)
      log(uid, invite ? 'member_invite_sent' : 'member_password_reset_sent', 'member', p.id, label(p))
      return [200, { sent: invite ? 'invite' : 'recovery' }]
    }
  }
  return [400, { error: { code: 'unknown_action', message: 'Unknown action.' } }]
}

// ---- audit trigger emulation for resources
function auditResource(uid, before, after) {
  if (!before) return log(uid, 'resource_uploaded', 'resource', after.id, after.title, { type: after.resource_type, status: after.status }, after.id)
  if (!after) return log(uid, 'resource_deleted', 'resource', before.id, before.title, { type: before.resource_type })
  if (before.status !== after.status) log(uid, after.status === 'published' ? 'resource_published' : 'resource_unpublished', 'resource', after.id, after.title, null, after.id)
  if (before.storage_path !== after.storage_path) log(uid, 'resource_file_replaced', 'resource', after.id, after.title, null, after.id)
  const fields = [['title', 'title'], ['description', 'description'], ['category_id', 'category'], ['thumbnail_path', 'thumbnail']].filter(([c]) => before[c] !== after[c]).map(([, n]) => n)
  if (fields.length) log(uid, 'resource_updated', 'resource', after.id, after.title, { fields }, after.id)
}

export function start(port) {
  const base = `http://127.0.0.1:${port}`
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, base)
    const path = decodeURIComponent(url.pathname)
    if (req.method === 'OPTIONS') return send(res, 200, undefined)
    const chunks = []
    for await (const c of req) chunks.push(c)
    const raw = Buffer.concat(chunks)
    let body = null
    if ((req.headers['content-type'] ?? '').includes('json')) { try { body = JSON.parse(raw.toString() || 'null') } catch { body = null } }
    const uid = callerId(req)
    let m

    // ---------------- Auth
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const u = [...state.users.values()].find((x) => x.email === body.email)
      if (!u || u.password !== body.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      if (u.banned) return send(res, 400, { code: 400, error_code: 'user_banned', msg: 'User is banned' })
      if (u.unconfirmed) return send(res, 400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' })
      state.authInfo.get(u.id).last_sign_in_at = now()
      log(u.id, 'signed_in') // emulates the on_auth_user_signed_in trigger (server-side sign-in record)
      return send(res, 200, issue(u.id))
    }
    if (path === '/auth/v1/signup' && req.method === 'POST') {
      const email = String(body.email ?? '').toLowerCase()
      const existing = [...state.users.values()].find((x) => x.email === email)
      if (existing) {
        // Real Supabase: an error when confirmation is off; a look-alike success when it's on (privacy).
        if (!state.confirmEmail) return send(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
        return send(res, 200, { id: randomUUID(), aud: 'authenticated', role: '', email, identities: [], user_metadata: {}, app_metadata: {}, created_at: now() })
      }
      if (String(body.password ?? '').length < 6) return send(res, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters' })
      // handle_new_user trigger: role ALWAYS member (metadata role ignored), status from portal_settings
      const id = addUser(email, body.password, { first: body.data?.first_name ?? '', last: body.data?.last_name ?? '', role: 'member', status: state.newAccountStatus })
      const u = state.users.get(id)
      if (state.confirmEmail) {
        u.unconfirmed = true
        state.emails.push(`confirm:${email}`)
        return send(res, 200, { ...authUser(id), identities: [{ id }], confirmation_sent_at: now() })
      }
      state.authInfo.get(id).last_sign_in_at = now()
      log(id, 'signed_in') // on_auth_user_signed_in trigger
      return send(res, 200, issue(id))
    }
    if (path === '/auth/v1/token') { const id = state.refresh.get(body?.refresh_token); return id ? send(res, 200, issue(id)) : send(res, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }) }
    if (path === '/auth/v1/user' && req.method === 'GET') return uid ? send(res, 200, authUser(uid)) : send(res, 401, { error_code: 'bad_jwt', msg: 'invalid JWT' })
    if (path === '/auth/v1/user' && req.method === 'PUT') { if (body?.password) state.users.get(uid).password = body.password; return send(res, 200, authUser(uid)) }
    if (path === '/auth/v1/logout') return send(res, 204, undefined)
    if (path === '/auth/v1/recover') {
      const u = [...state.users.values()].find((x) => x.email === body?.email)
      if (u) { state.emails.push(`recovery:${u.email}`); state.otps.set(`recovery-${u.id}`, u.id) }
      return send(res, 200, {}) // same response whether or not the account exists
    }
    if (path === '/auth/v1/verify' && req.method === 'POST') {
      const id = state.otps.get(body.token_hash)
      if (!id || !body.token_hash.startsWith(`${body.type}-`)) return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Email link is invalid or has expired' })
      state.otps.delete(body.token_hash) // single use
      state.authInfo.get(id).last_sign_in_at = now()
      log(id, 'signed_in')
      return send(res, 200, issue(id))
    }

    // ---------------- Functions
    if (path === '/functions/v1/admin-members') {
      if (!state.adminFunctionDeployed) return send(res, 404, { code: 'NOT_FOUND', message: 'Requested function was not found' })
      if (!uid) return send(res, 401, { error: { code: 'unauthorized', message: 'Please sign in again.' } })
      const [status, payload] = adminMembers(uid, body ?? {})
      return send(res, status, payload)
    }

    // ---------------- Storage
    if ((m = path.match(/^\/storage\/v1\/bucket\/([^/]+)$/))) {
      const b = state.buckets[m[1]]
      if (!b || !isAdmin(uid)) return send(res, 400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' })
      return send(res, 200, { id: m[1], name: m[1], public: false, file_size_limit: b.limit, allowed_mime_types: b.mimes })
    }
    if (path === '/storage/v1/upload/resumable' && req.method === 'POST') {
      const meta = parseTusMeta(req.headers['upload-metadata'])
      const length = Number(req.headers['upload-length'])
      if (!isAdmin(uid)) return send(res, 403, { message: 'new row violates row-level security policy' }, { 'Tus-Resumable': '1.0.0' })
      const id = randomUUID()
      state.tus.set(id, { meta, length, data: raw })
      if (raw.length === length) state.objects.set(`${meta.bucketName}/${meta.objectName}`, { bucket: meta.bucketName, name: meta.objectName, data: raw, type: meta.contentType, createdAt: Date.now() })
      return send(res, 201, undefined, { Location: `${base}/storage/v1/upload/resumable/${id}`, 'Upload-Offset': String(raw.length), 'Tus-Resumable': '1.0.0' })
    }
    if ((m = path.match(/^\/storage\/v1\/upload\/resumable\/([\w-]+)$/))) {
      const up = state.tus.get(m[1])
      if (!up) return send(res, 404, { message: 'not found' })
      if (req.method === 'HEAD') return send(res, 200, undefined, { 'Upload-Offset': String(up.data.length), 'Upload-Length': String(up.length), 'Cache-Control': 'no-store', 'Tus-Resumable': '1.0.0' })
      if (req.method === 'PATCH') {
        up.data = Buffer.concat([up.data, raw])
        if (up.data.length === up.length) state.objects.set(`${up.meta.bucketName}/${up.meta.objectName}`, { bucket: up.meta.bucketName, name: up.meta.objectName, data: up.data, type: up.meta.contentType, createdAt: Date.now() })
        return send(res, 204, undefined, { 'Upload-Offset': String(up.data.length), 'Tus-Resumable': '1.0.0' })
      }
      if (req.method === 'DELETE') { state.tus.delete(m[1]); return send(res, 204, undefined, { 'Tus-Resumable': '1.0.0' }) }
    }
    if ((m = path.match(/^\/storage\/v1\/object\/sign\/([^/]+)$/)) && req.method === 'POST') {
      return send(res, 200, body.paths.map((p) => {
        if (!state.objects.has(`${m[1]}/${p}`) || !canRead(uid, m[1], p)) return { path: p, signedURL: null, error: 'not found' }
        const tok = randomUUID(); state.signTokens.set(tok, { key: `${m[1]}/${p}`, exp: Date.now() + body.expiresIn * 1000 })
        return { path: p, signedURL: `/object/sign/${m[1]}/${encodeURI(p)}?token=${tok}`, error: null }
      }))
    }
    if ((m = path.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/))) {
      const key = `${m[1]}/${m[2]}`
      if (req.method === 'POST') {
        if (!state.objects.has(key) || !canRead(uid, m[1], m[2])) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
        const tok = randomUUID(); state.signTokens.set(tok, { key, exp: Date.now() + body.expiresIn * 1000 })
        return send(res, 200, { signedURL: `/object/sign/${m[1]}/${encodeURI(m[2])}?token=${tok}` })
      }
      const t = state.signTokens.get(url.searchParams.get('token'))
      if (!t || t.key !== key || t.exp < Date.now()) return send(res, 400, { message: 'jwt expired' })
      const obj = state.objects.get(key)
      if (!obj) return send(res, 404, { message: 'Object not found' })
      const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/)
      const headers = { 'Content-Type': obj.type, 'Accept-Ranges': 'bytes' }
      if (range) {
        const s0 = Number(range[1]); const e = range[2] ? Number(range[2]) : obj.data.length - 1
        return send(res, 206, obj.data.subarray(s0, e + 1), { ...headers, 'Content-Range': `bytes ${s0}-${e}/${obj.data.length}` })
      }
      return send(res, 200, obj.data, headers)
    }
    if ((m = path.match(/^\/storage\/v1\/object\/([^/]+)$/)) && req.method === 'DELETE') {
      if (!isAdmin(uid)) return send(res, 200, [])
      return send(res, 200, body.prefixes.filter((p) => state.objects.delete(`${m[1]}/${p}`)).map((name) => ({ name })))
    }
    if ((m = path.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/)) && (req.method === 'POST' || req.method === 'PUT')) {
      if (!isAdmin(uid)) return send(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' })
      const file = multipartFile(raw, req.headers['content-type'] ?? '')
      state.objects.set(`${m[1]}/${m[2]}`, { bucket: m[1], name: m[2], data: file.data, type: file.type || 'image/jpeg', createdAt: Date.now() })
      return send(res, 200, { Key: `${m[1]}/${m[2]}`, Id: randomUUID() })
    }

    // ---------------- LAVA portal (real migrations in PGlite, see fake-lava.mjs)
    if (await handleLava({ req, res, url, path, body, uid, state, send })) return

    // ---------------- RPC
    if (path === '/rest/v1/rpc/admin_member_auth_info') {
      if (!isAdmin(uid)) return rls(res, 'Only administrators can do this.')
      return send(res, 200, body.p_ids.map((id) => state.authInfo.get(id)).filter(Boolean))
    }
    // admin_set_member_status / admin_update_member (migration 010): same rules as the SQL functions
    if (path === '/rest/v1/rpc/admin_set_member_status' || path === '/rest/v1/rpc/admin_update_member') {
      if (!isAdmin(uid)) return rls(res, 'Only administrators can manage members.')
      const reject = (message) => send(res, 400, { code: 'P0001', message, details: null, hint: null })
      const p = state.profiles.get(body.p_user_id)
      if (path.endsWith('status')) {
        if (!['active', 'inactive'].includes(body.p_status)) return reject('Invalid status.')
        if (body.p_user_id === uid) return reject('You cannot change the status of your own account.')
        if (!p) return reject('Member not found.')
        if (p.status !== body.p_status) {
          p.status = body.p_status
          state.users.get(p.id).banned = body.p_status === 'inactive'
          log(uid, body.p_status === 'active' ? 'member_activated' : 'member_deactivated', 'member', p.id, label(p))
        }
        return send(res, 200, p)
      }
      if (!p) return reject('Member not found.')
      const tidy = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
      const next = { first_name: tidy(body.p_first_name), last_name: tidy(body.p_last_name), phone: tidy(body.p_phone) || null }
      if (!next.first_name || !next.last_name) return reject('First and last name are required.')
      if (next.phone && !/^[0-9+()\-. ]+$/.test(next.phone)) return reject('Enter a valid contact number (digits, spaces, + ( ) - . only).')
      const role = body.p_role ?? p.role
      if (role !== p.role && body.p_user_id === uid) return reject('You cannot change your own role.')
      const fields = Object.keys(next).filter((f) => next[f] !== p[f])
      const from = p.role
      Object.assign(p, next, { role })
      if (fields.length) log(uid, 'member_updated', 'member', p.id, label(p), { fields })
      if (role !== from) log(uid, 'member_role_changed', 'member', p.id, label(p), { from, to: role })
      return send(res, 200, p)
    }
    if (path === '/rest/v1/rpc/find_orphaned_training_files') return isAdmin(uid) ? send(res, 200, []) : rls(res, 'Only administrators can do this.')
    if (path === '/rest/v1/rpc/delete_category') {
      if (!isAdmin(uid)) return rls(res, 'Only administrators can delete categories.')
      const cat = state.categories.find((c) => c.id === body.p_category)
      if (!cat) return send(res, 400, { code: 'P0001', message: 'Category not found.' })
      if (body.p_move_to === body.p_category) return send(res, 400, { code: 'P0001', message: 'Choose a different category to move resources into.' })
      let moved = 0
      for (const r of state.resources.filter((x) => x.category_id === cat.id)) {
        const before = { ...r }
        r.category_id = body.p_move_to ?? null
        r.updated_at = now()
        auditResource(uid, before, r)
        moved++
      }
      state.categories = state.categories.filter((c) => c !== cat)
      log(uid, 'category_deleted', 'category', cat.id, cat.name, { resources_moved_to: body.p_move_to ?? 'uncategorized' })
      return send(res, 200, moved)
    }

    // ---------------- REST
    const table = path.startsWith('/rest/v1/') ? path.slice(9) : null
    if (!table) return send(res, 404, { message: `fake: ${req.method} ${path}` })
    if (!uid) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' })

    if (table === 'profiles') {
      let rows = [...state.profiles.values()]
      if (!isAdmin(uid)) rows = rows.filter((r) => r.id === uid)
      if (req.method === 'PATCH') {
        // protect_profile_fields: browser sessions can never change role / status / email
        if (['role', 'status', 'email'].some((f) => f in body)) return send(res, 403, { code: '42501', message: 'You are not allowed to change this profile field.' })
        if (!isActive(uid)) return respond(req, res, [])
        rows = applyFilters(url.searchParams, rows)
        rows.forEach((r) => Object.assign(r, body, { updated_at: now() }))
        return respond(req, res, rows)
      }
      return respondList(req, res, url, applyFilters(url.searchParams, rows))
    }
    if (table === 'categories') {
      if (req.method === 'POST') {
        if (!isAdmin(uid)) return rls(res)
        if (state.categories.some((c) => c.name.toLowerCase() === body.name.toLowerCase())) return send(res, 409, { code: '23505', message: 'duplicate key' })
        const c = { id: randomUUID(), name: body.name, slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), description: body.description ?? null, icon: null, color: null, is_visible: body.is_visible ?? true, created_at: now(), updated_at: now() }
        state.categories.push(c)
        log(uid, 'category_created', 'category', c.id, c.name)
        return respond(req, res, [c], 201)
      }
      if (req.method === 'PATCH') {
        if (!isAdmin(uid)) return respond(req, res, [])
        const rows = applyFilters(url.searchParams, state.categories)
        for (const c of rows) {
          const fields = []
          if (body.name !== undefined && body.name !== c.name) { fields.push('name'); c.name = body.name; c.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
          if (body.description !== undefined && body.description !== c.description) { fields.push('description'); c.description = body.description }
          if (body.is_visible !== undefined && body.is_visible !== c.is_visible) { fields.push(body.is_visible ? 'shown' : 'hidden'); c.is_visible = body.is_visible }
          c.updated_at = now()
          if (fields.length) log(uid, 'category_updated', 'category', c.id, c.name, { fields })
        }
        return respond(req, res, rows)
      }
      if (!isActive(uid)) return send(res, 200, [])
      const cats = isAdmin(uid) ? state.categories : state.categories.filter((c) => c.is_visible)
      const pubRes = visibleResources(uid).filter((r) => r.status === 'published')
      return respond(req, res, applyFilters(url.searchParams, cats).map((c) => ({ ...c, training_resources: [{ count: pubRes.filter((r) => r.category_id === c.id).length }] })))
    }
    if (table === 'training_resources') {
      if (req.method === 'POST') {
        if (!isAdmin(uid)) return rls(res)
        const r = { description: null, category_id: null, thumbnail_path: null, file_size: null, duration_seconds: null, page_count: null, ...body, uploaded_by: uid, created_at: now(), updated_at: now() }
        state.resources.push(r)
        auditResource(uid, null, r)
        return respond(req, res, [shapeResource(r, uid)], 201)
      }
      let rows = applyFilters(url.searchParams, visibleResources(uid))
      if (req.method === 'PATCH') {
        if (!isAdmin(uid)) return respond(req, res, [])
        for (const r of rows) { const before = { ...r }; Object.assign(r, body, { updated_at: now() }); auditResource(uid, before, r) }
      }
      if (req.method === 'DELETE') {
        if (!isAdmin(uid)) return respond(req, res, [])
        for (const r of rows) auditResource(uid, r, null)
        state.resources = state.resources.filter((r) => !rows.includes(r))
      }
      return respondList(req, res, url, Object.assign(rows.map((r) => shapeResource(r, uid)), { total: rows.total }))
    }
    if (table === 'announcements') {
      const shapeA = (a) => ({ ...a, author: pub(state.profiles.get(a.created_by)) })
      const lifecycle = (a, before) => {
        a.updated_at = now()
        if (a.status === 'published' && (!before || before.status !== 'published' || before.publish_at !== a.publish_at)) a.published_at = a.publish_at ?? now()
      }
      if (req.method === 'POST') {
        if (!isAdmin(uid)) return rls(res)
        const a = { id: randomUUID(), image_path: null, publish_at: null, published_at: null, status: 'draft', ...body, created_by: uid, created_at: stamp() }
        lifecycle(a)
        state.announcements.push(a)
        log(uid, 'announcement_created', 'announcement', a.id, a.title, { status: a.status, scheduled_for: a.publish_at })
        return respond(req, res, [shapeA(a)], 201)
      }
      if (req.method === 'PATCH' || req.method === 'DELETE') {
        if (!isAdmin(uid)) return respond(req, res, [])
        const rows = applyFilters(url.searchParams, state.announcements)
        for (const a of rows) {
          if (req.method === 'DELETE') { log(uid, 'announcement_deleted', 'announcement', a.id, a.title); continue }
          const before = { ...a }
          Object.assign(a, body)
          lifecycle(a, before)
          if (before.status !== a.status) log(uid, a.status === 'published' ? 'announcement_published' : a.status === 'archived' ? 'announcement_archived' : 'announcement_unpublished', 'announcement', a.id, a.title)
          else if (['title', 'content', 'image_path', 'publish_at'].some((f) => before[f] !== a[f])) log(uid, 'announcement_updated', 'announcement', a.id, a.title)
        }
        if (req.method === 'DELETE') state.announcements = state.announcements.filter((a) => !rows.includes(a))
        return respond(req, res, rows.map(shapeA))
      }
      const rows = isAdmin(uid) ? state.announcements : isActive(uid) ? state.announcements.filter(liveAnnouncement) : []
      return respond(req, res, applyFilters(url.searchParams, rows).map(shapeA))
    }
    if (table === 'learning_progress' || table === 'favorites') {
      const store = table === 'learning_progress' ? 'progress' : 'favorites'
      if (req.method === 'POST') {
        if (!isActive(uid) || body.user_id !== uid) return rls(res)
        const existing = state[store].find((p) => p.user_id === uid && p.resource_id === body.resource_id)
        const defaults = store === 'progress' ? { status: 'in_progress', progress_percent: 0, last_position_seconds: 0, watched_seconds: 0, completed_at: null } : {}
        const row = existing ? Object.assign(existing, body, { updated_at: now() }) : { id: randomUUID(), ...defaults, ...body, created_at: now(), updated_at: now() }
        if (!existing) state[store].push(row)
        return respond(req, res, [row], 201)
      }
      if (req.method === 'DELETE') { state[store] = state[store].filter((p) => !(p.user_id === uid && url.searchParams.get('id') === `eq.${p.id}`)); return send(res, 204, undefined) }
      if (req.method === 'PATCH') {
        if (!isActive(uid)) return respond(req, res, [])
        const rows = applyFilters(url.searchParams, state[store].filter((p) => p.user_id === uid))
        rows.forEach((r) => Object.assign(r, body, { updated_at: now() }))
        return respond(req, res, rows)
      }
      if (!isActive(uid)) return send(res, 200, [])
      const rows = applyFilters(url.searchParams, state[store].filter((p) => p.user_id === uid || isAdmin(uid)))
      const withResource = (url.searchParams.get('select') ?? '').includes('resource:')
      return respond(req, res, rows.map((p) => {
        const r = state.resources.find((x) => x.id === p.resource_id)
        return withResource ? { ...p, resource: r && visibleResources(uid).includes(r) ? shapeResource(r, uid) : null } : p
      }))
    }
    if (table === 'activity_logs') {
      if (req.method === 'POST') {
        const member = ['viewed', 'watched', 'downloaded', 'completed', 'favorited'] // 'signed_in' is server-only
        if (!isActive(uid) || !member.includes(body.activity_type) || body.target_type || body.details) return rls(res)
        log(uid, body.activity_type, null, null, null, null, body.resource_id ?? null)
        return send(res, 201, undefined)
      }
      if (req.method === 'PATCH' || req.method === 'DELETE') return send(res, 403, { code: '42501', message: 'permission denied for table activity_logs' })
      let rows = isAdmin(uid) ? state.activity : state.activity.filter((a) => a.user_id === uid && !a.target_type)
      rows = applyFilters(url.searchParams, rows)
      const shaped = rows.map((a) => ({ ...a, actor: pub(state.profiles.get(a.user_id)), resource: a.resource_id ? { title: state.resources.find((r) => r.id === a.resource_id)?.title } : null }))
      shaped.total = rows.total
      return respondList(req, res, url, shaped)
    }
    send(res, 200, [])
  })
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)))
}
