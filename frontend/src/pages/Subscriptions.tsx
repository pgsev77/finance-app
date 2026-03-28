import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

const cycleLabel: Record<string, string> = { monthly: '月付', yearly: '年付', weekly: '周付' }

export default function Subscriptions() {
  const [subs, setSubs] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [subRes, upcomingRes] = await Promise.all([
        api.getSubscriptions(),
        api.getUpcomingSubscriptions(7),
      ])
      setSubs(Array.isArray(subRes) ? subRes : [])
      setUpcoming(Array.isArray(upcomingRes) ? upcomingRes : [])
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  const activeSubs = subs.filter((s: any) => s.is_active !== false)
  const totalMonthly = activeSubs.reduce((s: number, sub: any) => {
    return s + (sub.cycle === 'monthly' ? sub.amount : sub.cycle === 'yearly' ? Math.round(sub.amount / 12) : sub.amount * 4)
  }, 0)
  const totalYearly = totalMonthly * 12

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {upcoming.length > 0 && (
        <div className="bg-expense/5 border border-expense/20 rounded-xl p-4">
          <div className="text-sm font-medium text-expense mb-2">即将到期 ({upcoming.length})</div>
          <div className="space-y-1">
            {upcoming.map((s: any) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-text-secondary">{formatMoney(s.amount)} - {s.next_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary">月均订阅</div>
          <div className="text-lg font-bold text-expense mt-1">{formatMoney(totalMonthly)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary">年度预估</div>
          <div className="text-lg font-bold text-expense mt-1">{formatMoney(totalYearly)}</div>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-border divide-y divide-border">
        {subs.map((s: any) => (
          <div key={s.id} className="flex items-center px-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {s.category || '-'} - {cycleLabel[s.cycle] || s.cycle} - 下次: {s.next_date}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-expense">{formatMoney(s.amount)}</div>
              <div className={`text-xs mt-0.5 ${s.is_active !== false ? 'text-income' : 'text-text-secondary'}`}>
                {s.is_active !== false ? '生效中' : '已暂停'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {subs.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无订阅</div>
      )}
    </div>
  )
}
