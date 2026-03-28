import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/utils'
import { api } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ArrowLeftRight, Plus, CreditCard } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction, Subscription } from '@/types'

export default function Dashboard() {
  const nav = useNavigate()
  const [totalAssets, setTotalAssets] = useState(0)
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [txns, setTxns] = useState<Transaction[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])
  const [trend, setTrend] = useState<{ date: string; income: number; expense: number }[]>([])
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
      const accs = Array.isArray(accountsRes) ? accountsRes : []
      const total = accs.filter(a => a.is_active !== false).reduce((s, a) => s + (a.balance || 0), 0)
      setTotalAssets(total)

      // 7-day trend from transactions
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      const dailyTxns = await api.getTransactions({
        start_date: weekAgo.toISOString().slice(0, 10),
        end_date: now.toISOString().slice(0, 10),
        page: '1',
        page_size: '200',
      })
      const dailyMap: Record<string, { income: number; expense: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dailyMap[key] = { income: 0, expense: 0 }
      }
      ;(dailyTxns.items || []).forEach(t => {
        const key = t.date?.slice(0, 10)
        if (key && dailyMap[key]) {
          if (t.type === 'income') dailyMap[key].income += Math.abs(t.amount || 0)
          else dailyMap[key].expense += Math.abs(t.amount || 0)
        }
      })
      setTrend(Object.entries(dailyMap).map(([date, vals]) => ({
        date: date.slice(5),
        ...vals,
      })))
    } catch { /* toast handled by api */ } finally {
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
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="bg-surface rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
        <div className="bg-surface rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-24" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-24 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-surface rounded-xl border border-border p-3.5 lg:p-5 hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="text-xs lg:text-sm text-text-secondary">{c.label}</div>
            <div className={`text-lg lg:text-2xl font-bold money mt-0.5 lg:mt-1 ${c.color}`}>
              {c.label === '本月支出' ? '-' : c.value >= 0 && c.label !== '总资产' ? '+' : ''}{formatMoney(c.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Quick add button */}
      <button onClick={() => nav('/transactions/new')}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />
        快速记账
      </button>

      {/* 7-day trend */}
      {trend.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4 hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-semibold mb-4">7天收支趋势</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${v / 100}`} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Area type="monotone" dataKey="income" name="收入" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.1} />
                <Area type="monotone" dataKey="expense" name="支出" stroke="var(--color-expense)" fill="var(--color-expense)" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subscription alert */}
      {subs.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 hover:border-accent/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <CreditCard className="w-4 h-4" />
              订阅提醒
            </div>
            <button onClick={() => nav('/subscriptions')} className="text-xs text-accent hover:underline">查看全部</button>
          </div>
          <div className="space-y-2">
            {subs.filter(s => s.status === 'active' || s.status === 'trial').slice(0, 5).map(s => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-text-secondary money">{formatMoney(s.amount)} / {s.next_date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-surface rounded-xl border border-border hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">最近交易</h2>
          <button onClick={() => nav('/transactions')} className="text-xs text-accent hover:underline">查看全部</button>
        </div>
        {txns.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="暂无交易记录"
            description="开始记录你的第一笔收支"
            action={{ label: '立即记账', onClick: () => nav('/transactions/new') }}
          />
        ) : (
          <div className="divide-y divide-border">
            {txns.map(t => {
              const isIncome = t.type === 'income'
              return (
                <div key={t.id} className="flex items-center px-4 py-3 hover:bg-surface-hover transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                    {isIncome ? '收' : '支'}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.note || t.category_name || '未分类'}</div>
                    <div className="text-xs text-text-secondary">{t.category_name} · {t.date?.slice(5)}</div>
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
