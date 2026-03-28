import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney, formatDate } from '../lib/utils'

const mockAll = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  type: i % 5 === 0 ? 'income' as const : 'expense' as const,
  amount: i % 5 === 0 ? Math.floor(Math.random() * 100000) : -Math.floor(Math.random() * 20000),
  category: ['餐饮', '交通', '购物', '娱乐', '工资', '理财'][i % 6],
  account: ['微信', '支付宝', '银行卡', '信用卡'][i % 4],
  note: ['午餐', '地铁', '网购', '电影票', '月薪', '利息'][i % 6],
  date: `2026-03-${String(Math.max(1, 28 - i)).padStart(2, '0')}`,
}))

const PAGE_SIZE = 10

export default function Transactions() {
  const nav = useNavigate()
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  let items = mockAll
  if (typeFilter !== 'all') items = items.filter(t => t.type === typeFilter)
  if (search) items = items.filter(t => t.note.includes(search) || t.category.includes(search))

  const total = items.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
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
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="搜索备注或分类..."
          className="flex-1 min-w-[200px] px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
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
            {paged.map(t => (
              <tr key={t.id} className="hover:bg-bg/50">
                <td className="px-4 py-3">{t.date}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                    {t.type === 'income' ? '收入' : '支出'}
                  </span>
                </td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3">{t.account}</td>
                <td className="px-4 py-3 text-text-secondary">{t.note}</td>
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
        {paged.map(t => (
          <div key={t.id} className="flex items-center px-4 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
              {t.type === 'income' ? '收' : '支'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.note || t.category}</div>
              <div className="text-xs text-text-secondary">{t.category} - {t.account} - {t.date}</div>
            </div>
            <div className={`text-sm font-semibold shrink-0 ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
              {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
            </div>
          </div>
        ))}
      </div>

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
