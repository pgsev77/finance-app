import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Plus, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/useDebounce'
import type { Transaction, Category, Account } from '@/types'

const PAGE_SIZE = 20
const typeLabels: Record<string, string> = { income: '收入', expense: '支出', transfer: '转账' }

function MobileFilterToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors lg:hidden">
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
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
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  useEffect(() => {
    api.getCategories().then(c => setCategories(Array.isArray(c) ? c : [])).catch(() => {})
    api.getAccounts().then(a => setAccounts(Array.isArray(a) ? a : [])).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [typeFilter, categoryFilter, accountFilter, monthFilter, debouncedSearch])

  useEffect(() => {
    loadTransactions()
  }, [page, typeFilter, categoryFilter, accountFilter, monthFilter, debouncedSearch])

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
      if (debouncedSearch) params.search = debouncedSearch
      const data = await api.getTransactions(params)
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch { /* toast handled by api */ } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.deleteTransaction(deleteTarget.id)
      toast.success('交易已删除')
      setDeleteTarget(null)
      await loadTransactions()
    } catch { /* toast handled by api */ }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const amountDisplay = (t: Transaction) => {
    const isIncome = t.type === 'income'
    const amt = Math.abs(t.amount || 0)
    return { sign: isIncome ? '+' : '-', amount: amt, color: isIncome ? 'text-income' : 'text-expense' }
  }

  if (loading && items.length === 0) {
    return (
      <div className="space-y-3 lg:space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32 mb-1.5" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">共 {total} 条记录</div>
        <Button onClick={() => nav('/transactions/new')} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增交易
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex bg-surface border border-border rounded-xl overflow-hidden">
          {['all', 'expense', 'income'].map(v => (
            <button key={v} onClick={() => { setTypeFilter(v); setPage(1) }}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${typeFilter === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {{ all: '全部', expense: '支出', income: '收入' }[v]}
            </button>
          ))}
        </div>
        <MobileFilterToggle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="">全部分类</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="">全部账户</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}
              className="col-span-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索备注..."
              className="col-span-2 lg:col-span-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
        </MobileFilterToggle>
      </div>

      {/* Table - desktop */}
      <div className="hidden lg:block bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">日期</th>
              <th className="text-left px-4 py-3 font-medium">类型</th>
              <th className="text-left px-4 py-3 font-medium">分类</th>
              <th className="text-left px-4 py-3 font-medium">账户</th>
              <th className="text-left px-4 py-3 font-medium">备注</th>
              <th className="text-right px-4 py-3 font-medium">金额</th>
              <th className="text-right px-4 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(t => {
              const { sign, amount, color } = amountDisplay(t)
              return (
                <tr key={t.id} className="hover:bg-surface-hover transition-colors group">
                  <td className="px-4 py-3">{t.date?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-income/10 text-income' : t.type === 'transfer' ? 'bg-accent/10 text-accent' : 'bg-expense/10 text-expense'}`}>
                      {typeLabels[t.type] || t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.category_name || '-'}</td>
                  <td className="px-4 py-3">{t.account_name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{t.note || '-'}</td>
                  <td className={`px-4 py-3 text-right font-semibold money ${color}`}>{sign}{formatMoney(amount)}</td>
                  <td className="px-2 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDeleteTarget(t)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* List - mobile */}
      <div className="lg:hidden bg-surface rounded-xl border border-border divide-y divide-border">
        {items.map(t => {
          const { sign, amount, color } = amountDisplay(t)
          return (
            <div key={t.id} className="flex items-center px-4 py-3 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.type === 'income' ? 'bg-income/10 text-income' : t.type === 'transfer' ? 'bg-accent/10 text-accent' : 'bg-expense/10 text-expense'}`}>
                {t.type === 'income' ? '收' : t.type === 'transfer' ? '转' : '支'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.note || t.category_name || '未分类'}</div>
                <div className="text-xs text-muted-foreground">{t.category_name || t.type} · {t.date?.slice(5)}</div>
              </div>
              <div className={`text-sm font-semibold money shrink-0 ${color}`}>{sign}{formatMoney(amount)}</div>
              <button onClick={() => setDeleteTarget(t)} className="ml-2 p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {items.length === 0 && !loading && (
        <EmptyState
          icon={ArrowLeftRight}
          title="暂无交易记录"
          description="试试调整筛选条件或记录一笔新交易"
          action={{ label: '立即记账', onClick: () => nav('/transactions/new') }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
          <span className="text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>下一页</Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            确定要删除这笔{deleteTarget?.type === 'income' ? '收入' : '支出'}交易吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
