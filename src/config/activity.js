/** Human labels for activity_logs.activity_type (member activity + admin actions). */
export const ACTIVITY_LABELS = {
  // member activity
  signed_in: 'Signed in',
  viewed: 'Viewed',
  watched: 'Watched',
  downloaded: 'Downloaded',
  completed: 'Completed',
  favorited: 'Saved to favorites',
  // admin actions
  member_created: 'Member created',
  member_updated: 'Member updated',
  member_role_changed: 'Member role changed',
  member_activated: 'Member activated',
  member_deactivated: 'Member deactivated',
  member_invite_sent: 'Invitation sent',
  member_password_reset_sent: 'Password reset sent',
  resource_uploaded: 'Training uploaded',
  resource_updated: 'Resource updated',
  resource_file_replaced: 'Resource file replaced',
  resource_published: 'Resource published',
  resource_unpublished: 'Resource unpublished',
  resource_deleted: 'Resource deleted',
  category_created: 'Category created',
  category_updated: 'Category updated',
  category_deleted: 'Category deleted',
  announcement_created: 'Announcement created',
  announcement_updated: 'Announcement updated',
  announcement_published: 'Announcement published',
  announcement_unpublished: 'Announcement unpublished',
  announcement_archived: 'Announcement archived',
  announcement_deleted: 'Announcement deleted',
  lava_content_updated: 'LAVA content updated',
  lava_position_created: 'LAVA position created',
  lava_position_status_changed: 'LAVA position status changed',
  lava_position_deleted: 'LAVA position deleted',
  simulator_access_approved: 'Simulator access approved',
  simulator_access_rejected: 'Simulator access rejected',
}

export const MEMBER_ACTIVITY_TYPES = ['signed_in', 'viewed', 'watched', 'downloaded', 'completed', 'favorited']
export const ADMIN_ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS).filter((t) => !MEMBER_ACTIVITY_TYPES.includes(t))

/** Tone for the action badge. */
export function activityTone(type) {
  if (/deleted|deactivated|unpublished|archived|rejected/.test(type)) return 'red'
  if (/created|uploaded|published|activated|approved/.test(type)) return 'mint'
  if (MEMBER_ACTIVITY_TYPES.includes(type)) return 'gray'
  return 'navy'
}

/** One-line summary of the structured details column (field names, transitions — never content). */
export function describeDetails(details) {
  if (!details || typeof details !== 'object') return ''
  const parts = []
  if (Array.isArray(details.fields) && details.fields.length) parts.push(`Changed: ${details.fields.join(', ')}`)
  if (details.from && details.to) parts.push(`${details.from} → ${details.to}`)
  if (details.role) parts.push(`Role: ${details.role}`)
  if (details.status) parts.push(`Status: ${details.status}`)
  if (details.invited === false) parts.push('No invitation sent')
  if (details.type) parts.push(details.type === 'VIDEO' ? 'Video' : details.type)
  if (details.scheduled_for) parts.push(`Scheduled for ${new Date(details.scheduled_for).toLocaleString()}`)
  if (details.resources_moved_to) parts.push(details.resources_moved_to === 'uncategorized' ? 'Resources left uncategorized' : 'Resources moved to another category')
  return parts.join(' · ')
}
