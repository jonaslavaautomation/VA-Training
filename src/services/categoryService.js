/*
 * Category management (admin). RLS restricts writes to active admins;
 * deletion goes through the delete_category() function so resources are
 * reassigned and the category removed in one transaction.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { userError } from '@/lib/errors'

const COLUMNS = 'id, name, slug, description, icon, color, is_visible, created_at, updated_at'
const PREVIEW_MESSAGE = 'Category management needs a connected Supabase project.'

/** All categories (incl. hidden) with resource counts: total and published. */
export async function listCategoriesAdmin() {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
  const [cats, res] = await Promise.all([
    supabase.from('categories').select(COLUMNS).order('name'),
    supabase.from('training_resources').select('category_id, status'),
  ])
  if (cats.error) throw cats.error
  if (res.error) throw res.error
  const counts = new Map()
  for (const r of res.data) {
    if (!r.category_id) continue
    const c = counts.get(r.category_id) ?? { total: 0, published: 0 }
    c.total += 1
    if (r.status === 'published') c.published += 1
    counts.set(r.category_id, c)
  }
  return {
    categories: cats.data.map((c) => ({ ...c, resource_total: counts.get(c.id)?.total ?? 0, resource_published: counts.get(c.id)?.published ?? 0 })),
    uncategorized: res.data.filter((r) => !r.category_id).length,
  }
}

function friendly(error, fallback) {
  if (error?.code === '23505') return userError('A category with this name (or a very similar one) already exists.', { code: 'duplicate', cause: error })
  if (error?.code === '23514') return userError('Please check the category details.', { code: 'invalid', cause: error })
  return error ?? userError(fallback)
}

export async function createCategory({ name, description = '', isVisible = true }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), description: description.trim() || null, is_visible: isVisible })
    .select(COLUMNS)
    .single()
  if (error) throw friendly(error, 'Couldn’t create the category.')
  return data
}

export async function updateCategory(id, { name, description, isVisible }) {
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (description !== undefined) patch.description = description.trim() || null
  if (isVisible !== undefined) patch.is_visible = isVisible
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select(COLUMNS).single()
  if (error) throw friendly(error, 'Couldn’t update the category.')
  return data
}

/** Moves the category's resources to `moveTo` (or leaves them uncategorized when null), then deletes it. Returns moved count. */
export async function deleteCategory(id, moveTo = null) {
  const { data, error } = await supabase.rpc('delete_category', { p_category: id, p_move_to: moveTo })
  if (error) {
    if (error.code === '42501') throw userError('Only administrators can delete categories.', { cause: error })
    throw userError(error.message?.length < 120 ? error.message : 'Couldn’t delete the category.', { cause: error })
  }
  return data ?? 0
}
