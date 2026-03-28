import { formatMoney, formatDate } from '../lib/utils'

const mockSubs = [
  { id: 1, name: 'iCloud+', amount: 600, category: '工具', cycle: 'monthly', next_date: '2026-04-01', active: true },
  { id: 2, name: 'Netflix', amount: 6000, category: '娱乐', cycle: 'monthly', next_date: '2026-04-05', active: true },
  { id: 3, name: 'ChatGPT Plus', amount: 14000, category: '工具', cycle: 'monthly', next_date: '2026-04-10', active: true },
  { id: 4, name: 'Spotify', amount: 4800, category: '娱乐', cycle: 'monthly', next_date: '2026-04-15', active: true },
  { id: 5, name: '年度会员', amount: 19800, category: '购物', cycle: 'yearly', next_date: '2027-01-01', active: true },
]

const cycleLabel: Record<string, string> = { monthly: '月付', yearly: '年付', weekly: '周付' }

export default function Subscriptions() {
  const activeSubs = mockSubs.filter(s => s.active)
  const totalMonthly = activeSubs.reduce((s, sub) => {
    return s + (sub.cycle === 'monthly' ? sub.amount : sub.cycle === 'yearly' ? Math.round(sub.amount / 12) : sub.amount * 4)
  }, 0)
  const totalYearly = totalMonthly * 12

  // Upcoming (within 7 days)
  const upcoming = mockSubs.filter(s => {
    const diff = new Date(s.next_date).getTime() - new Date().getTime()
    return diff > 0 && diff < 7 * 86400000
  })

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {upcoming.length > 0 && (
        <div className="bg-expense/5 border border-expense/20 rounded-xl p-4">
          <div className="text-sm font-medium text-expense mb-2">即将到期 ({upcoming.length})</div>
          <div className="space-y-1">
            {upcoming.map(s => (
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
        {mockSubs.map(s => (
          <div key={s.id} className="flex items-center px-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {s.category} - {cycleLabel[s.cycle]} - 下次: {s.next_date}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-expense">{formatMoney(s.amount)}</div>
              <div className={`text-xs mt-0.5 ${s.active ? 'text-income' : 'text-text-secondary'}`}>
                {s.active ? '生效中' : '已暂停'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
