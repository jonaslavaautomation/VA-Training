import { useId, useRef, useState } from 'react'
import { Bold, Columns2, Eye, Heading2, Heading3, Italic, Lightbulb, Link2, List, ListOrdered, Minus, PenLine, Underline } from 'lucide-react'
import RichText from './RichText'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

/** Replace [start, end) in the textarea, keeping the browser's undo history where supported. */
function replaceRange(el, start, end, text, selectFrom, selectTo) {
  el.focus()
  el.setSelectionRange(start, end)
  let ok = false
  try { ok = document.execCommand('insertText', false, text) } catch { ok = false }
  if (!ok) el.setRangeText(text, start, end, 'end')
  el.setSelectionRange(selectFrom, selectTo)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Wraps (or unwraps) the selection in an inline marker such as ** or ++. */
function toggleInline(el, marker, placeholder) {
  const { selectionStart: s, selectionEnd: e, value } = el
  const before = value.slice(Math.max(0, s - marker.length), s)
  const after = value.slice(e, e + marker.length)
  if (before === marker && after === marker) {
    replaceRange(el, s - marker.length, e + marker.length, value.slice(s, e), s - marker.length, e - marker.length)
    return
  }
  const sel = value.slice(s, e)
  const inner = sel || placeholder
  // Keep surrounding spaces outside the markers ("**word** " not "**word **").
  const lead = inner.match(/^\s*/)[0]
  const trail = inner.match(/\s*$/)[0]
  const core = inner.trim() || placeholder
  const text = `${lead}${marker}${core}${marker}${trail}`
  const from = s + lead.length + marker.length
  replaceRange(el, s, e, text, from, from + core.length)
}

/** Adds (or removes) a prefix such as "## ", "- " or "1. " on every selected line. */
function toggleLines(el, kind) {
  const { selectionStart: s, selectionEnd: e, value } = el
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const lineEndIdx = value.indexOf('\n', e)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const patterns = { h2: /^## /, h3: /^### /, ul: /^- /, ol: /^\d+\. /, tip: /^> / }
  const prefix = (i) => ({ h2: '## ', h3: '### ', ul: '- ', ol: `${i + 1}. `, tip: '> ' })[kind]
  const strip = (l) => l.replace(/^(#{2,3} |- |\d+\. |> )/, '')
  const all = lines.every((l) => !l.trim() || patterns[kind].test(l))
  const next = lines.map((l, i) => (!l.trim() ? l : all ? strip(l) : prefix(i) + strip(l))).join('\n')
  replaceRange(el, lineStart, lineEnd, next, lineStart, lineStart + next.length)
}

function ToolButton({ label, shortcut, icon: Icon, onClick, active }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the textarea selection
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition ${active ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-white hover:text-navy-900 hover:shadow-sm'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

const Divider = () => <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

/**
 * Formatting editor for lesson text, company sections and job descriptions.
 * Stores plain formatted text (rendered safely by <RichText>), so nothing
 * typed here can inject HTML or scripts.
 */
export default function RichTextEditor({ label, value, onChange, rows = 14, maxLength = 20000, hint, placeholder }) {
  const id = useId()
  const ref = useRef(null)
  const [view, setView] = useState('write') // write | preview | split
  const [linkForm, setLinkForm] = useState(null) // { text, url, start, end }
  const [linkError, setLinkError] = useState('')

  const run = (fn) => () => {
    if (!ref.current) { setView('write'); return } // toolbar in Preview: switch back to writing
    fn(ref.current)
  }
  const bold = run((el) => toggleInline(el, '**', 'bold text'))
  const italic = run((el) => toggleInline(el, '*', 'italic text'))
  const underline = run((el) => toggleInline(el, '++', 'underlined text'))
  const divider = run((el) => {
    const s = el.selectionStart
    const needsBreak = s > 0 && el.value[s - 1] !== '\n'
    const text = `${needsBreak ? '\n\n' : ''}---\n\n`
    replaceRange(el, s, el.selectionEnd, text, s + text.length, s + text.length)
  })

  function openLink() {
    const el = ref.current
    if (!el) return
    if (view === 'preview') setView('write')
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const selected = v.slice(s, e)
    const looksLikeUrl = /^(https?:\/\/|mailto:)\S+$/.test(selected.trim())
    setLinkError('')
    setLinkForm({ text: looksLikeUrl ? '' : selected, url: looksLikeUrl ? selected.trim() : 'https://', start: s, end: e })
  }

  function insertLink(e) {
    e?.preventDefault()
    let url = linkForm.url.trim()
    if (/^www\./i.test(url)) url = `https://${url}`
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) url = `mailto:${url}`
    if (!/^(https?:\/\/[^\s.]+\.[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(url)) {
      setLinkError('Enter a full web address (https://…) or an email address.')
      return
    }
    const text = (linkForm.text.trim() || url.replace(/^mailto:/, '')).replace(/[[\]]/g, '')
    const md = `[${text}](${url})`
    const el = ref.current
    replaceRange(el, linkForm.start, linkForm.end, md, linkForm.start + 1, linkForm.start + 1 + text.length)
    setLinkForm(null)
  }

  function onKeyDown(e) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); bold() }
    else if (k === 'i') { e.preventDefault(); italic() }
    else if (k === 'u') { e.preventDefault(); underline() }
    else if (k === 'k') { e.preventDefault(); openLink() }
  }

  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  const showEditor = view !== 'preview'
  const showPreview = view !== 'write'

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-navy-400 focus-within:ring-4 focus-within:ring-navy-100">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Formatting">
          <ToolButton label="Heading" icon={Heading2} onClick={run((el) => toggleLines(el, 'h2'))} />
          <ToolButton label="Subheading" icon={Heading3} onClick={run((el) => toggleLines(el, 'h3'))} />
          <Divider />
          <ToolButton label="Bold" shortcut={`${mod}B`} icon={Bold} onClick={bold} />
          <ToolButton label="Italic" shortcut={`${mod}I`} icon={Italic} onClick={italic} />
          <ToolButton label="Underline" shortcut={`${mod}U`} icon={Underline} onClick={underline} />
          <ToolButton label="Insert link" shortcut={`${mod}K`} icon={Link2} onClick={openLink} active={Boolean(linkForm)} />
          <Divider />
          <ToolButton label="Bulleted list" icon={List} onClick={run((el) => toggleLines(el, 'ul'))} />
          <ToolButton label="Numbered list" icon={ListOrdered} onClick={run((el) => toggleLines(el, 'ol'))} />
          <ToolButton label="Highlighted tip" icon={Lightbulb} onClick={run((el) => toggleLines(el, 'tip'))} />
          <ToolButton label="Divider line" icon={Minus} onClick={divider} />
          <div className="ml-auto flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200" role="tablist" aria-label="Editor view">
            {[['write', 'Write', PenLine], ['split', 'Split', Columns2], ['preview', 'Preview', Eye]].map(([v, text, Icon]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${view === v ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'} ${v === 'split' ? 'hidden md:flex' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" /> {text}
              </button>
            ))}
          </div>
        </div>

        {linkForm && (
          <form onSubmit={insertLink} className="flex flex-col gap-2 border-b border-slate-200 bg-lava-50/50 p-3 sm:flex-row sm:items-end" aria-label="Insert link">
            <label className="flex-1 text-xs font-medium text-slate-600">
              Text to show
              <input autoFocus value={linkForm.text} onChange={(e) => setLinkForm((f) => ({ ...f, text: e.target.value }))} placeholder="e.g. Visit our website" className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm" />
            </label>
            <label className="flex-[1.4] text-xs font-medium text-slate-600">
              Link (web address or email)
              <input value={linkForm.url} onChange={(e) => { setLinkForm((f) => ({ ...f, url: e.target.value })); setLinkError('') }} placeholder="https://www.lavaautomation.com" className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm" />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="h-9 rounded-md bg-lava-500 px-3 text-sm font-medium text-white hover:bg-lava-600">Add link</button>
              <button type="button" onClick={() => setLinkForm(null)} className="h-9 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            </div>
            {linkError && <p className="text-xs text-red-600 sm:basis-full">{linkError}</p>}
          </form>
        )}

        <div className={`grid ${view === 'split' ? 'md:grid-cols-2 md:divide-x md:divide-slate-200' : 'grid-cols-1'}`}>
          {showEditor && (
            <textarea
              ref={ref}
              id={id}
              rows={rows}
              maxLength={maxLength}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              spellCheck
              className="block min-h-48 w-full resize-y border-0 px-4 py-3 font-mono text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          )}
          {showPreview && (
            <div className="max-h-[32rem] min-h-48 overflow-y-auto px-5 py-4" aria-label="Preview">
              {value.trim() ? <RichText text={value} /> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-400">
          <span>{hint ?? 'Select text, then use the toolbar. Links open in a new tab.'}</span>
          <span>{words} word{words === 1 ? '' : 's'} · {value.length.toLocaleString()}/{maxLength.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
