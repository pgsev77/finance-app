// ===== Core Types =====

export interface User {
  id: number
  username: string
  role: 'admin' | 'user'
  is_active: boolean
  force_change_password: boolean
}

export interface Account {
  id: number
  user_id: number
  name: string
  type: string
  balance: number
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  user_id: number
  name: string
  type: 'expense' | 'income'
  parent_id: number | null
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  children?: Category[]
}

export interface Transaction {
  id: number
  user_id: number
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category_id: number | null
  account_id: number | null
  to_account_id: number | null
  date: string
  note: string | null
  needs_confirm: boolean
  confirmed_at: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  category_name?: string
  account_name?: string
}

export interface Subscription {
  id: number
  user_id: number
  name: string
  amount: number
  subscription_category_id: number | null
  account_id: number | null
  cycle_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'once'
  cycle_days: number | null
  next_date: string
  trial_days: number | null
  trial_start_date: string | null
  status: 'trial' | 'active' | 'paused' | 'cancelled'
  auto_record: boolean
  currency: string
  note: string | null
  created_at: string
  updated_at: string
  category_name?: string
  account_name?: string
}

export interface SubscriptionCategory {
  id: number
  user_id: number
  name: string
  icon: string | null
  color: string | null
  is_active: boolean
}

export interface SubscriptionSummary {
  monthly_total: number
  yearly_total: number
  active_count: number
  by_category: Array<{
    category_id: number | null
    category_name: string
    total: number
    count: number
  }>
  upcoming: Subscription[]
}

export interface MonthlyReport {
  total_income: number
  total_expense: number
  balance: number
  by_category: Array<{
    category: string
    amount: number
    count: number
  }>
}

export interface TrendPoint {
  month: string
  income: number
  expense: number
  balance: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface UserSettings {
  default_needs_confirm: boolean
  confirm_rules: unknown[]
}

// ===== API Input Types =====

export interface TransactionCreate {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  category_id?: number | null
  account_id?: number | null
  to_account_id?: number | null
  date: string
  note?: string
  needs_confirm?: boolean
}

export interface TransactionUpdate {
  type?: 'expense' | 'income' | 'transfer'
  amount?: number
  category_id?: number | null
  account_id?: number | null
  to_account_id?: number | null
  date?: string
  note?: string
}

export interface AccountCreate {
  name: string
  type: string
  balance?: number
  icon?: string
  sort_order?: number
}

export interface AccountUpdate {
  name?: string
  type?: string
  balance?: number
  icon?: string
  sort_order?: number
  is_active?: boolean
}

export interface CategoryCreate {
  name: string
  type: 'expense' | 'income'
  parent_id?: number | null
  icon?: string
  color?: string
  sort_order?: number
}

export interface CategoryUpdate {
  name?: string
  icon?: string
  color?: string
  sort_order?: number
  is_active?: boolean
}

export interface SubscriptionCreate {
  name: string
  amount: number
  subscription_category_id?: number | null
  account_id?: number | null
  cycle_type: string
  cycle_days?: number | null
  next_date: string
  trial_days?: number | null
  trial_start_date?: string | null
  status?: string
  auto_record?: boolean
  currency?: string
  note?: string
}

export interface SubscriptionUpdate {
  name?: string
  amount?: number
  subscription_category_id?: number | null
  account_id?: number | null
  cycle_type?: string
  cycle_days?: number | null
  next_date?: string
  status?: string
  auto_record?: boolean
  currency?: string
  note?: string
}
