/*
 * PREVIEW MODE ONLY — service implementations backed by sample data.
 * Used when no Supabase env vars are set (see isPreviewMode in lib/supabase).
 * Never used once Supabase is connected. Delete together with mockData.js
 * once preview mode is no longer needed.
 */
import { mockActivity, mockCategories, mockFavoriteIds, mockMemberCounts, mockProgress, mockResources } from './mockData'

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const categoryById = (id) => mockCategories.find((c) => c.id === id)

function decorate(resource) {
  return {
    ...resource,
    category: categoryById(resource.category_id),
    is_favorite: mockFavoriteIds.has(resource.id),
    progress: mockProgress[resource.id] ?? null,
  }
}

const published = () => mockResources.filter((r) => r.is_published)

export const previewResources = {
  async listCategories() {
    await delay()
    return mockCategories.map((c) => ({
      ...c,
      resource_count: published().filter((r) => r.category_id === c.id).length,
    }))
  },

  async listResources({ q = '', type = '', category = '', limit } = {}) {
    await delay()
    const term = q.trim().toLowerCase()
    let rows = published()
      .filter((r) => !type || r.resource_type === type)
      .filter((r) => !category || categoryById(r.category_id)?.slug === category)
      .filter((r) => !term || `${r.title} ${r.description}`.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (limit) rows = rows.slice(0, limit)
    return rows.map(decorate)
  },

  async getResource(id) {
    await delay()
    const r = published().find((x) => x.id === id)
    return r ? decorate(r) : null
  },

  async listFavorites() {
    await delay()
    return published().filter((r) => mockFavoriteIds.has(r.id)).map(decorate)
  },

  async toggleFavorite(id) {
    await delay(120)
    if (mockFavoriteIds.has(id)) mockFavoriteIds.delete(id)
    else mockFavoriteIds.add(id)
    return mockFavoriteIds.has(id)
  },

  async getLearningProgress() {
    await delay()
    const items = published()
      .filter((r) => mockProgress[r.id])
      .map(decorate)
      .sort((a, b) => new Date(b.progress.updated_at) - new Date(a.progress.updated_at))
    return {
      inProgress: items.filter((i) => i.progress.status === 'in_progress'),
      completed: items.filter((i) => i.progress.status === 'completed'),
      started: items.length,
      totalPublished: published().length,
    }
  },

  async markComplete(id) {
    await delay(120)
    mockProgress[id] = { status: 'completed', percent: 100, updated_at: new Date().toISOString() }
    return mockProgress[id]
  },
}

const sampleNames = [['Maria', 'Santos'], ['John', 'Reyes'], ['Priya', 'Nair'], ['Ken', 'Watanabe'], ['Lucia', 'Gomez']]

export const previewAdmin = {
  async getMemberStats() {
    await delay()
    return {
      totalMembers: mockMemberCounts.total,
      activeMembers: mockMemberCounts.active,
      inactiveMembers: mockMemberCounts.total - mockMemberCounts.active,
    }
  },

  async listRecentRegistrations(limit = 5) {
    await delay()
    return sampleNames.slice(0, limit).map(([first_name, last_name], i) => ({
      id: `preview-member-${i}`,
      first_name,
      last_name,
      email: `${first_name.toLowerCase()}.${last_name.toLowerCase()}@example.com`,
      role: 'member',
      status: i === 3 ? 'inactive' : 'active',
      created_at: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
    }))
  },

  async getResourceCounts() {
    await delay()
    const pdfCount = mockResources.filter((r) => r.resource_type === 'PDF').length
    const videoCount = mockResources.filter((r) => r.resource_type === 'VIDEO').length
    const publishedCount = mockResources.filter((r) => r.is_published).length
    return { pdfCount, videoCount, publishedCount, draftCount: mockResources.length - publishedCount, resourceTotal: mockResources.length }
  },

  async getRecentAdminActions(limit = 8) {
    await delay()
    const types = ['resource_uploaded', 'member_created', 'resource_published', 'category_created', 'announcement_published', 'member_deactivated']
    return types.slice(0, limit).map((activity_type, i) => ({
      id: `preview-log-${i}`,
      activity_type,
      actor_name: 'Preview Admin',
      target: ['Inbox Zero: Triage Like a Pro', 'Maria Santos', 'VA Professional Standards Handbook', 'Bookkeeping Basics', 'Welcome to the new cohort', 'Ken Watanabe'][i],
      details: null,
      created_at: new Date(Date.now() - (i + 1) * 3600_000 * 5).toISOString(),
    }))
  },

  /** Includes drafts — admins see everything. */
  async getRecentUploads(limit = 6) {
    await delay()
    return [...mockResources]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map((r) => ({ ...r, category: categoryById(r.category_id) }))
  },

  async getRecentActivity(limit = 7) {
    await delay()
    return mockActivity.slice(0, limit)
  },
}
