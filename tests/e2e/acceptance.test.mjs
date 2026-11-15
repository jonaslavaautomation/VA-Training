// Production acceptance test — run with `npm run test:e2e` (needs Google Chrome installed).
// Simulated Supabase backend; nothing touches your real project.
// PRODUCTION build (vite build) served like Vercel (vercel.json headers + CSP
// + SPA rewrite) against the simulated Supabase backend, in headless Chrome.
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { addUser, start, state } from './fake-supabase.mjs'
import { startHostingSim } from './hosting-sim.mjs'

const APP = process.argv[2] ?? new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const API_PORT = 54394
const WEB_PORT = 5194
const API = `http://127.0.0.1:${API_PORT}`
const BASE = `http://127.0.0.1:${WEB_PORT}`
const DIST = new URL('./.out/dist-prod', import.meta.url).pathname

// 1) Production build pointed at the fake backend
const build = spawnSync(`${APP}/node_modules/.bin/vite`, ['build', '--outDir', DIST, '--emptyOutDir'], {
  cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: API, VITE_SUPABASE_ANON_KEY: 'public-anon-test-key', NODE_ENV: 'production' }, encoding: 'utf8',
})
if (build.status !== 0) { console.error(build.stderr || build.stdout); process.exit(1) }
console.log('production build ok')

function makePdf(text) {
  const stream = `BT /F1 36 Tf 72 700 Td (${text}) Tj ET`
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

await start(API_PORT)
await startHostingSim({ dist: DIST, config: `${APP}/vercel.json`, port: WEB_PORT, apiOrigin: API })
const adminId = addUser('admin@academy.test', 'Admin123!', { role: 'admin', first: 'Olive', last: 'Owner', lastSignIn: new Date().toISOString() })
const cat = { id: randomUUID(), name: 'Getting Started', slug: 'getting-started', description: null, icon: null, color: null, is_visible: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
state.categories.push(cat)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const cspViolations = []
const errors = []
async function step(id, name, fn) {
  try { await fn(); results.push({ id, name, result: 'PASS' }); console.log(`  PASS  ${id}. ${name}`) } catch (e) { results.push({ id, name, result: 'FAIL', error: e.message.split('\n')[0].slice(0, 300) }); console.log(`  FAIL  ${id}. ${name} → ${e.message.split('\n')[0].slice(0, 300)}`) }
}
const text = (page, t, timeout = 12000) => page.getByText(t, { exact: false }).first().waitFor({ timeout })
const url = (page, p) => page.waitForURL((u) => new URL(u).pathname === p, { timeout: 12000 })
const assert = (c, m) => { if (!c) throw new Error(m) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport: viewport ?? { width: 1366, height: 900 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) cspViolations.push(m.text())
    else if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`Refused to load (CSP): ${e.violatedDirective} ${e.blockedURI}`)))
  return page
}
async function login(page, email, pw) {
  await page.goto('about:blank'); await page.goto(`${BASE}/login`)
  await page.getByLabel('Email address').fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.getByRole('button', { name: 'Sign in' }).click()
}
async function logout(page) {
  await page.locator('aside').first().getByRole('button', { name: 'Log out' }).click()
  await url(page, '/login')
}

try {
  // Real 12-second video recorded in Chrome, plus a PDF, uploaded by the admin through the UI
  const rec = await (await newPage()).evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180
    const ctx = c.getContext('2d')
    const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t))
    const r = new MediaRecorder(c.captureStream(30), { mimeType: type }); const chunks = []
    r.ondataavailable = (e) => chunks.push(e.data)
    let f = 0; const iv = setInterval(() => { ctx.fillStyle = `hsl(${(f * 9) % 360},70%,50%)`; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = '#fff'; ctx.font = '48px sans-serif'; ctx.fillText(String(f++), 30, 110) }, 33)
    r.start(250); await new Promise((res) => setTimeout(res, 12200)); await new Promise((res) => { r.onstop = res; r.stop() }); clearInterval(iv)
    const bytes = new Uint8Array(await new Blob(chunks, { type }).arrayBuffer()); let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return { b64: btoa(bin), type: type.split(';')[0] }
  })
  const videoFile = { name: `orientation.${rec.type === 'video/mp4' ? 'mp4' : 'webm'}`, mimeType: rec.type, buffer: Buffer.from(rec.b64, 'base64') }

  const admin = await newPage()
  const member = await newPage()
  let memberId

  async function adminUpload(file, title, publish = true) {
    await admin.goto(`${BASE}/admin/upload`)
    await admin.getByLabel('Choose file to upload').setInputFiles(file)
    await admin.getByLabel('Title').fill(title)
    await admin.locator('#category').selectOption({ label: 'Getting Started' })
    if (publish) await admin.getByLabel(/Published/).check()
    await admin.getByRole('button', { name: /^Upload$/ }).click()
    await text(admin, 'Upload complete', 40000)
  }

  console.log('\nproduction acceptance workflow')
  await step(1, 'Admin logs in', async () => { await login(admin, 'admin@academy.test', 'Admin123!'); await url(admin, '/admin'); await text(admin, 'Admin dashboard') })
  await step('1b', 'Admin uploads starter content (video + PDF) through the Upload Center', async () => {
    await adminUpload(videoFile, 'Orientation Video')
    await adminUpload({ name: 'handbook.pdf', mimeType: 'application/pdf', buffer: makePdf('VA Handbook') }, 'VA Handbook')
    assert(state.resources.filter((r) => r.status === 'published').length === 2, 'uploads missing')
  })
  await step(2, 'Admin creates a new member account', async () => {
    await admin.goto(`${BASE}/admin/members?new=1`)
    await admin.getByLabel('First name').fill('Maria'); await admin.getByLabel('Last name').fill('Santos')
    await admin.getByLabel('Email address').fill('maria@academy.test')
    await admin.getByRole('button', { name: 'Create & send invite' }).click()
    await text(admin, 'An invitation was sent to maria@academy.test')
    memberId = [...state.profiles.values()].find((p) => p.email === 'maria@academy.test')?.id
    assert(memberId, 'member not created')
  })
  await step(3, 'Member receives an invitation / password-setup link (simulated email) and sets a password', async () => {
    assert(state.emails.includes('invite:maria@academy.test'), 'no invitation recorded')
    await member.goto(`${BASE}/reset-password?token_hash=invite-${memberId}&type=invite`)
    await text(member, 'Set your password')
    assert(!new URL(member.url()).search, 'token left in the address bar')
    await member.getByLabel('New password').fill('Welcome123')
    await member.getByLabel('Confirm password').fill('Welcome123')
    await member.getByRole('button', { name: 'Set password & continue' }).click()
    await url(member, '/dashboard')
    await logout(member)
  })
  await step(4, 'Member logs in', async () => { await login(member, 'maria@academy.test', 'Welcome123'); await url(member, '/dashboard'); await text(member, 'Welcome back, Maria') })
  await step(5, 'Member opens the Training Library', async () => {
    await member.goto(`${BASE}/library`); await text(member, 'Showing 2 of 2 resources'); await text(member, 'Orientation Video')
  })
  const videoId = () => state.resources.find((r) => r.title === 'Orientation Video').id
  await step(6, 'Member watches a training video', async () => {
    await member.locator(`a[href="/library/${videoId()}"]`).first().click()
    await member.getByRole('button', { name: 'Play video' }).click({ timeout: 15000 })
    await member.waitForFunction(() => document.querySelector('video')?.currentTime > 6.5, null, { timeout: 20000 })
    await member.getByRole('button', { name: 'Pause', exact: true }).click()
    await sleep(800)
    const p = state.progress.find((x) => x.user_id === memberId && x.resource_id === videoId())
    assert(p?.last_position_seconds >= 6, `position not saved: ${JSON.stringify(p)}`)
  })
  await step(7, 'Member leaves the video, logs out and logs back in', async () => {
    await member.goto(`${BASE}/dashboard`)
    await logout(member)
    await login(member, 'maria@academy.test', 'Welcome123'); await url(member, '/dashboard')
    await text(member, 'Continue learning'); await text(member, 'Orientation Video')
  })
  await step(8, 'Member resumes the video where they stopped', async () => {
    await member.goto(`${BASE}/library/${videoId()}`)
    await member.getByTestId('resume-note').waitFor({ timeout: 12000 })
    await member.waitForFunction(() => document.querySelector('video')?.readyState >= 1 && document.querySelector('video').currentTime >= 5.5, null, { timeout: 12000 })
  })
  const pdfId = () => state.resources.find((r) => r.title === 'VA Handbook').id
  await step(9, 'Member opens a PDF (rendered inside the portal)', async () => {
    await member.goto(`${BASE}/library/${pdfId()}`)
    await text(member, 'Page 1 of 1', 20000)
    await member.waitForFunction(() => { const c = document.querySelector('canvas[aria-label="Page 1"]'); return c && c.width > 0 }, null, { timeout: 15000 })
  })
  await step(10, 'Member marks the PDF completed', async () => {
    await member.getByRole('button', { name: 'Mark as complete' }).click()
    await text(member, 'Marked as complete.')
    assert(state.progress.find((x) => x.user_id === memberId && x.resource_id === pdfId())?.status === 'completed', 'not completed')
  })
  await step(11, 'Member adds a resource to Favorites', async () => {
    await member.getByRole('button', { name: 'Add to favorites' }).click()
    await member.getByRole('button', { name: 'Remove from favorites' }).waitFor()
    await sleep(300)
    assert(state.favorites.some((f) => f.user_id === memberId && f.resource_id === pdfId()), 'favorite not saved')
  })
  await step(12, 'Admin uploads another training resource (as draft)', async () => {
    await adminUpload({ name: 'calendar.pdf', mimeType: 'application/pdf', buffer: makePdf('Calendar Guide') }, 'Calendar Guide', false)
    assert(state.resources.find((r) => r.title === 'Calendar Guide')?.status === 'draft', 'draft missing')
    await member.goto(`${BASE}/library`); await text(member, 'Showing 2 of 2 resources')
    assert(!(await member.getByText('Calendar Guide').count()), 'draft visible to member')
  })
  await step(13, 'Admin publishes the resource', async () => {
    await admin.goto(`${BASE}/admin/resources`)
    await admin.getByRole('button', { name: 'Publish Calendar Guide' }).first().click()
    await text(admin, 'is now visible to members')
  })
  await step(14, 'Member can access the newly published resource', async () => {
    await member.goto(`${BASE}/library`); await text(member, 'Calendar Guide')
    await member.getByText('Calendar Guide').first().click()
    await text(member, 'Page 1 of 1', 20000)
  })
  await step(15, 'Admin creates an announcement', async () => {
    await admin.goto(`${BASE}/admin/announcements?new=1`)
    await admin.getByRole('dialog').getByLabel('Title').fill('Welcome to the academy!')
    await admin.locator('#announcement-content').fill('Orientation starts Monday at 9am.')
    await admin.getByLabel(/Publish now/).check()
    await admin.getByRole('dialog').getByRole('button', { name: 'Publish' }).click()
    await text(admin, 'is live for members')
  })
  await step(16, 'Member sees the published announcement', async () => {
    await member.goto(`${BASE}/dashboard`); await text(member, 'Welcome to the academy!')
  })
  await step(17, 'Admin deactivates the member', async () => {
    await admin.goto(`${BASE}/admin/members`)
    await admin.getByLabel('Search members by name or email').fill('maria')
    await admin.getByRole('button', { name: 'Deactivate Maria Santos' }).first().click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click()
    await text(admin, 'has been deactivated')
  })
  await step(18, 'Deactivated member is denied access to protected training materials', async () => {
    await member.goto(`${BASE}/library/${pdfId()}`); await text(member, 'Account deactivated')
    const r = await member.evaluate(async (api) => {
      const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
      const tok = JSON.parse(localStorage.getItem(key)).access_token
      const res = await fetch(`${api}/rest/v1/training_resources?select=id`, { headers: { Authorization: `Bearer ${tok}`, apikey: 'k' } })
      return res.json()
    }, API)
    assert(Array.isArray(r) && r.length === 0, `API still returns resources: ${JSON.stringify(r)}`)
    await member.locator('button', { hasText: 'Sign out' }).click()
    await login(member, 'maria@academy.test', 'Welcome123')
    await text(member, 'This account has been deactivated')
  })
  await step(19, 'Admin reactivates the member', async () => {
    await admin.getByRole('button', { name: 'Reactivate Maria Santos' }).first().click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Reactivate' }).click()
    await text(admin, 'has been reactivated')
  })
  await step(20, 'Member logs in again and keeps previous learning records', async () => {
    await login(member, 'maria@academy.test', 'Welcome123'); await url(member, '/dashboard')
    await member.goto(`${BASE}/my-learning`)
    await text(member, 'Orientation Video') // still in progress
    await member.getByRole('tab', { name: /Completed/ }).click(); await text(member, 'VA Handbook')
    await member.goto(`${BASE}/favorites`); await text(member, 'VA Handbook')
  })

  console.log('\nproduction environment checks')
  await step('E1', 'Security headers + CSP are sent on pages and assets', async () => {
    const res = await fetch(`${BASE}/library`)
    for (const h of ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-robots-tag']) assert(res.headers.get(h), `missing ${h}`)
    const html = await res.text()
    const asset = html.match(/\/assets\/index-[\w-]+\.js/)[0]
    const a = await fetch(`${BASE}${asset}`)
    assert(a.headers.get('cache-control')?.includes('immutable'), 'assets not cached immutably')
  })
  await step('E2', 'Direct navigation / refresh on deep links works (SPA rewrite)', async () => {
    for (const p of [`/library/${pdfId()}`, '/my-learning', '/favorites', '/profile']) {
      await member.goto(`${BASE}${p}`); await member.locator('main').waitFor(); assert(new URL(member.url()).pathname === p, `landed on ${member.url()}`)
    }
    await admin.goto(`${BASE}/admin/members/${memberId}`); await text(admin, 'Maria Santos')
    await member.goto(`${BASE}/no-such-page`); await text(member, 'Page not found')
  })
  await step('E3', 'Logged-out visitor typing protected URLs is sent to login', async () => {
    const anon = await newPage()
    for (const p of ['/dashboard', '/admin', '/admin/members', `/library/${pdfId()}`]) { await anon.goto(`${BASE}${p}`); await url(anon, '/login') }
    await anon.context().close()
  })
  await step('E4', 'Forgot password → reset link → new password works', async () => {
    const p = await newPage()
    await p.goto(`${BASE}/forgot-password`)
    await p.getByLabel('Email address').fill('maria@academy.test')
    await p.getByRole('button', { name: 'Send reset link' }).click()
    await text(p, 'Check your inbox')
    assert(state.emails.includes('recovery:maria@academy.test'), 'no reset email recorded')
    await p.goto(`${BASE}/reset-password?token_hash=recovery-${memberId}&type=recovery`)
    await text(p, 'Choose a new password')
    await p.getByLabel('New password').fill('NewPass456')
    await p.getByLabel('Confirm password').fill('NewPass456')
    await p.getByRole('button', { name: 'Update password' }).click()
    await url(p, '/dashboard')
    await p.goto(`${BASE}/reset-password?token_hash=recovery-${memberId}&type=recovery`)
    await text(p, 'Link expired') // single use
    await p.context().close()
    const q = await newPage(); await login(q, 'maria@academy.test', 'NewPass456'); await url(q, '/dashboard'); await q.context().close()
  })
  await step('E5', 'Session persists across a full browser reload', async () => {
    await member.reload(); await member.locator('main').waitFor()
    await member.goto(`${BASE}/dashboard`); await text(member, 'Welcome back, Maria')
  })
  await step('E6', 'No Content-Security-Policy violations during the whole run (PDF.js worker, video, images, uploads)', async () => {
    assert(!cspViolations.length, cspViolations.slice(0, 3).join(' | '))
  })
  const relevant = errors.filter((e) => !/Failed to load resource|status of 4\d\d/.test(e))
  await step('E7', 'No unexpected console errors in the production build', async () => assert(!relevant.length, relevant.slice(0, 3).join(' | ')))
} finally {
  await browser.close()
  writeFileSync(new URL('./.out/acceptance-results.json', import.meta.url), JSON.stringify(results, null, 2))
  const pass = results.filter((r) => r.result === 'PASS').length
  console.log(`\n${pass} passed, ${results.length - pass} failed`)
  process.exit(results.length - pass ? 1 : 0)
}
