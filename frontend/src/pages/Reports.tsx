import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/utils'
import { api } from '../api'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonthlyReport, TrendPoint } from '@/types'

const COLORS = ['#ea4335', '#fbbc04', '#4285f4', '#34a853', '#ab47bc', '#78909c', '#ff7043', '#26a69a']

export default function Reports() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [year, month])

  async function loadReport() {
    setLoading(true)
    try {
      const [monthlyRes, trendRes] = await Promise.all([
        api.getMonthlyReport(year, month),
        api.getTrend(6),
      ])
      setMonthly(monthlyRes)
      setTrend(Array.isArray(trendRes) ? trendRes : [])
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex justify-center"><Skeleton className="h-6 w-32" /></div>
        <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!monthly) {
    return (
      <EmptyState icon={BarChart3} title="暂无报表数据" description="记录交易后即可查看月度报表" />
    )
  }

  const categories = (monthly.by_category || []).map((c: any, i: number) => ({
    name: c.category,
    amount: c.amount,
    color: COLORS[i % COLORS.length],
  }))
  const sortedCats = [...categories].sort((a, b) => b.amount - a.amount)
  const trendData = trend.map((t: any) => ({
    month: t.month?.slice(5) || t.month,
    income: t.income,
    expense: t.expense,
  }))

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Month picker */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold min-w-[120px] text-center">{year}年{month}月</span>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1 lg:sm:grid-cols-3 lg:gap-4">
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5 hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-xs lg:text-sm text-text-secondary">总收入</div>
          <div className="text-base lg:text-2xl font-bold text-income mt-0.5 lg:mt-1">+{formatMoney(monthly.total_income)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5 hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-xs lg:text-sm text-text-secondary">总支出</div>
          <div className="text-base lg:text-2xl font-bold text-expense mt-0.5 lg:mt-1">-{formatMoney(monthly.total_expense)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5 hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-xs lg:text-sm text-text-secondary">结余</div>
          <div className={`text-base lg:text-2xl font-bold mt-0.5 lg:mt-1 ${(monthly.balance || 0) >= 0 ? 'text-income' : 'text-expense'}`}>
            {(monthly.balance || 0) >= 0 ? '+' : ''}{formatMoney(monthly.balance)}
          </div>
        </div>
      </div>

      {/* Pie chart */}
      {categories.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-4">支出分类占比</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                  {categories.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category ranking */}
      {sortedCats.length > 0 && (
        <div className="bg-surface rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">支出排行</h2>
          </div>
          <div className="divide-y divide-border">
            {sortedCats.map((c, i) => {
              const pct = monthly.total_expense > 0 ? Math.round((c.amount / monthly.total_expense) * 100) : 0
              return (
                <div key={c.name} className="px-4 py-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{i + 1}. {c.name}</span>
                    <span className="text-text-secondary">{formatMoney(c.amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trend bar chart */}
      {trendData.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-4">收支趋势</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(v: number) => `${v / 10000}w`} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {categories.length === 0 && trendData.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无报表数据</div>
      )}
    </div>
  )
}
