// Serves a production build the way Vercel would, using the rewrites and
// headers from the project's vercel.json (CSP pointed at the fake API).
// Vercel serves real files first, then applies rewrites (SPA fallback).
import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' }

/** vercel.json `source` patterns used here: "/(.*)", "/assets/(.*)", "/index.html". */

export function loadVercelConfig(file) {
  const cfg = JSON.parse(readFileSync(file, 'utf8'))
  const compile = (source) => new RegExp('^' + source.split('(.*)').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  return {
    headers: (cfg.headers ?? []).map((h) => ({ match: compile(h.source), values: Object.fromEntries(h.headers.map((x) => [x.key, x.value])) })),
    rewrites: (cfg.rewrites ?? []).map((r) => ({ match: compile(r.source), destination: r.destination })),
  }
}

export function startHostingSim({ dist, config, port, apiOrigin }) {
  const cfg = loadVercelConfig(config)
  const headersFor = (path) => {
    const out = {}
    for (const h of cfg.headers) if (h.match.test(path)) Object.assign(out, h.values)
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
    if (!existsSync(file) || statSync(file).isDirectory()) {
      const rw = cfg.rewrites.find((r) => r.match.test(path))
      file = join(dist, rw ? rw.destination : '/404.html')
    }
    if (!existsSync(file)) { res.writeHead(404); return res.end('Not found') }
    const served = '/' + file.slice(dist.length).replace(/^\/+/, '')
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(path), ...(served !== path ? headersFor(served) : {}) })
    res.end(readFileSync(file))
  })
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)))
}
