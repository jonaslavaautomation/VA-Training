/*
 * TEMPORARY SAMPLE DATA — for visual previews only (Phase 1).
 * Field names mirror the planned Supabase tables so the swap in Phase 2 is
 * mechanical. Delete this file once every service reads from Supabase.
 */
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString()

export const mockCategories = [
  { id: 'c1', slug: 'getting-started', name: 'Getting Started', description: 'Onboarding and VA fundamentals', icon: 'rocket', color: 'navy' },
  { id: 'c2', slug: 'email-calendar', name: 'Email & Calendar', description: 'Inbox zero and scheduling', icon: 'mail', color: 'mint' },
  { id: 'c3', slug: 'customer-support', name: 'Customer Support', description: 'Tickets, chat and tone', icon: 'headset', color: 'sky' },
  { id: 'c4', slug: 'social-media', name: 'Social Media', description: 'Content calendars and posting', icon: 'share', color: 'rose' },
  { id: 'c5', slug: 'bookkeeping', name: 'Bookkeeping Basics', description: 'Invoices, receipts and reports', icon: 'calculator', color: 'amber' },
  { id: 'c6', slug: 'tools-software', name: 'Tools & Software', description: 'Google Workspace, Asana, Canva', icon: 'wrench', color: 'violet' },
]

export const mockResources = [
  { id: 'r1', title: 'Welcome to VA Training Academy', description: 'Start here: how the program works, what to expect each week and how to get help.', category_id: 'c1', resource_type: 'VIDEO', duration_seconds: 512, file_size: 84000000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(1, 3) },
  { id: 'r2', title: 'VA Professional Standards Handbook', description: 'Communication etiquette, response times and confidentiality rules for client work.', category_id: 'c1', resource_type: 'PDF', page_count: 24, file_size: 2300000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(2, 1) },
  { id: 'r3', title: 'Inbox Zero: Triage Like a Pro', description: 'A repeatable system to process a busy executive inbox in under 30 minutes.', category_id: 'c2', resource_type: 'VIDEO', duration_seconds: 1325, file_size: 210000000, uploaded_by_name: 'Daniel Cruz', created_at: daysAgo(3, 6) },
  { id: 'r4', title: 'Calendar Management Checklist', description: 'Printable checklist for booking, rescheduling and protecting focus time.', category_id: 'c2', resource_type: 'PDF', page_count: 6, file_size: 640000, uploaded_by_name: 'Daniel Cruz', created_at: daysAgo(4) },
  { id: 'r5', title: 'Handling Difficult Customers', description: 'De-escalation techniques with real chat transcripts and model replies.', category_id: 'c3', resource_type: 'VIDEO', duration_seconds: 1980, file_size: 320000000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(5, 2) },
  { id: 'r6', title: 'Support Ticket Response Templates', description: '30 editable templates for refunds, delays, bugs and follow-ups.', category_id: 'c3', resource_type: 'PDF', page_count: 18, file_size: 1100000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(6) },
  { id: 'r7', title: 'Building a Monthly Content Calendar', description: 'Plan a month of posts for a small business client step by step.', category_id: 'c4', resource_type: 'VIDEO', duration_seconds: 1540, file_size: 250000000, uploaded_by_name: 'Aisha Rahman', created_at: daysAgo(8) },
  { id: 'r8', title: 'Social Media Image Size Guide', description: 'Up-to-date dimensions for every major platform in one page.', category_id: 'c4', resource_type: 'PDF', page_count: 2, file_size: 380000, uploaded_by_name: 'Aisha Rahman', created_at: daysAgo(9) },
  { id: 'r9', title: 'Invoicing Clients the Right Way', description: 'Creating, sending and following up on invoices with common tools.', category_id: 'c5', resource_type: 'VIDEO', duration_seconds: 1105, file_size: 175000000, uploaded_by_name: 'Daniel Cruz', created_at: daysAgo(11) },
  { id: 'r10', title: 'Receipt Categorization Cheat Sheet', description: 'Which expense category every common receipt belongs to.', category_id: 'c5', resource_type: 'PDF', page_count: 4, file_size: 520000, uploaded_by_name: 'Daniel Cruz', created_at: daysAgo(13) },
  { id: 'r11', title: 'Google Workspace Power Tips', description: 'Shared drives, permissions, templates and shortcuts every VA should know.', category_id: 'c6', resource_type: 'VIDEO', duration_seconds: 2210, file_size: 360000000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(15) },
  { id: 'r12', title: 'Asana Project Setup Guide', description: 'Set up projects, sections and recurring tasks for a new client.', category_id: 'c6', resource_type: 'PDF', page_count: 12, file_size: 1800000, uploaded_by_name: 'Aisha Rahman', created_at: daysAgo(18) },
].map((r) => ({ storage_path: null, thumbnail_url: null, is_published: true, ...r }))

// Two drafts so the admin view can show publication status.
mockResources.push(
  { id: 'r13', title: 'Time Tracking for Hourly Clients', description: 'Draft — tools and habits for accurate time logs.', category_id: 'c6', resource_type: 'VIDEO', duration_seconds: 900, file_size: 140000000, uploaded_by_name: 'Grace Lim', created_at: daysAgo(0, 2), storage_path: null, thumbnail_url: null, is_published: false },
  { id: 'r14', title: 'Client Onboarding Questionnaire', description: 'Draft — intake form template.', category_id: 'c1', resource_type: 'PDF', page_count: 3, file_size: 290000, uploaded_by_name: 'Daniel Cruz', created_at: daysAgo(0, 5), storage_path: null, thumbnail_url: null, is_published: false },
)

export const mockFavoriteIds = new Set(['r2', 'r5', 'r11'])

export const mockProgress = {
  r1: { status: 'completed', percent: 100, updated_at: daysAgo(1) },
  r2: { status: 'completed', percent: 100, updated_at: daysAgo(1) },
  r3: { status: 'in_progress', percent: 65, updated_at: daysAgo(0, 4) },
  r5: { status: 'in_progress', percent: 30, updated_at: daysAgo(2) },
  r7: { status: 'in_progress', percent: 10, updated_at: daysAgo(3) },
}

const names = ['Maria Santos', 'John Reyes', 'Priya Nair', 'Ken Watanabe', 'Lucia Gomez', 'Ahmed Khan', 'Chloe Martin', 'Samuel Okoro']
export const mockMemberCounts = { total: 52, active: 47 }

export const mockActivity = [
  { id: 'a1', actor: names[0], action: 'completed', target: 'Welcome to VA Training Academy', created_at: daysAgo(0, 1) },
  { id: 'a2', actor: names[1], action: 'downloaded', target: 'Support Ticket Response Templates', created_at: daysAgo(0, 2) },
  { id: 'a3', actor: names[2], action: 'watched', target: 'Inbox Zero: Triage Like a Pro', created_at: daysAgo(0, 5) },
  { id: 'a4', actor: names[3], action: 'favorited', target: 'Google Workspace Power Tips', created_at: daysAgo(0, 9) },
  { id: 'a5', actor: names[4], action: 'downloaded', target: 'VA Professional Standards Handbook', created_at: daysAgo(1, 2) },
  { id: 'a6', actor: names[5], action: 'completed', target: 'Calendar Management Checklist', created_at: daysAgo(1, 7) },
  { id: 'a7', actor: names[6], action: 'signed_in', target: null, created_at: daysAgo(2) },
]
