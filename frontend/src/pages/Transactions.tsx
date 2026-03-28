import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

const PAGE_SIZE = 20

export default function Transactions() {
  const nav = useNavigate()
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [typeFilter, search])

  useEffect(() => {
    loadTransactions()
  }, [page, typeFilter, search])

  async function loadTransactions() {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) }
      if (typeFilter !== 'all') params.type = typeFilter
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

  if (loading && items.length === 0) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-text-secondary">共 {total} 条记录</div>
        <button onClick={() => nav('/transactions/new')}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          新增交易
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          {['all', 'expense', 'income'].map(v => (
            <button key={v} onClick={() => { setTypeFilter(v); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${typeFilter === v ? 'bg-accent text-white' : 'text-text-secondary hover:text-text'}`}>
              {{ all: '全部', expense: '支出', income: '收入' }[v]}
            </button>
          ))}
        </div>
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
            {items.map((t: any) => (
              <tr key={t.id} className="hover:bg-bg/50">
                <td className="px-4 py-3">{t.date?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                    {t.type === 'income' ? '收入' : '支出'}
                  </span>
                </td>
                <td className="px-4 py-3">{t.category?.name || t.category_name || '-'}</td>
                <td className="px-4 py-3">{t.account?.name || t.account_name || '-'}</td>
                <td className="px-4 py-3 text-text-secondary">{t.note || '-'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* List - mobile */}
      <div className="lg:hidden bg-surface rounded-xl border border-border divide-y divide-border">
        {items.map((t: any) => (
          <div key={t.id} className="flex items-center px-4 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
              {t.type === 'income' ? '收' : '支'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.note || t.category?.name || t.category_name}</div>
              <div className="text-xs text-text-secondary">{t.category?.name || t.category_name} - {t.date?.slice(0, 10)}</div>
            </div>
            <div className={`text-sm font-semibold shrink-0 ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
              {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无交易记录</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-border/50 disabled:opacity-40">上一页</button>
          <span className="text-text-secondary">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-border/50 disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  )
}
