import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const nav = useNavigate()
  const [totalAssets, setTotalAssets] = useState(0)
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [txns, setTxns] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [txnRes, subRes, trendRes, accountsRes] = await Promise.all([
        api.getTransactions({ page: '1', page_size: '5' }),
        api.getSubscriptions(),
        api.getTrend(1),
        api.getAccounts(),
      ])
      setTxns(txnRes.items || [])
      setSubs(subRes || [])
      const current = trendRes?.[0]
      if (current) {
        setIncome(current.income || 0)
        setExpense(current.expense || 0)
      }
      // Total assets from accounts
      const accs = Array.isArray(accountsRes) ? accountsRes : []
      const total = accs.filter((a: any) => a.is_active !== false).reduce((s: number, a: any) => s + (a.balance || 0), 0)
      setTotalAssets(total)
      // 7-day trend
      const trend7 = await api.getTrend(1)
      // Get daily trend from the monthly data - we need a daily endpoint
      // Use transactions from last 7 days for now
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      const dailyTxns = await api.getTransactions({
        start_date: weekAgo.toISOString().slice(0, 10),
        end_date: now.toISOString().slice(0, 10),
        page: '1',
        page_size: '200',
      })
      // Group by date
      const dailyMap: Record<string, { income: number; expense: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dailyMap[key] = { income: 0, expense: 0 }
      }
      ;(dailyTxns.items || []).forEach((t: any) => {
        const key = t.date?.slice(0, 10)
        if (dailyMap[key]) {
          if (t.type === 'income') dailyMap[key].income += Math.abs(t.amount || 0)
          else dailyMap[key].expense += Math.abs(t.amount || 0)
        }
      })
      setTrend(Object.entries(dailyMap).map(([date, vals]) => ({
        date: date.slice(5),
        ...vals,
      })))
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  const balance = income - expense

  const cards = [
    { label: '总资产', value: totalAssets, color: 'text-accent' },
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-surface rounded-xl border border-border p-5 hover:border-border-bright hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-none transition-all">
            <div className="text-sm text-text-secondary">{c.label}</div>
            <div className={`text-2xl font-bold money mt-1 ${c.color}`}>
              {c.value >= 0 && c.label !== '总资产' ? '+' : ''}{formatMoney(c.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Quick add button */}
      <button onClick={() => nav('/transactions/new')}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors">
        + 快速记账
      </button>

      {/* 7-day trend */}
      {trend.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-4">7天收支趋势</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(v: number) => `${v / 10000}`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Area type="monotone" dataKey="income" name="收入" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.1} />
                <Area type="monotone" dataKey="expense" name="支出" stroke="var(--color-expense)" fill="var(--color-expense)" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subscription alert */}
      {subs.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <div className="text-sm font-medium text-accent mb-2">订阅提醒</div>
          <div className="space-y-2">
            {subs.filter((s: any) => s.is_active !== false).slice(0, 3).map((s: any) => (
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
            {txns.map((t: any) => {
              const isIncome = t.type === 'income'
              return (
                <div key={t.id} className="flex items-center px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                    {isIncome ? '收' : '支'}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.note || t.category?.name || t.category_name}</div>
                    <div className="text-xs text-text-secondary">{t.category?.name || t.category_name} - {t.account?.name || t.account_name}</div>
                  </div>
                  <div className={`text-sm font-semibold money ${isIncome ? 'text-income' : 'text-expense'}`}>
                    {isIncome ? '+' : '-'}{formatMoney(Math.abs(t.amount || 0))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
