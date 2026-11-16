// LAVA portal part of the fake Supabase: instead of imitating the rules, the
// lava_* tables and functions run in a real in-memory Postgres with the real
// migrations (supabase/tests/pglite-supabase.mjs). Every request executes as
// the signed-in user (role `authenticated`, auth.uid() = caller), so the
// browser tests exercise the actual RLS policies and SECURITY DEFINER checks.
// Profiles are mirrored from the fake's in-memory state before each request.
import { supabaseLikeDb } from '../../supabase/tests/pglite-supabase.mjs'

const TABLES = new Set(['lava_content', 'lava_positions', 'lava_agreements', 'lava_courses', 'lava_lessons', 'lava_lesson_progress', 'lava_lesson_materials', 'lava_assessments', 'lava_questions', 'lava_attempts', 'lava_simulator_requests'])
const RPCS = new Set(['lava_submit_agreement', 'lava_get_assessment', 'lava_submit_attempt', 'lava_request_simulator_access', 'lava_decide_simulator_request'])
const IDENT = /^[a-z_][a-z0-9_]*$/
const UUID = /^[0-9a-f-]{36}$/i

let dbPromise = null
let queue = Promise.resolve()
const synced = new Set()

/** Runs fn with exclusive use of the single PGlite connection. */
function exclusive(fn) {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

const syncedResources = new Map()
/** Training Library rows live in the fake's memory; LAVA lesson materials reference them by id. */
async function mirrorResources(db, state) {
  for (const r of state.resources) {
    const sig = `${r.status}|${r.audience ?? 'library'}|${r.storage_path}`
    if (syncedResources.get(r.id) === sig) continue
    await db.query(
      `insert into public.training_resources (id, title, resource_type, storage_path, status, audience)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set status = excluded.status, audience = excluded.audience, storage_path = excluded.storage_path`,
      [r.id, r.title, r.resource_type, r.storage_path, r.status, r.audience ?? 'library'],
    )
    syncedResources.set(r.id, sig)
  }
}

async function mirrorProfiles(db, state) {
  for (const p of state.profiles.values()) {
    if (!synced.has(p.id)) {
      await db.query(`insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing`, [p.id, p.email])
      synced.add(p.id)
    }
    await db.query(`update public.profiles set role = $2, status = $3, first_name = $4, last_name = $5 where id = $1`, [p.id, p.role, p.status, p.first_name ?? '', p.last_name ?? ''])
  }
}

function where(params, args, prefix = '') {
  const conds = []
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
    if (!IDENT.test(k)) throw Object.assign(new Error(`fake: bad column ${k}`), { code: '42703' })
    const i = v.indexOf('.')
    const op = v.slice(0, i)
    const val = v.slice(i + 1)
    if (op === 'eq') { args.push(val); conds.push(`${prefix}"${k}"::text = $${args.length}`) }
    else if (op === 'neq') { args.push(val); conds.push(`${prefix}"${k}"::text <> $${args.length}`) }
    else if (op === 'in') { args.push(val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/"/g, ''))); conds.push(`${prefix}"${k}"::text = any($${args.length}::text[])`) }
    else if (op === 'is' && val === 'null') conds.push(`${prefix}"${k}" is null`)
    else throw Object.assign(new Error(`fake: unsupported filter ${k}=${v}`), { code: 'PGRST100' })
  }
  return conds.length ? ` where ${conds.join(' and ')}` : ''
}

function columns(select, prefix = '') {
  if (!select || select === '*') return `${prefix}*`
  const cols = select.split(',').map((c) => c.trim())
  if (!cols.every((c) => IDENT.test(c))) throw Object.assign(new Error(`fake: embedded selects are not supported here (${select})`), { code: 'PGRST100' })
  return cols.map((c) => `${prefix}"${c}"`).join(', ')
}

function statusFor(code) {
  if (code === '42501') return 403
  if (code === '23505' || code === '23503') return 409
  return 400
}

async function execute(db, { req, url, path, body, uid }) {
  const args = []
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = path.slice('/rest/v1/rpc/'.length)
    const entries = Object.entries(body ?? {})
    if (!entries.every(([k]) => IDENT.test(k))) throw new Error('fake: bad argument')
    const list = entries.map(([k, v]) => { args.push(v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v)); return `${k} => $${args.length}` })
    const { rows } = await db.query(`select public.${fn}(${list.join(', ')}) as r`, args)
    return { status: 200, payload: rows[0].r }
  }
  const table = path.slice('/rest/v1/'.length)
  const params = url.searchParams
  const wantRows = (req.headers.prefer ?? '').includes('return=representation')
  const returning = wantRows ? ` returning ${columns(params.get('select'))}` : ''
  if (req.method === 'GET' || req.method === 'HEAD') {
    let sql = `select ${columns(params.get('select'))} from public.${table}${where(params, args)}`
    const order = params.get('order')
    if (order) {
      sql += ' order by ' + order.split(',').map((o) => {
        const [col, dir = 'asc', nulls] = o.split('.')
        if (!IDENT.test(col)) throw new Error('fake: bad order')
        return `"${col}" ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : ''}`
      }).join(', ')
    }
    if (params.get('limit')) sql += ` limit ${Number(params.get('limit'))}`
    if (params.get('offset')) sql += ` offset ${Number(params.get('offset'))}`
    const { rows } = await db.query(sql, args)
    return { status: 200, payload: rows, list: true }
  }
  if (req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body]
    const cols = Object.keys(rows[0] ?? {})
    if (!cols.every((c) => IDENT.test(c))) throw new Error('fake: bad column')
    const quoted = cols.map((c) => `"${c}"`).join(', ')
    args.push(JSON.stringify(rows))
    const { rows: out } = await db.query(`insert into public.${table} (${quoted}) select ${quoted} from json_populate_recordset(null::public.${table}, $1::json)${returning}`, args)
    return { status: 201, payload: returning ? out : undefined }
  }
  if (req.method === 'PATCH') {
    const cols = Object.keys(body ?? {})
    if (!cols.length || !cols.every((c) => IDENT.test(c))) throw new Error('fake: bad column')
    args.push(JSON.stringify(body))
    const set = cols.map((c) => `"${c}" = r."${c}"`).join(', ')
    const t = `public.${table}.`
    const filter = where(params, args, t).replace(/^ where /, ' and ')
    const ret = wantRows ? ` returning ${columns(params.get('select'), t)}` : ''
    const { rows } = await db.query(`update public.${table} set ${set} from json_populate_record(null::public.${table}, $1::json) r where true${filter}${ret}`, args)
    return { status: 200, payload: wantRows ? rows : undefined }
  }
  if (req.method === 'DELETE') {
    await db.query(`delete from public.${table}${where(params, args)}`, args)
    return { status: 204 }
  }
  throw new Error(`fake: ${req.method} not supported`)
}

/**
 * Handles /rest/v1/lava_* and /rest/v1/rpc/lava_*. Returns false for anything else.
 */
export async function handleLava({ req, res, url, path, body, uid, state, send }) {
  const isRpc = path.startsWith('/rest/v1/rpc/') && RPCS.has(path.slice(13))
  const isTable = TABLES.has(path.slice(9))
  if (!isRpc && !isTable) return false
  if (!uid || !UUID.test(uid)) { send(res, 401, { code: 'PGRST301', message: 'JWT expired' }); return true }
  dbPromise ??= supabaseLikeDb()
  const db = await dbPromise
  try {
    const result = await exclusive(async () => {
      await mirrorProfiles(db, state)
      await mirrorResources(db, state)
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
      try { return await execute(db, { req, url, path, body, uid }) } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
    })
    if (result.status === 204 || result.payload === undefined) send(res, result.status === 204 ? 204 : result.status, undefined)
    else if (result.list && (req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      if (result.payload.length === 1) send(res, 200, result.payload[0])
      else send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
    } else send(res, result.status, result.payload)
  } catch (e) {
    send(res, statusFor(e.code), { code: e.code ?? 'XX000', message: e.message, details: null, hint: null })
  }
  return true
}

/** Direct SQL access for test setup/assertions (runs as the database owner). */
export async function lavaSql(sql, params) {
  dbPromise ??= supabaseLikeDb()
  const db = await dbPromise
  return exclusive(async () => (await db.query(sql, params)).rows)
}
