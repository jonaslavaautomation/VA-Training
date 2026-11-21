import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Code2, ImageOff, Lightbulb, VideoOff } from 'lucide-react'
import { PHOTO_URL_PREFIX } from '@/services/lavaService'

/*
 * Renders the simple text format used by lessons, company sections and job
 * descriptions — as React elements, never as HTML, so admin-entered text
 * can't inject markup or scripts:
 *   blank line = new paragraph · "## " / "### " headings · "- " bullets
 *   "1. " numbered items · "> " highlighted tip · "---" divider
 *   **bold** · *italic* · ++underline++ · [link text](https://…) · bare https:// links
 *   ![caption](photo URL) on its own line = photo; photos on consecutive lines = gallery
 *   @[title](YouTube / Vimeo / Loom / Wistia / Google Drive link) on its own line = video
 *   :::html … ::: = custom code, run in an isolated sandboxed frame (admin-authored only)
 * Only http(s) and mailto links are ever turned into links, and only photos
 * saved in the app's own photo bucket (pasted in the editor) are displayed.
 */

const INLINE = [
  { type: 'link', re: /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/ },
  { type: 'bold', re: /\*\*([^\n]+?)\*\*/ },
  { type: 'underline', re: /\+\+([^\n]+?)\+\+/ },
  { type: 'italic', re: /\*([^\s*](?:[^*\n]*[^\s*])?)\*/ },
  { type: 'url', re: /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/ },
]

const linkClass = 'font-medium text-lava-600 underline decoration-lava-300 underline-offset-2 hover:text-lava-700 hover:decoration-lava-500'

/** Turns one line of text into React nodes (formatting can be nested). */
export function inline(text, keyPrefix = 'i') {
  const out = []
  let rest = text
  let n = 0
  while (rest) {
    let best = null
    for (const p of INLINE) {
      const m = p.re.exec(rest)
      if (m && (!best || m.index < best.m.index)) best = { ...p, m }
    }
    if (!best) { out.push(<Fragment key={`${keyPrefix}${n++}`}>{rest}</Fragment>); break }
    const { type, m } = best
    if (m.index > 0) out.push(<Fragment key={`${keyPrefix}${n++}`}>{rest.slice(0, m.index)}</Fragment>)
    const key = `${keyPrefix}${n++}`
    if (type === 'link') out.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>{inline(m[1], `${key}-`)}</a>)
    else if (type === 'url') out.push(<a key={key} href={m[0]} target="_blank" rel="noopener noreferrer nofollow" className={`${linkClass} break-all`}>{m[0]}</a>)
    else if (type === 'bold') out.push(<strong key={key} className="font-semibold text-navy-900">{inline(m[1], `${key}-`)}</strong>)
    else if (type === 'underline') out.push(<u key={key} className="underline decoration-navy-400 underline-offset-2">{inline(m[1], `${key}-`)}</u>)
    else out.push(<em key={key} className="italic">{inline(m[1], `${key}-`)}</em>)
    rest = rest.slice(m.index + m[0].length)
  }
  return out
}

const IMAGE_LINE = /^\s*!\[([^\]\n]*)\]\(([^)\s]+)\)\s*$/
const VIDEO_LINE = /^\s*@\[([^\]\n]*)\]\(([^)\s]+)\)\s*$/

/** Turns a YouTube / Vimeo / Loom / Wistia / Google Drive link into its embeddable player URL (null if unsupported). */
export function videoEmbedUrl(raw) {
  let u
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
  const id = (v) => (v && /^[\w-]{4,64}$/.test(v) ? v : null)
  const parts = u.pathname.split('/').filter(Boolean)
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v') ?? (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null)
    return id(v) && `https://www.youtube-nocookie.com/embed/${v}`
  }
  if (host === 'youtu.be') return id(parts[0]) && `https://www.youtube-nocookie.com/embed/${parts[0]}`
  if (host === 'vimeo.com') { const v = parts.find((x) => /^\d+$/.test(x)); return v ? `https://player.vimeo.com/video/${v}` : null }
  if (host === 'player.vimeo.com' && parts[0] === 'video' && /^\d+$/.test(parts[1] ?? '')) return `https://player.vimeo.com/video/${parts[1]}`
  if (host === 'loom.com' && ['share', 'embed'].includes(parts[0])) return id(parts[1]) && `https://www.loom.com/embed/${parts[1]}`
  if (host.endsWith('wistia.com') || host.endsWith('wistia.net')) { const v = parts.at(-1); return id(v) && `https://fast.wistia.net/embed/iframe/${v}` }
  if (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd') return id(parts[2]) && `https://drive.google.com/file/d/${parts[2]}/preview`
  return null
}

export function parseBlocks(source = '') {
  const blocks = []
  let list = null
  let para = []
  const flushPara = () => { if (para.length) blocks.push({ type: 'p', text: para.join(' ') }); para = [] }
  const flushList = () => { if (list) blocks.push(list); list = null }

  let code = null // lines of an open :::html block
  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (code) {
      if (line.trim() === ':::') { blocks.push({ type: 'code', html: code.join('\n') }); code = null } else code.push(raw)
      continue
    }
    if (/^\s*:::(html|code)\s*$/i.test(line)) { flushPara(); flushList(); code = []; continue }
    const vid = line.match(VIDEO_LINE)
    if (vid) { flushPara(); flushList(); blocks.push({ type: 'video', title: vid[1].trim(), src: vid[2] }); continue }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (!line.trim()) { flushPara(); flushList(); const last = blocks.at(-1); if (last?.type === 'images') last.open = false; continue }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); flushList(); blocks.push({ type: 'hr' }); continue }
    const img = line.match(IMAGE_LINE)
    if (img) {
      flushPara(); flushList()
      const last = blocks.at(-1)
      const photo = { alt: img[1].trim(), src: img[2] }
      if (last?.type === 'images' && last.open) last.items.push(photo)
      else blocks.push({ type: 'images', items: [photo], open: true })
      continue
    }
    if (line.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', text: line.slice(4) }); continue }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', text: line.slice(3) }); continue }
    if (line.startsWith('> ')) {
      flushPara(); flushList()
      const last = blocks.at(-1)
      if (last?.type === 'tip' && last.open) last.text += ' ' + line.slice(2)
      else blocks.push({ type: 'tip', text: line.slice(2), open: true })
      continue
    }
    if (bullet || numbered) {
      flushPara()
      const type = bullet ? 'ul' : 'ol'
      if (list?.type !== type) { flushList(); list = { type, items: [] } }
      list.items.push((bullet ?? numbered)[1])
      continue
    }
    flushList()
    const last = blocks.at(-1)
    if (last) last.open = false
    para.push(line.trim())
  }
  if (code) blocks.push({ type: 'code', html: code.join('\n') }) // unclosed block: keep it
  flushPara(); flushList()
  return blocks
}

const isCaption = (alt) => alt && !/^(photo|image|saving photo…?)$/i.test(alt)

function Photo({ item, tile }) {
  if (item.src.startsWith('saving:')) {
    return <div className={`flex animate-pulse items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 ${tile ? 'aspect-[4/3]' : 'h-48'}`}>Saving photo…</div>
  }
  if (!item.src.startsWith(PHOTO_URL_PREFIX)) {
    return <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-400 ring-1 ring-slate-200"><ImageOff className="h-4 w-4" /> Photo not shown (only photos pasted in the editor can be displayed)</div>
  }
  return (
    <figure className="m-0">
      <a href={item.src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/70" aria-label={isCaption(item.alt) ? `Open photo: ${item.alt}` : 'Open photo'}>
        <img
          src={item.src}
          alt={isCaption(item.alt) ? item.alt : ''}
          loading="lazy"
          decoding="async"
          className={tile ? 'aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.02]' : 'h-auto max-h-[34rem] w-full object-cover'}
        />
      </a>
      {isCaption(item.alt) && <figcaption className="mt-1.5 text-center text-xs text-slate-500">{item.alt}</figcaption>}
    </figure>
  )
}

function Photos({ items }) {
  if (items.length === 1) return <div className="py-1"><Photo item={items[0]} /></div>
  return (
    <div className={`grid grid-cols-2 gap-3 py-1 ${items.length >= 3 ? 'sm:grid-cols-3' : ''}`} data-testid="photo-gallery">
      {items.map((item, j) => <Photo key={j} item={item} tile />)}
    </div>
  )
}

const isVideoTitle = (t) => t && !/^video$/i.test(t)

/** Responsive 16:9 player for supported video sites. */
export function VideoEmbed({ title, src }) {
  const url = videoEmbedUrl(src)
  if (!url) {
    return <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-400 ring-1 ring-slate-200"><VideoOff className="h-4 w-4" /> Video not shown (use a YouTube, Vimeo, Loom, Wistia or Google Drive link)</div>
  }
  return (
    <figure className="m-0 py-1" data-testid="video-embed">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-lg shadow-navy-900/10 ring-1 ring-slate-200/70">
        <iframe
          src={url}
          title={isVideoTitle(title) ? title : 'Video'}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {isVideoTitle(title) && <figcaption className="mt-1.5 text-center text-xs text-slate-500">{title}</figcaption>}
    </figure>
  )
}

/**
 * Custom code (HTML / scripts / widgets) written by an admin. Runs in a
 * sandboxed iframe WITHOUT allow-same-origin (opaque origin), so it can't read
 * the app, its cookies or the member's session. The frame grows to fit.
 */
export function CustomCode({ html }) {
  const frameRef = useRef(null)
  const token = useId()
  const [height, setHeight] = useState(80)
  useEffect(() => {
    function onMessage(e) {
      const frame = frameRef.current
      if (!frame || e.source !== frame.contentWindow || !e.data) return
      if (e.data.type === 'lava-embed-ready') frame.contentWindow.postMessage({ type: 'lava-embed-code', token, html }, '*')
      if (e.data.type === 'lava-embed-height' && e.data.token === token) setHeight(Math.min(Math.max(Number(e.data.height) || 0, 24), 4000))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [html, token])
  if (!html.trim()) {
    return <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-400 ring-1 ring-slate-200"><Code2 className="h-4 w-4" /> Empty custom code block</div>
  }
  return (
    <iframe
      ref={frameRef}
      key={html}
      src="/embed.html"
      title="Embedded content"
      data-testid="custom-code"
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      className="block w-full border-0 bg-transparent"
      style={{ height }}
      loading="lazy"
    />
  )
}

/** Splits a body into its text and its photos (for website-style layouts that place photos beside the text). */
export function extractPhotos(source = '') {
  const photos = []
  const text = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => {
      const m = line.match(IMAGE_LINE)
      if (m) photos.push({ alt: m[1].trim(), src: m[2] })
      return !m
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, photos }
}

/** Large lead photo with the rest as a strip of thumbnails — for the About LAVA page. */
export function PhotoShowcase({ photos }) {
  if (!photos.length) return null
  const [lead, ...rest] = photos
  return (
    <div className="space-y-3" data-testid="photo-showcase">
      <div className="overflow-hidden rounded-3xl shadow-xl shadow-navy-900/10 ring-1 ring-slate-200/70"><Photo item={lead} tile /></div>
      {rest.length > 0 && (
        <div className={`grid gap-3 ${rest.length === 1 ? 'grid-cols-1' : rest.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {rest.map((p, i) => <Photo key={i} item={p} tile />)}
        </div>
      )}
    </div>
  )
}

export default function RichText({ text, className = '' }) {
  const blocks = parseBlocks(text)
  return (
    <div className={`space-y-3 text-[15px] leading-7 text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'hr') return <hr key={i} className="my-2 border-slate-200" />
        if (b.type === 'images') return <Photos key={i} items={b.items} />
        if (b.type === 'video') return <VideoEmbed key={i} title={b.title} src={b.src} />
        if (b.type === 'code') return <CustomCode key={i} html={b.html} />
        if (b.type === 'h2') return <h2 key={i} className="pt-3 text-lg font-semibold text-navy-900">{inline(b.text)}</h2>
        if (b.type === 'h3') return <h3 key={i} className="pt-1 text-base font-semibold text-navy-900">{inline(b.text)}</h3>
        if (b.type === 'ul') return <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-lava-500">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
        if (b.type === 'ol') return <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-navy-400">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>
        if (b.type === 'tip') {
          return (
            <div key={i} className="flex gap-3 rounded-xl bg-lava-50 p-4 text-sm leading-6 text-navy-800 ring-1 ring-inset ring-lava-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-lava-600" />
              <p>{inline(b.text)}</p>
            </div>
          )
        }
        return <p key={i} className="break-words">{inline(b.text)}</p>
      })}
    </div>
  )
}
