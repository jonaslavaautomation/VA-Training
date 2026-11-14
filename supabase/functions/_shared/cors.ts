// CORS is not an auth mechanism (every request is still JWT- and role-checked),
// but restricting origins keeps other websites from driving the API from a
// signed-in admin's browser. Set ALLOWED_ORIGINS to a comma-separated list,
// e.g. "https://academy.example.com,http://localhost:5173".
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('Origin')
  return allowedOrigins.length === 0 || !origin || allowedOrigins.includes(origin)
}
