import { useState } from 'react'
import Button from '@/components/ui/Button'
import { createCategory } from '@/services/resourceAdminService'
import { useToast } from '@/hooks/useToast'
import { toUserMessage } from '@/lib/errors'

const NEW = '__new__'

/** Category dropdown with an inline "New category" option (admins only — enforced by RLS). */
export default function CategorySelect({ categories, value, onChange, onCreated, id, disabled }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const category = await createCategory(name)
      onCreated(category)
      onChange(category.id)
      setAdding(false)
      setName('')
      toast.success(`Category “${category.name}” created.`)
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t create the category.'))
    } finally {
      setSaving(false)
    }
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          autoFocus
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } if (e.key === 'Escape') setAdding(false) }}
          placeholder="New category name"
          className="block h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
        />
        <Button onClick={add} loading={saving} disabled={!name.trim()}>Add</Button>
        <Button variant="ghost" onClick={() => setAdding(false)} disabled={saving}>Cancel</Button>
      </div>
    )
  }

  return (
    <select
      id={id}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value || null))}
      className="block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
    >
      <option value="">No category</option>
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value={NEW}>+ New category…</option>
    </select>
  )
}
