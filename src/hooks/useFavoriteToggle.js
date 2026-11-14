import { useCallback } from 'react'
import { toggleFavorite } from '@/services/resourceService'
import { useToast } from '@/hooks/useToast'
import { toUserMessage } from '@/lib/errors'

const flipIn = (list, id) => list.map((r) => (r.id === id ? { ...r, is_favorite: !r.is_favorite } : r))

/**
 * Optimistic favorite toggle for a resource array held by useAsync.
 * `apply(data, fn)` maps the stored data to the list(s) to update — defaults
 * to treating data as a plain array. Restores the previous data on failure.
 */
export function useFavoriteToggle(setData, { apply = (data, fn) => fn(data ?? []), onChanged } = {}) {
  const toast = useToast()
  return useCallback(
    async (resource) => {
      let previous
      setData((data) => {
        previous = data
        return apply(data, (list) => flipIn(list, resource.id))
      })
      try {
        await toggleFavorite(resource.id)
        onChanged?.()
      } catch (err) {
        console.error('Failed to update favorite', err)
        setData(previous)
        toast.error(toUserMessage(err, 'Couldn’t update your favorites. Please try again.'))
      }
    },
    [setData, apply, onChanged, toast],
  )
}
