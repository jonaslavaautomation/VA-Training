import { Fragment } from 'react'
import { Lightbulb } from 'lucide-react'

/*
 * Renders the simple text format used by lessons, company sections and job
 * descriptions — as React elements, never as HTML, so admin-entered text
 * can't inject markup or scripts:
 *   blank line = new paragraph · "## " / "### " headings · "- " bullets
 *   "1. " numbered items · "> " highlighted tip · "---" divider
 *   **bold** · *italic* · ++underline++ · [link text](https://…) · bare https:// links
 * Only http(s) and mailto links are ever turned into links.
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
    if (!line.trim()) { flushPara(); flushList(); continue }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); flushList(); blocks.push({ type: 'hr' }); continue }
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

export default function RichText({ text, className = '' }) {
  const blocks = parseBlocks(text)
  return (
    <div className={`space-y-3 text-[15px] leading-7 text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'hr') return <hr key={i} className="my-2 border-slate-200" />
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
