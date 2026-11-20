import { Fragment } from 'react'
import { ImageOff, Lightbulb } from 'lucide-react'
import { PHOTO_URL_PREFIX } from '@/services/lavaService'

/*
 * Renders the simple text format used by lessons, company sections and job
 * descriptions — as React elements, never as HTML, so admin-entered text
 * can't inject markup or scripts:
 *   blank line = new paragraph · "## " / "### " headings · "- " bullets
 *   "1. " numbered items · "> " highlighted tip · "---" divider
 *   **bold** · *italic* · ++underline++ · [link text](https://…) · bare https:// links
 *   ![caption](photo URL) on its own line = photo; photos on consecutive lines = gallery
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

export function parseBlocks(source = '') {
  const blocks = []
  let list = null
  let para = []
  const flushPara = () => { if (para.length) blocks.push({ type: 'p', text: para.join(' ') }); para = [] }
  const flushList = () => { if (list) blocks.push(list); list = null }

  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
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
