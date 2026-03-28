import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

export default function Dashboard() {
  const nav = useNavigate()
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [txns, setTxns] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [txnRes, subRes, trendRes] = await Promise.all([
        api.getTransactions({ page: '1', page_size: '5' }),
        api.getSubscriptions(),
        api.getTrend(1),
      ])
      setTxns(txnRes.items || [])
      setSubs(subRes || [])
      // 用当月趋势数据
      const current = trendRes?.[0]
      if (current) {
        setIncome(current.income || 0)
        setExpense(current.expense || 0)
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  const balance = income - expense

  const cards = [
    { label: '本月收入', value: income, color: 'text-income' },
    { label: '本月支出', value: expense, color: 'text-expense' },
    { label: '本月结余', value: balance, color: balance >= 0 ? 'text-income' : 'text-expense' },
  ]

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-surface rounded-xl border border-border p-4">
            <div className="text-xs text-text-secondary mb-1">{c.label}</div>
            <div className={`text-lg font-bold ${c.color}`}>
              {c.value >= 0 ? '+' : ''}{formatMoney(c.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Subscription alert */}
      {subs.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <div className="text-sm font-medium text-accent mb-2">订阅提醒</div>
          <div className="space-y-2">
            {subs.slice(0, 2).map((s: any) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-text-secondary">{formatMoney(s.amount)} / {s.next_date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-surface rounded-xl border border-border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">最近交易</h2>
          <button onClick={() => nav('/transactions')} className="text-xs text-accent hover:underline">查看全部</button>
        </div>
        {txns.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-secondary">暂无交易记录</div>
        ) : (
          <div className="divide-y divide-border">
            {txns.map((t: any) => (
              <div key={t.id} className="flex items-center px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                  {t.type === 'income' ? '收' : '支'}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.note || t.category?.name || t.category_name}</div>
                  <div className="text-xs text-text-secondary">{t.category?.name || t.category_name} - {t.account?.name || t.account_name}</div>
                </div>
                <div className={`text-sm font-semibold ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
