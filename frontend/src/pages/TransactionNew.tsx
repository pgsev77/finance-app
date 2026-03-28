import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { todayStr } from '../lib/utils'

export default function NewTransaction() {
  const nav = useNavigate()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = type === 'expense'
    ? [{ id: '1', name: '餐饮' }, { id: '2', name: '交通' }, { id: '3', name: '购物' }, { id: '4', name: '娱乐' }, { id: '5', name: '居住' }, { id: '6', name: '医疗' }]
    : [{ id: '10', name: '工资' }, { id: '11', name: '理财' }, { id: '12', name: '兼职' }, { id: '13', name: '红包' }]

  const accounts = [
    { id: '1', name: '微信' }, { id: '2', name: '支付宝' }, { id: '3', name: '银行卡' }, { id: '4', name: '信用卡' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setError('请输入有效金额'); return }
    if (!categoryId) { setError('请选择分类'); return }
    if (!accountId) { setError('请选择账户'); return }
    setError('')
    setLoading(true)
    try {
      // await api.createTransaction({ type, amount: Math.round(Number(amount) * 100), category_id: Number(categoryId), account_id: Number(accountId), date, note })
      setLoading(false)
      nav('/transactions', { replace: true })
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-5">
        {/* Type toggle */}
        <div className="flex bg-bg rounded-lg p-1">
          <button type="button" onClick={() => { setType('expense'); setCategoryId('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'expense' ? 'bg-expense text-white' : 'text-text-secondary'}`}>
            支出
          </button>
          <button type="button" onClick={() => { setType('income'); setCategoryId('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'income' ? 'bg-income text-white' : 'text-text-secondary'}`}>
            收入
          </button>
        </div>

        {error && <div className="text-sm text-expense bg-expense/10 rounded-lg px-3 py-2">{error}</div>}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1.5">金额 (元)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">分类</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(c => (
              <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${categoryId === c.id ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <label className="block text-sm font-medium mb-2">账户</label>
          <div className="grid grid-cols-4 gap-2">
            {accounts.map(a => (
              <button key={a.id} type="button" onClick={() => setAccountId(a.id)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${accountId === a.id ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-text-secondary hover:border-accent/50'}`}>
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1.5">日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1.5">备注</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="可选"
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {loading ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  )
}
