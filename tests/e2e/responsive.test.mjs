// Responsive audit of the production build at 1920 / 1366 / 768 / 390 / 320 px.
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { addUser, start, state } from './fake-supabase.mjs'
import { startHostingSim } from './hosting-sim.mjs'

const APP = process.argv[2] ?? new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const API = 'http://127.0.0.1:54394'
const BASE = 'http://127.0.0.1:5192'
const SHOTS = new URL('./.out/shots/', import.meta.url).pathname
mkdirSync(SHOTS, { recursive: true })

function makePdf(text) {
  const stream = `BT /F1 36 Tf 72 700 Td (${text}) Tj ET`
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

const DIST = new URL('./.out/dist-prod', import.meta.url).pathname
if (!existsSync(DIST)) {
  const b = spawnSync(`${APP}/node_modules/.bin/vite`, ['build', '--outDir', DIST, '--emptyOutDir'], { cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: API, VITE_SUPABASE_ANON_KEY: 'public-anon-test-key' }, encoding: 'utf8' })
  if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1) }
}
await start(54394)
await startHostingSim({ dist: new URL('./.out/dist-prod', import.meta.url).pathname, config: `${APP}/vercel.json`, port: 5192, apiOrigin: API })
addUser('admin@academy.test', 'Admin123!', { role: 'admin', first: 'Olive', last: 'Owner-Fitzgerald' })
const memberId = addUser('maria.santos.with.a.long.email@academy-training.test', 'Member123!', { first: 'Maria Isabella', last: 'Santos de la Cruz', phone: '+63 917 555 0101', lastSignIn: new Date().toISOString() })
for (let i = 0; i < 8; i++) addUser(`trainee${i}@academy.test`, null, { first: 'Trainee', last: `Number ${i}` })
const cat = { id: randomUUID(), name: 'Email & Calendar Management for Executives', slug: 'email', description: 'A deliberately long category description to test wrapping on small screens.', icon: null, color: null, is_visible: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
state.categories.push(cat)
const ids = []
for (const [title, type] of [['A Very Long Training Resource Title That Should Wrap Nicely On Small Screens', 'PDF'], ['Inbox Zero', 'PDF'], ['Calendar Basics', 'PDF']]) {
  const id = randomUUID(); const path = `${id}/doc.pdf`; const data = makePdf(title)
  state.objects.set(`training-pdfs/${path}`, { bucket: 'training-pdfs', name: path, data, type: 'application/pdf', createdAt: Date.now() })
  state.resources.push({ id, title, description: 'Description '.repeat(12), category_id: cat.id, resource_type: type, storage_path: path, thumbnail_path: null, file_size: data.length, duration_seconds: null, page_count: 1, status: 'published', uploaded_by: [...state.profiles.values()][0].id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  ids.push(id)
}
state.progress.push({ id: randomUUID(), user_id: memberId, resource_id: ids[1], status: 'in_progress', progress_percent: 40, last_position_seconds: 0, watched_seconds: 0, completed_at: null, updated_at: new Date().toISOString() })
state.announcements.push({ id: randomUUID(), title: 'Welcome to the new cohort — orientation details inside', content: 'Line one.\nLine two with a long sentence that needs to wrap on narrow phones without overflowing.', status: 'published', image_path: null, publish_at: null, published_at: new Date().toISOString(), created_by: [...state.profiles.values()][0].id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })

const WIDTHS = [1920, 1366, 768, 390, 320]
const memberPages = ['/dashboard', '/library', `/library/${ids[0]}`, '/my-learning', '/favorites', '/profile', '/announcements']
const adminPages = ['/admin', '/admin/members', `/admin/members/${memberId}`, '/admin/resources', '/admin/upload', '/admin/categories', '/admin/announcements', '/admin/activity']
const dialogs = [
  ['/admin/members', 'Add member', /^Add member$/],
  ['/admin/announcements', 'New announcement', /^New announcement$/],
  ['/admin/categories', 'New category', /^New category$/],
  ['/admin/resources', 'Replace file', /^Replace file of/],
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const problems = []
let checks = 0
let scrolled = 0

async function audit(page, label, width) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await new Promise((r) => setTimeout(r, 400))
  const r = await page.evaluate(() => {
    const vw = window.innerWidth
    const out = { overflow: document.documentElement.scrollWidth > vw + 1, offscreen: [], tiny: [] }
    for (const el of document.querySelectorAll('button, a, input, select, textarea')) {
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none' || el.closest('[aria-hidden="true"], .sr-only, .invisible') || el.classList.contains('sr-only')) continue
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height) continue
      // ignore elements inside horizontally scrollable strips (category chips, tab bars)
      let p = el.parentElement, scroller = false
      while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') { scroller = true; break } p = p.parentElement }
      if (!scroller && (b.right > vw + 1 || b.left < -1)) out.offscreen.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40))
      if ((el.tagName === 'BUTTON' || el.tagName === 'A') && (b.width < 24 || b.height < 24) && !el.closest('nav[aria-label="Pagination"]')) out.tiny.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40))
    }
    return out
  })
  checks++
  if (r.overflow) problems.push(`${width}px ${label}: horizontal scroll`)
  if (r.offscreen.length) problems.push(`${width}px ${label}: off-screen controls → ${[...new Set(r.offscreen)].slice(0, 4).join(' | ')}`)
  if (r.tiny.length) problems.push(`${width}px ${label}: tap targets < 24px → ${[...new Set(r.tiny)].slice(0, 4).join(' | ')}`)
}
async function signIn(page, email, pw) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email address').fill(email); await page.locator('input[type=password]').fill(pw)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
}

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 800 : 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`); await audit(page, '/login', width)
  if (width === 320) await page.screenshot({ path: `${SHOTS}320-login.png`, fullPage: true })
  await page.goto(`${BASE}/forgot-password`); await audit(page, '/forgot-password', width)
  await page.goto(`${BASE}/signup`); await audit(page, '/signup', width)

  await signIn(page, 'maria.santos.with.a.long.email@academy-training.test', 'Member123!')
  for (const p of memberPages) {
    await page.goto(`${BASE}${p}`); await page.locator('main').waitFor()
    if (p.startsWith('/library/')) await page.getByText('Page 1 of 1').first().waitFor({ timeout: 15000 }).catch(() => {})
    await audit(page, p, width)
    if (width === 320 && ['/dashboard', '/library', `/library/${ids[0]}`].includes(p)) await page.screenshot({ path: `${SHOTS}320-${p.split('/')[1] || 'root'}${p.includes(ids[0]) ? '-detail' : ''}.png`, fullPage: true })
  }
  await ctx.clearCookies(); await page.evaluate(() => localStorage.clear())
  await signIn(page, 'admin@academy.test', 'Admin123!')
  for (const p of adminPages) {
    await page.goto(`${BASE}${p}`); await page.locator('main').waitFor()
    await audit(page, p, width)
    if (width === 320 && ['/admin', '/admin/members', '/admin/upload'].includes(p)) await page.screenshot({ path: `${SHOTS}320-${p.replaceAll('/', '_')}.png`, fullPage: true })
  }
  for (const [p, label, name] of dialogs) {
    await page.goto(`${BASE}${p}`); await page.locator('main').waitFor()
    await page.getByRole('button', { name }).first().click()
    await page.getByRole('dialog').waitFor()
    await audit(page, `${p} [${label} dialog]`, width)
    // Dialog buttons must be reachable on short phone screens (vertical check).
    for (const h of [640, 560]) {
      await page.setViewportSize({ width, height: h })
      await new Promise((r) => setTimeout(r, 200))
      const unreachable = await page.evaluate(() => {
        const d = document.querySelector('[role=dialog][aria-labelledby]'); const vh = innerHeight // the Modal (not the nav drawer)
        const body = d.querySelector('.overflow-y-auto')
        if (body && body.scrollHeight > body.clientHeight + 1) window.__scrolledDialogs = (window.__scrolledDialogs ?? 0) + 1
        return [...d.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.height && (r.bottom > vh + 1 || r.top < -1) }).map((b) => b.textContent.trim() || b.getAttribute('aria-label'))
      })
      checks++
      if (unreachable.length) problems.push(`${width}x${h} ${p} [${label} dialog]: buttons off-screen vertically → ${unreachable.slice(0, 4).join(' | ')}`)
    }
    scrolled += await page.evaluate(() => { const n = window.__scrolledDialogs ?? 0; window.__scrolledDialogs = 0; return n })
    await page.setViewportSize({ width, height: width < 800 ? 800 : 900 })
    if (width === 320 && label === 'Add member') await page.screenshot({ path: `${SHOTS}320-dialog-add-member.png` })
    await page.keyboard.press('Escape')
  }
  if (width < 1024) {
    await page.goto(`${BASE}/admin`); await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('dialog', { name: 'Navigation' }).waitFor(); await audit(page, '/admin [mobile drawer open]', width)
    if (width === 320) await page.screenshot({ path: `${SHOTS}320-drawer.png` })
  }
  await ctx.close()
}
await browser.close()
console.log(`${checks} page/width checks across ${WIDTHS.join(', ')} px; dialog bodies that needed internal scrolling: ${scrolled}`)
console.log(problems.length ? `PROBLEMS (${problems.length}):\n  ${problems.join('\n  ')}` : 'no layout problems found')
process.exit(problems.length ? 1 : 0)
