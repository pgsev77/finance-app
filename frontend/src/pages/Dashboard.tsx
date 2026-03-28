import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney, formatDateTime } from '../lib/utils'

// Mock data
const mockTransactions = [
  { id: 1, type: 'expense', amount: -3500, category: '餐饮', account: '微信', note: '午餐', date: '2026-03-28T12:00:00' },
  { id: 2, type: 'income', amount: 50000, category: '工资', account: '银行卡', note: '3月工资', date: '2026-03-25T09:00:00' },
  { id: 3, type: 'expense', amount: -8900, category: '交通', account: '支付宝', note: '加油', date: '2026-03-24T15:30:00' },
  { id: 4, type: 'expense', amount: -12000, category: '购物', account: '信用卡', note: '日用品', date: '2026-03-23T20:00:00' },
  { id: 5, type: 'expense', amount: -6800, category: '娱乐', account: '微信', note: '电影', date: '2026-03-22T19:00:00' },
]

const mockSubs = [
  { id: 1, name: 'iCloud+', amount: 6, next_date: '2026-04-01' },
  { id: 2, name: 'Netflix', amount: 60, next_date: '2026-04-05' },
]

export default function Dashboard() {
  const nav = useNavigate()
  const [income, setIncome] = useState(50000)
  const [expense, setExpense] = useState(31200)
  const [txns, setTxns] = useState(mockTransactions)
  const [subs, setSubs] = useState(mockSubs)

  const balance = income - expense

  const cards = [
    { label: '本月收入', value: income, color: 'text-income' },
    { label: '本月支出', value: expense, color: 'text-expense' },
    { label: '本月结余', value: balance, color: balance >= 0 ? 'text-income' : 'text-expense' },
  ]

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
            {subs.slice(0, 2).map(s => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-text-secondary">{formatMoney(s.amount * 100)} / {s.next_date.slice(5)}</span>
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
        <div className="divide-y divide-border">
          {txns.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                {t.type === 'income' ? '收' : '支'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.note || t.category}</div>
                <div className="text-xs text-text-secondary">{t.category} - {t.account}</div>
              </div>
              <div className={`text-sm font-semibold ${t.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
