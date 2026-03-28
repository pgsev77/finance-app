import { useState, useEffect } from 'react'
import { formatMoney, thisMonthRange } from '../lib/utils'
import { api } from '../api'

const typeIcons: Record<string, string> = { wechat: '微', alipay: '支', bank: '银', credit_card: '信', cash: '现' }
const typeColors: Record<string, string> = { wechat: 'bg-green-500/10 text-green-500', alipay: 'bg-blue-500/10 text-blue-500', bank: 'bg-red-500/10 text-red-500', credit_card: 'bg-orange-500/10 text-orange-500', cash: 'bg-yellow-600/10 text-yellow-600' }
const typeLabels: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '银行卡', credit_card: '信用卡', cash: '现金' }

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<Record<number, { income: number; expense: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '' })

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    setLoading(true)
    try {
      const data = await api.getAccounts()
      const accs = Array.isArray(data) ? data : []
      setAccounts(accs)
      // Fetch monthly stats per account
      const { start, end } = thisMonthRange()
      const allTxns = await api.getTransactions({ start_date: start, end_date: end, page: '1', page_size: '500' })
      const stats: Record<number, { income: number; expense: number }> = {}
      accs.forEach((a: any) => { stats[a.id] = { income: 0, expense: 0 } })
      ;(allTxns.items || []).forEach((t: any) => {
        const aid = t.account_id
        if (aid && stats[aid]) {
          const amt = Math.abs(t.amount || 0)
          if (t.type === 'income') stats[aid].income += amt
          else stats[aid].expense += amt
        }
      })
      setMonthlyStats(stats)
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.name) return
    try {
      await api.createAccount({
        name: form.name,
        type: form.type,
        balance: Math.round(Number(form.balance) * 100) || 0,
      })
      setForm({ name: '', type: 'bank', balance: '' })
      setShowAdd(false)
      await loadAccounts()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const activeAccounts = accounts.filter((a: any) => a.is_active !== false)
  const totalBalance = activeAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0)

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* Total banner */}
      <div className="bg-gradient-to-r from-accent to-accent-hover rounded-xl p-6 text-white">
        <div className="text-sm opacity-80">总资产</div>
        <div className="text-3xl font-bold mt-1">{formatMoney(totalBalance)}</div>
        <div className="text-sm opacity-70 mt-2">共 {activeAccounts.length} 个账户</div>
      </div>

      {/* Add button */}
      <button onClick={() => setShowAdd(!showAdd)}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors">
        {showAdd ? '取消' : '新增账户'}
      </button>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">账户名称</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" placeholder="如：招商银行" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">账户类型</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">初始余额 (元)</label>
            <input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" placeholder="0.00" />
          </div>
          <button onClick={handleCreate}
            className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover">
            确认添加
          </button>
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAccounts.map((a: any) => (
          <div key={a.id} className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${typeColors[a.type] || 'bg-gray-500/10 text-gray-500'}`}>
                {typeIcons[a.type] || '?'}
              </div>
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-text-secondary">{typeLabels[a.type] || a.type}</div>
              </div>
            </div>
            <div className={`mt-4 text-xl font-bold money ${(a.balance || 0) >= 0 ? 'text-text' : 'text-expense'}`}>
              {(a.balance || 0) >= 0 ? '' : '-'}{formatMoney(Math.abs(a.balance || 0))}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-income">收入 {formatMoney(monthlyStats[a.id]?.income || 0)}</span>
              <span className="text-expense">支出 {formatMoney(monthlyStats[a.id]?.expense || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      {activeAccounts.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无账户，点击上方按钮添加</div>
      )}
    </div>
  )
}
