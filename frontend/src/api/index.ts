import { toast } from 'sonner'
import type {
  User,
  Account,
  AccountCreate,
  AccountUpdate,
  Category,
  CategoryCreate,
  CategoryUpdate,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  Subscription,
  SubscriptionCreate,
  SubscriptionUpdate,
  SubscriptionCategory,
  SubscriptionSummary,
  MonthlyReport,
  TrendPoint,
  PaginatedResponse,
  UserSettings,
} from '@/types'

export type { User }

const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('token')
}

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
    const msg = body.detail || `请求失败 ${res.status}`
    toast.error(msg)
    throw new Error(msg)
  }
  const json = await res.json()
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T
  }
  return json as T
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request('/users/me/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Transaction>>(`/transactions${q}`)
  },
  createTransaction: (data: TransactionCreate) =>
    request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: TransactionUpdate) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) =>
    request(`/transactions/${id}`, { method: 'DELETE' }),

  // Accounts
  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (data: AccountCreate) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: AccountUpdate) =>
    request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) =>
    request(`/accounts/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (data: CategoryCreate) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: CategoryUpdate) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request(`/categories/${id}`, { method: 'DELETE' }),

  // Reports
  getMonthlyReport: (year: number, month: number) =>
    request<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`),
  getTrend: (months?: number) =>
    request<TrendPoint[]>(`/reports/trend?months=${months || 6}`),

  // Subscriptions
  getSubscriptions: () => request<Subscription[]>('/subscriptions'),
  getSubscriptionSummary: () => request<SubscriptionSummary>('/subscriptions/summary'),
  getUpcomingSubscriptions: (days?: number) =>
    request<Subscription[]>(`/subscriptions/upcoming?days=${days || 7}`),
  createSubscription: (data: SubscriptionCreate) =>
    request<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscription: (id: number, data: SubscriptionUpdate) =>
    request<Subscription>(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubscription: (id: number) =>
    request(`/subscriptions/${id}`, { method: 'DELETE' }),
  getSubscriptionCategories: () => request<SubscriptionCategory[]>('/subscriptions/categories'),
  createSubscriptionCategory: (data: { name: string; icon?: string; color?: string }) =>
    request<SubscriptionCategory>('/subscriptions/categories', { method: 'POST', body: JSON.stringify(data) }),

  // Users (admin)
  getUsers: () => request<User[]>('/users'),
  createUser: (data: { username: string; password: string; role?: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUser: (id: number) =>
    request(`/users/${id}/toggle`, { method: 'POST' }),

  // Settings
  getSettings: () => request<UserSettings>('/settings'),
  updateSettings: (data: Partial<UserSettings>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
