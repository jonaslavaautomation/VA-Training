import { supabase, isPreviewMode } from '@/lib/supabase'

/**
 * Appends an entry to the caller's own activity log. Best effort: a failed
 * log write must never break the action the user actually performed.
 * RLS only accepts rows for auth.uid() from active accounts.
 */
export async function logActivity(activityType, resourceId = null) {
  if (isPreviewMode) return
  try {
    const { error } = await supabase.from('activity_logs').insert({ activity_type: activityType, resource_id: resourceId })
    if (error) console.warn('Activity not logged', error.message)
  } catch (err) {
    console.warn('Activity not logged', err)
  }
}
