import { useState } from 'react'
import { formatMoney } from '../lib/utils'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const mockReport = {
  month: '2026-03',
  income: 50000,
  expense: 31200,
  balance: 18800,
  categories: [
    { name: '餐饮', amount: 8500, color: '#ea4335' },
    { name: '交通', amount: 3200, color: '#fbbc04' },
    { name: '购物', amount: 12000, color: '#4285f4' },
    { name: '娱乐', amount: 4500, color: '#34a853' },
    { name: '居住', amount: 2500, color: '#ab47bc' },
    { name: '其他', amount: 500, color: '#78909c' },
  ],
  trend: [
    { month: '10月', income: 45000, expense: 28000 },
    { month: '11月', income: 50000, expense: 35000 },
    { month: '12月', income: 48000, expense: 30000 },
    { month: '1月', income: 52000, expense: 32000 },
    { month: '2月', income: 50000, expense: 31200 },
    { month: '3月', income: 50000, expense: 31200 },
  ],
}

const INCOME_COLORS = ['#4aaa7a', '#81c784', '#a5d6a7', '#66bb6a', '#43a047', '#2e7d32']

export default function Reports() {
  const r = mockReport

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary">总收入</div>
          <div className="text-lg font-bold text-income mt-1">+{formatMoney(r.income)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary">总支出</div>
          <div className="text-lg font-bold text-expense mt-1">-{formatMoney(r.expense)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary">结余</div>
          <div className={`text-lg font-bold mt-1 ${r.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            {r.balance >= 0 ? '+' : ''}{formatMoney(r.balance)}
          </div>
        </div>
      </div>

      {/* Pie chart */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-4">支出分类占比</h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={r.categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                {r.categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category ranking */}
      <div className="bg-surface rounded-xl border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">支出排行</h2>
        </div>
        <div className="divide-y divide-border">
          {r.categories.sort((a, b) => b.amount - a.amount).map((c, i) => {
            const pct = Math.round((c.amount / r.expense) * 100)
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

      {/* Trend bar chart */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-4">收支趋势</h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickFormatter={(v: number) => `${v / 10000}w`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="income" name="收入" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
