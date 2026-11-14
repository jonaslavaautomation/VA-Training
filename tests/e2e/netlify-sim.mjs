// Serves a production build the way Netlify would, using the headers and the
// SPA redirect from the project's netlify.toml (CSP pointed at the fake API).
import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' }

export function parseNetlifyHeaders(toml) {
  const blocks = []
  for (const m of toml.matchAll(/\[\[headers\]\]\s*\n\s*for = "([^"]+)"\s*\n\s*\[headers\.values\]\s*\n([\s\S]*?)(?=\n\s*(?:#[^\n]*\n\s*)*\[\[|$)/g)) {
    const values = {}
    for (const line of m[2].split('\n')) {
      const kv = line.match(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/)
      if (kv) values[kv[1]] = kv[2]
    }
    blocks.push({ for: m[1], values })
  }
  return blocks
}

export function startNetlifySim({ dist, toml, port, apiOrigin }) {
  const blocks = parseNetlifyHeaders(readFileSync(toml, 'utf8'))
  const matches = (pattern, path) => (pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern)
  const headersFor = (path) => {
    const out = {}
    for (const b of blocks) if (matches(b.for, path)) Object.assign(out, b.values)
    if (out['Content-Security-Policy']) {
      out['Content-Security-Policy'] = out['Content-Security-Policy']
        .replaceAll('https://*.supabase.co', apiOrigin)
        .replaceAll('wss://*.supabase.co', apiOrigin.replace('http', 'ws'))
        .replace('; upgrade-insecure-requests', '') // local test runs over http
    }
    return out
  }
  const server = http.createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = join(dist, path)
    let served = path
    if (!existsSync(file) || statSync(file).isDirectory()) { file = join(dist, 'index.html'); served = '/index.html' } // [[redirects]] /* → /index.html 200
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(path), ...(served === '/index.html' ? headersFor('/index.html') : {}) })
    res.end(readFileSync(file))
  })
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)))
}
