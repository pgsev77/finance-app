const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export interface User {
  id: number
  username: string
  role: 'admin' | 'user'
  force_change_password?: boolean
}

// 保存用户信息
export function saveAuth(token: string, user: User) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function getAuth(): { token: string; user: User } | null {
  const token = getToken()
  const u = localStorage.getItem('user')
  if (!token || !u) return null
  try { return { token, user: JSON.parse(u) } } catch { return null }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// fetch 封装
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('未登录')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `请求失败 ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ items: any[]; total: number }>(`/transactions${q}`)
  },
  createTransaction: (data: any) =>
    request('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Accounts
  getAccounts: () => request<any[]>('/accounts'),

  // Categories
  getCategories: () => request<any[]>('/categories'),

  // Reports
  getMonthlyReport: (month: string) =>
    request<any>(`/reports/monthly?month=${month}`),

  // Subscriptions
  getSubscriptions: () => request<any[]>('/subscriptions'),

  // Users (admin)
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUser: (id: number) =>
    request(`/users/${id}/toggle`, { method: 'POST' }),

  // Settings
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
