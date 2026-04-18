import type { Estimate, AdminStats, CreateEstimatePayload, UpdateEstimatePayload } from './types'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Estimates
  listEstimates: () => req<Estimate[]>('/estimates'),
  getEstimate: (id: string) => req<Estimate>(`/estimates/${id}`),
  createEstimate: (payload: CreateEstimatePayload) =>
    req<Estimate>('/estimates', { method: 'POST', body: JSON.stringify(payload) }),
  updateEstimate: (id: string, payload: UpdateEstimatePayload) =>
    req<Estimate>(`/estimates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEstimate: (id: string) =>
    req<{ deleted: boolean }>(`/estimates/${id}`, { method: 'DELETE' }),
  getEstimateByShareCode: (code: string) =>
    req<Estimate>(`/estimates/share/${code}`),

  // Stats
  getStats: () => req<AdminStats>('/admin/stats'),
}
