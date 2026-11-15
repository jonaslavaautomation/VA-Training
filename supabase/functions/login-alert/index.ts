// =====================================================================
// login-alert — emails the administrator when a MEMBER signs in.
//
// Called only by the database trigger `on_auth_user_signed_in`
// (migration 20261118100000_login_alerts.sql) through pg_net. Requests must
// carry the shared secret in `x-alert-secret`; browsers never call this.
//
// Secrets (npx supabase secrets set …):
//   LOGIN_ALERT_SECRET  same random value stored in Vault as 'login_alert_secret'
//   RESEND_API_KEY      API key from https://resend.com
//   ALERT_TO            who receives alerts, e.g. jonasrosauro122@gmail.com
//   ALERT_FROM          optional sender; default "VA Training Academy <onboarding@resend.dev>"
//                       (Resend's test sender can only email the Resend account owner —
//                        verify your own domain in Resend to send from it)
//   ALERT_TIMEZONE      optional IANA zone for the time shown, e.g. Asia/Manila (default UTC)
//   SITE_URL            already set for admin-members; used for the "View member" link
// =====================================================================

const SECRET = Deno.env.get('LOGIN_ALERT_SECRET') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ALERT_TO = Deno.env.get('ALERT_TO') ?? ''
const ALERT_FROM = Deno.env.get('ALERT_FROM') ?? 'VA Training Academy <onboarding@resend.dev>'
const TIMEZONE = Deno.env.get('ALERT_TIMEZONE') ?? 'UTC'
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')

type Alert = {
  user_id?: string
  email?: string
  first_name?: string
  last_name?: string
  signed_in_at?: string
  user_agent?: string | null
  ip?: string | null
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Constant-time comparison so the secret can't be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** "Chrome on Windows" from a user-agent string (best effort). */
export function describeDevice(ua?: string | null): string {
  if (!ua) return 'Unknown device'
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iPhone/iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux'
    : 'unknown system'
  return `${browser} on ${os}`
}

export function formatWhen(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  try {
    // (dateStyle/timeStyle can't be combined with timeZoneName, so list the parts explicitly)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: TIMEZONE, timeZoneName: 'short',
    }).format(d)
  } catch {
    return d.toISOString()
  }
}

export function buildEmail(a: Alert) {
  const name = [a.first_name, a.last_name].filter(Boolean).join(' ').trim() || a.email || 'A member'
  const email = a.email ?? 'unknown email'
  const when = formatWhen(a.signed_in_at)
  const device = describeDevice(a.user_agent)
  const link = SITE_URL && a.user_id ? `${SITE_URL}/admin/members/${a.user_id}` : ''
  const rows: [string, string][] = [['Member', `${name} (${email})`], ['When', when], ['Device', device]]
  if (a.ip) rows.push(['IP address', a.ip])

  const subject = `New sign-in — ${name}`.slice(0, 150)
  const text = [
    `${name} (${email}) signed in to VA Training Academy.`,
    '',
    ...rows.slice(1).map(([k, v]) => `${k}: ${v}`),
    ...(link ? ['', `View member: ${link}`] : []),
    '',
    'You receive this because you are the VA Training Academy administrator.',
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f2747">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0"><strong style="font-size:15px">VA Training Academy</strong><br><span style="font-size:13px;color:#64748b">New member sign-in</span></td></tr>
      <tr><td style="padding:20px 24px">
        <p style="margin:0 0 16px;font-size:15px"><strong>${escapeHtml(name)}</strong> signed in.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">
          ${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#64748b;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join('')}
        </table>
        ${link ? `<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f2747;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">View member</a></p>` : ''}
      </td></tr>
      <tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">You receive this because you are the VA Training Academy administrator. All sign-ins are also listed under Admin → Activity Logs.</td></tr>
    </table>
  </td></tr></table></body></html>`
  return { subject, text, html }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!SECRET || !safeEqual(req.headers.get('x-alert-secret') ?? '', SECRET)) return json(401, { error: 'Unauthorized' })
  if (!RESEND_API_KEY || !ALERT_TO) {
    console.error('login-alert: RESEND_API_KEY / ALERT_TO not configured')
    return json(500, { error: 'Alert email is not configured' })
  }

  let alert: Alert
  try {
    alert = await req.json()
  } catch {
    return json(400, { error: 'Invalid body' })
  }

  const { subject, text, html } = buildEmail(alert)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: ALERT_FROM, to: ALERT_TO.split(',').map((s) => s.trim()).filter(Boolean), subject, text, html }),
  })
  if (!res.ok) {
    console.error('login-alert: email provider error', res.status, await res.text().catch(() => ''))
    return json(502, { error: 'Email could not be sent' })
  }
  return json(200, { sent: true })
}

Deno.serve(handler)
