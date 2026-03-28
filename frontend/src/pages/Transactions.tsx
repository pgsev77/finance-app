import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

const PAGE_SIZE = 20

function MobileFilterToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const hasActive = false // simple toggle
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text transition-colors lg:hidden">
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        筛选条件
      </button>
      <div className={`${open ? '' : 'hidden'} lg:block`}>{children}</div>
    </div>
  )
}

export default function Transactions() {
  const nav = useNavigate()
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCategories().then(c => setCategories(Array.isArray(c) ? c : [])).catch(() => {})
    api.getAccounts().then(a => setAccounts(Array.isArray(a) ? a : [])).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [typeFilter, categoryFilter, accountFilter, monthFilter, search])

  useEffect(() => {
    loadTransactions()
  }, [page, typeFilter, categoryFilter, accountFilter, monthFilter, search])

  async function loadTransactions() {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) }
      if (typeFilter !== 'all') params.type = typeFilter
      if (categoryFilter) params.category_id = categoryFilter
      if (accountFilter) params.account_id = accountFilter
      if (monthFilter) {
        params.start_date = `${monthFilter}-01`
        const [y, m] = monthFilter.split('-').map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        params.end_date = `${monthFilter}-${String(lastDay).padStart(2, '0')}`
      }
      if (search) params.search = search
      const data = await api.getTransactions(params)
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const amountDisplay = (t: any) => {
    const isIncome = t.type === 'income'
    const amt = Math.abs(t.amount || 0)
    return { sign: isIncome ? '+' : '-', amount: amt, color: isIncome ? 'text-income' : 'text-expense' }
  }

  if (loading && items.length === 0) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-text-secondary">共 {total} 条记录</div>
        <button onClick={() => nav('/transactions/new')}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          新增交易
        </button>
      </div>

      {/* Filters - mobile: type tabs + collapsible filters */}
      <div className="space-y-2">
        {/* Type tabs - always visible */}
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          {['all', 'expense', 'income'].map(v => (
            <button key={v} onClick={() => { setTypeFilter(v); setPage(1) }}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${typeFilter === v ? 'bg-accent text-accent-foreground' : 'text-text-secondary hover:text-text'}`}>
              {{ all: '全部', expense: '支出', income: '收入' }[v]}
            </button>
          ))}
        </div>
        {/* Collapsible filters */}
        <MobileFilterToggle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="">全部分类</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="">全部账户</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="搜索备注..."
              className="col-span-2 lg:col-span-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
        </MobileFilterToggle>
      </div>

      {/* Table - desktop */}
      <div className="hidden lg:block bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary">
              <th className="text-left px-4 py-3 font-medium">日期</th>
              <th className="text-left px-4 py-3 font-medium">类型</th>
              <th className="text-left px-4 py-3 font-medium">分类</th>
              <th className="text-left px-4 py-3 font-medium">账户</th>
              <th className="text-left px-4 py-3 font-medium">备注</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((t: any) => {
              const { sign, amount, color } = amountDisplay(t)
              return (
                <tr key={t.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">{t.date?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                      {t.type === 'income' ? '收入' : '支出'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.category?.name || t.category_name || '-'}</td>
                  <td className="px-4 py-3">{t.account?.name || t.account_name || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.note || '-'}</td>
                  <td className={`px-4 py-3 text-right font-semibold money ${color}`}>{sign}{formatMoney(amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* List - mobile */}
      <div className="lg:hidden bg-surface rounded-xl border border-border divide-y divide-border">
        {items.map((t: any) => {
          const { sign, amount, color } = amountDisplay(t)
          return (
            <div key={t.id} className="flex items-center px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                {t.type === 'income' ? '收' : '支'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.note || t.category?.name || t.category_name}</div>
                <div className="text-xs text-text-secondary">{t.category?.name || t.category_name} - {t.date?.slice(0, 10)}</div>
              </div>
              <div className={`text-sm font-semibold money shrink-0 ${color}`}>{sign}{formatMoney(amount)}</div>
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无交易记录</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 transition-colors">上一页</button>
          <span className="text-text-secondary">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 transition-colors">下一页</button>
        </div>
      )}
    </div>
  )
}
