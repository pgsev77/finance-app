import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { todayStr } from '../lib/utils'
import { api } from '../api'
import { Button } from '@/components/ui/button'
import type { Category, Account } from '@/types'

type TxType = 'expense' | 'income' | 'transfer'

export default function NewTransaction() {
  const nav = useNavigate()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => { loadData() }, [type])

  async function loadData() {
    try {
      const [catRes, accRes] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
      ])
      const allCats = Array.isArray(catRes) ? catRes : []
      setCategories(allCats.filter(c => c.type === (type === 'transfer' ? 'expense' : type) && !c.parent_id))
      setAccounts(Array.isArray(accRes) ? accRes : [])
    } catch { /* toast handled by api */ }
  }

  function switchType(t: TxType) {
    setType(t)
    setCategoryId('')
    setToAccountId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setError('请输入有效金额'); return }
    if (type !== 'transfer' && !categoryId) { setError('请选择分类'); return }
    if (!accountId) { setError('请选择账户'); return }
    if (type === 'transfer' && !toAccountId) { setError('请选择转入账户'); return }
    if (type === 'transfer' && accountId === toAccountId) { setError('转出和转入账户不能相同'); return }
    setError('')
    setLoading(true)
    try {
      await api.createTransaction({
        type,
        amount: Math.round(Number(amount) * 100),
        category_id: type !== 'transfer' ? Number(categoryId) : undefined,
        account_id: Number(accountId),
        to_account_id: type === 'transfer' ? Number(toAccountId) : undefined,
        date,
        note,
      })
      nav('/transactions', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const typeConfig: { value: TxType; label: string; activeClass: string }[] = [
    { value: 'expense', label: '支出', activeClass: 'bg-expense text-white' },
    { value: 'income', label: '收入', activeClass: 'bg-income text-white' },
    { value: 'transfer', label: '转账', activeClass: 'bg-accent text-accent-foreground' },
  ]

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-5">
        {/* Type toggle */}
        <div className="flex bg-muted rounded-xl p-1">
          {typeConfig.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => switchType(t.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === t.value ? t.activeClass : 'text-muted-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="text-sm text-expense bg-expense/10 rounded-xl px-3 py-2.5 border border-expense/20">{error}</div>}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1.5">金额 (元)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-2xl font-bold text-center money focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>

        {/* Category (not for transfer) */}
        {type !== 'transfer' && (
          <div>
            <label className="block text-sm font-medium mb-2">分类</label>
            {categories.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {categories.map(c => (
                  <button key={c.id} type="button" onClick={() => setCategoryId(String(c.id))}
                    className={`px-3 py-2 text-sm rounded-xl border transition-colors ${categoryId === String(c.id) ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-2">暂无分类</div>
            )}
          </div>
        )}

        {/* Account (from) */}
        <div>
          <label className="block text-sm font-medium mb-2">{type === 'transfer' ? '转出账户' : '账户'}</label>
          {accounts.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {accounts.map(a => (
                <button key={a.id} type="button" onClick={() => setAccountId(String(a.id))}
                  className={`px-3 py-2 text-sm rounded-xl border transition-colors ${accountId === String(a.id) ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                  {a.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">暂无账户</div>
          )}
        </div>

        {/* To Account (transfer only) */}
        {type === 'transfer' && (
          <div>
            <label className="block text-sm font-medium mb-2">转入账户</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {accounts.filter(a => String(a.id) !== accountId).map(a => (
                <button key={a.id} type="button" onClick={() => setToAccountId(String(a.id))}
                  className={`px-3 py-2 text-sm rounded-xl border transition-colors ${toAccountId === String(a.id) ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1.5">日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1.5">备注</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="可选"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '保存中...' : '保存'}
        </Button>
      </form>
    </div>
  )
}
