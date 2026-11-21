import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Bold, Code2, Columns2, Eye, Film, Heading2, Heading3, ImagePlus, Italic, Lightbulb, Link2, List, ListOrdered, Minus, PenLine, Underline } from 'lucide-react'
import RichText, { videoEmbedUrl, VideoEmbed } from './RichText'

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
 *
 * `onPastePhoto(file) → Promise<url>` enables photos: paste (⌘V / Ctrl+V) or
 * drop an image and it is saved automatically and inserted at the cursor.
 */
export default function RichTextEditor({ label, value, onChange, rows = 14, maxLength = 20000, hint, placeholder, onPastePhoto, embeds = false }) {
  const id = useId()
  const ref = useRef(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const [saving, setSaving] = useState(0)
  const [photoError, setPhotoError] = useState('')
  const [photoTip, setPhotoTip] = useState(false)
  const [panel, setPanel] = useState(null) // 'video' | 'code' (embeds)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [codeText, setCodeText] = useState('')
  const [panelError, setPanelError] = useState('')
  const caretRef = useRef(0)

  // The text box grows with its content (no inner scrollbar), so the dialog
  // scrolls as one page and the sticky toolbar stays reachable.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(rows * 24 + 24, el.scrollHeight + 2)}px`
  })
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

  function addPhotos(files) {
    const el = ref.current
    if (!el || !onPastePhoto || !files.length) return
    setPhotoError('')
    const start = el.selectionStart
    const before = el.value.slice(0, start)
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const tokens = files.map(() => `![Saving photo…](saving:${Math.random().toString(36).slice(2, 10)})`)
    const text = `${lead}${tokens.join('\n')}\n\n`
    replaceRange(el, start, el.selectionEnd, text, start + text.length, start + text.length)
    // Show the photo right away: switch to side-by-side view on wide screens.
    if (view === 'write' && window.matchMedia?.('(min-width: 768px)').matches) setView('split')
    files.forEach((file, i) => {
      setSaving((n) => n + 1)
      onPastePhoto(file)
        .then((url) => onChange(valueRef.current.replace(tokens[i], `![Photo](${url})`)))
        .catch((err) => {
          onChange(valueRef.current.replace(`${tokens[i]}\n`, '').replace(tokens[i], ''))
          setPhotoError(err?.userMessage ?? 'The photo couldn’t be saved. Please try again.')
        })
        .finally(() => setSaving((n) => n - 1))
    })
  }

  const imagesFrom = (list) => [...(list ?? [])].filter((f) => f.type?.startsWith('image/'))

  function onPaste(e) {
    if (!onPastePhoto) return
    const files = imagesFrom(e.clipboardData?.files).length ? imagesFrom(e.clipboardData.files)
      : [...(e.clipboardData?.items ?? [])].filter((it) => it.kind === 'file' && it.type.startsWith('image/')).map((it) => it.getAsFile()).filter(Boolean)
    if (files.length) { e.preventDefault(); addPhotos(files); return }
    // Copied a web page selection with a picture but no image data: explain how to copy the photo itself.
    const html = e.clipboardData?.getData('text/html') ?? ''
    if (/<img\s/i.test(html) && !e.clipboardData.getData('text/plain').trim()) {
      e.preventDefault()
      setPhotoTip(true)
    }
  }

  function onDrop(e) {
    if (!onPastePhoto) return
    const files = imagesFrom(e.dataTransfer?.files)
    if (!files.length) return
    e.preventDefault()
    addPhotos(files)
  }

  /** Inserts a block on its own lines at the remembered cursor position. */
  function insertBlock(block) {
    const el = ref.current
    if (!el) return
    const at = Math.min(caretRef.current, el.value.length)
    const before = el.value.slice(0, at)
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const text = `${lead}${block}\n\n`
    replaceRange(el, at, at, text, at + text.length, at + text.length)
    if (window.matchMedia?.('(min-width: 768px)').matches && view === 'write') setView('split')
  }

  function openPanel(kind) {
    if (ref.current) caretRef.current = ref.current.selectionStart
    if (view === 'preview') setView('write')
    setPanelError('')
    setPanel((p) => (p === kind ? null : kind))
  }

  function insertVideo(e) {
    e?.preventDefault()
    const url = videoUrl.trim()
    if (!videoEmbedUrl(url)) { setPanelError('Paste a full YouTube, Vimeo, Loom, Wistia or Google Drive video link (starting with https://).'); return }
    const title = videoTitle.trim().replace(/[[\]]/g, '') || 'Video'
    insertBlock(`@[${title}](${url})`)
    setVideoUrl(''); setVideoTitle(''); setPanel(null)
  }

  function insertCode(e) {
    e?.preventDefault()
    const code = codeText.replace(/\r\n/g, '\n').trim()
    if (!code) { setPanelError('Paste the code you want to add.'); return }
    if (/^\s*:::\s*$/m.test(code)) { setPanelError('The code can’t contain a line with only “:::”.'); return }
    insertBlock(`:::html\n${code}\n:::`)
    setCodeText(''); setPanel(null)
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
      <div className="rounded-xl border border-slate-200 bg-white focus-within:border-navy-400 focus-within:ring-4 focus-within:ring-navy-100">
        {/* Toolbar (and the link / photo panels) stay pinned while the text scrolls. */}
        <div className="sticky -top-4 z-20 rounded-t-xl bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]" data-testid="editor-toolbar">
        <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl px-2 py-1.5" role="toolbar" aria-label="Formatting">
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
          {onPastePhoto && <ToolButton label="How to add a photo" icon={ImagePlus} onClick={() => setPhotoTip((t) => !t)} active={photoTip} />}
          {embeds && <ToolButton label="Add video" icon={Film} onClick={() => openPanel('video')} active={panel === 'video'} />}
          {embeds && <ToolButton label="Add custom code" icon={Code2} onClick={() => openPanel('code')} active={panel === 'code'} />}
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
          <form onSubmit={insertLink} className="flex flex-col gap-2 border-t border-slate-200 bg-lava-50 p-3 sm:flex-row sm:items-end" aria-label="Insert link">
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

        {panel === 'video' && (
          <form onSubmit={insertVideo} className="space-y-3 border-t border-slate-200 bg-lava-50 p-3" aria-label="Add video">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-[1.6] text-xs font-medium text-slate-600">
                Video link
                <input autoFocus value={videoUrl} onChange={(e) => { setVideoUrl(e.target.value); setPanelError('') }} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm" />
              </label>
              <label className="flex-1 text-xs font-medium text-slate-600">
                Caption (optional)
                <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="e.g. A day at LAVA" className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm" />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="h-9 rounded-md bg-lava-500 px-3 text-sm font-medium text-white hover:bg-lava-600">Insert video</button>
                <button type="button" onClick={() => setPanel(null)} className="h-9 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Works with YouTube, Vimeo, Loom, Wistia and Google Drive (file shared with “Anyone with the link”).</p>
            {panelError && <p className="text-xs text-red-600">{panelError}</p>}
            {videoEmbedUrl(videoUrl.trim()) && <div className="max-w-md"><VideoEmbed src={videoUrl.trim()} title={videoTitle} /></div>}
          </form>
        )}

        {panel === 'code' && (
          <form onSubmit={insertCode} className="space-y-2 border-t border-slate-200 bg-lava-50 p-3" aria-label="Add custom code">
            <label className="block text-xs font-medium text-slate-600">
              Custom code (HTML, CSS, JavaScript embeds such as forms, booking widgets or maps)
              <textarea autoFocus rows={6} value={codeText} onChange={(e) => { setCodeText(e.target.value); setPanelError('') }} spellCheck={false} placeholder={'<div style="padding:16px;background:#22212a;color:#fff;border-radius:12px">Hello from LAVA</div>'} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-[12px] leading-5" />
            </label>
            <p className="text-[11px] text-slate-500">Runs in a protected box on the page: it can show content and run its own scripts, but can’t access the rest of the portal or members’ accounts. Only paste code from sources you trust.</p>
            {panelError && <p className="text-xs text-red-600">{panelError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="h-9 rounded-md bg-lava-500 px-3 text-sm font-medium text-white hover:bg-lava-600">Insert code</button>
              <button type="button" onClick={() => setPanel(null)} className="h-9 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            </div>
          </form>
        )}

        {photoTip && onPastePhoto && (
          <div className="flex items-start gap-3 border-t border-slate-200 bg-lava-50 px-4 py-3 text-sm text-navy-800" role="note">
            <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-lava-500" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy-900">Paste a photo</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">Right-click a photo (for example on lavaautomation.com) and choose <strong>Copy Image</strong>, click where it should go in the text, then press <strong>{isMac ? '⌘V' : 'Ctrl+V'}</strong>. You can also drag a photo in. It’s saved automatically. Photos on lines right after each other show as a gallery; replace the word <em>Photo</em> in <code className="rounded bg-white px-1">![Photo](…)</code> to add a caption.</p>
            </div>
            <button type="button" onClick={() => setPhotoTip(false)} className="text-xs font-medium text-slate-500 hover:text-navy-900">Close</button>
          </div>
        )}

        </div>

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
              onPaste={onPaste}
              onSelect={(e) => { caretRef.current = e.currentTarget.selectionStart }}
              onDrop={onDrop}
              onDragOver={(e) => { if (onPastePhoto && [...(e.dataTransfer?.items ?? [])].some((it) => it.type.startsWith('image/'))) e.preventDefault() }}
              placeholder={placeholder}
              spellCheck
              className="block min-h-48 w-full resize-none overflow-hidden border-0 bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          )}
          {showPreview && (
            <div className="min-h-48 px-5 py-4" aria-label="Preview">
              {value.trim() ? <RichText text={value} /> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-400">
          <span className={photoError ? 'text-red-600' : saving ? 'text-lava-600' : ''} role={photoError ? 'alert' : undefined}>
            {photoError || (saving ? `Saving ${saving} photo${saving === 1 ? '' : 's'}…` : hint ?? (onPastePhoto ? `Select text, then use the toolbar. Paste photos with ${isMac ? '⌘V' : 'Ctrl+V'}.` : 'Select text, then use the toolbar. Links open in a new tab.'))}
          </span>
          <span>{words} word{words === 1 ? '' : 's'} · {value.length.toLocaleString()}/{maxLength.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
