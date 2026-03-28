import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

const cycleOptions = [
  { value: 'weekly', label: '周付' },
  { value: 'monthly', label: '月付' },
  { value: 'yearly', label: '年付' },
]
const cycleLabel: Record<string, string> = { monthly: '月付', yearly: '年付', weekly: '周付' }

const emptyForm = { name: '', amount: '', category_id: '', account_id: '', cycle: 'monthly', next_date: '', note: '' }

export default function Subscriptions() {
  const [subs, setSubs] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [accs, setAccs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    loadData()
    api.getCategories().then(c => setCategories(Array.isArray(c) ? c : [])).catch(() => {})
    api.getAccounts().then(a => setAccs(Array.isArray(a) ? a : [])).catch(() => {})
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

  function openEdit(s: any) {
    setEditing(s.id)
    setForm({
      name: s.name || '',
      amount: String((s.amount || 0) / 100),
      category_id: s.category_id ? String(s.category_id) : '',
      account_id: s.account_id ? String(s.account_id) : '',
      cycle: s.cycle || 'monthly',
      next_date: s.next_date?.slice(0, 10) || '',
      note: s.note || '',
    })
    setShowForm(true)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, next_date: new Date().toISOString().slice(0, 10) })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.amount || !form.next_date) return
    const payload: any = {
      name: form.name,
      amount: Math.round(Number(form.amount) * 100),
      cycle: form.cycle,
      next_date: form.next_date,
    }
    if (form.category_id) payload.category_id = Number(form.category_id)
    if (form.account_id) payload.account_id = Number(form.account_id)
    if (form.note) payload.note = form.note

    try {
      if (editing) {
        await api.updateSubscription(editing, payload)
      } else {
        await api.createSubscription(payload)
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditing(null)
      await loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此订阅？')) return
    try {
      await api.deleteSubscription(id)
      await loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function handleToggleActive(s: any) {
    try {
      await api.updateSubscription(s.id, { is_active: s.is_active === false })
      await loadData()
    } catch (err: any) {
      alert(err.message)
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="text-sm text-text-secondary">月均订阅</div>
          <div className="text-2xl font-bold text-expense money mt-1">{formatMoney(totalMonthly)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="text-sm text-text-secondary">年度预估</div>
          <div className="text-2xl font-bold text-expense money mt-1">{formatMoney(totalYearly)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="text-sm text-text-secondary">订阅数量</div>
          <div className="text-2xl font-bold text-text mt-1">{activeSubs.length}</div>
        </div>
      </div>

      {/* Add button */}
      <button onClick={openAdd}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors">
        + 新增订阅
      </button>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-surface rounded-xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-semibold">{editing ? '编辑订阅' : '新增订阅'}</h3>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="订阅名称"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="金额 (元)"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <select value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                {cycleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" value={form.next_date} onChange={e => setForm({ ...form, next_date: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">选择分类 (可选)</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">选择账户 (可选)</option>
                {accs.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="备注 (可选)"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-surface-hover transition-colors">取消</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-surface rounded-xl border border-border divide-y divide-border">
        {subs.map((s: any) => (
          <div key={s.id} className="flex items-center px-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {s.category || '-'} - {cycleLabel[s.cycle] || s.cycle} - 下次: {s.next_date?.slice(5)}
              </div>
            </div>
            <div className="text-right shrink-0 mr-3">
              <div className="text-sm font-semibold text-expense money">{formatMoney(s.amount)}</div>
              <div className={`text-xs mt-0.5 ${s.is_active !== false ? 'text-income' : 'text-text-secondary'}`}>
                {s.is_active !== false ? '生效中' : '已暂停'}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => handleToggleActive(s)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text transition-colors" title={s.is_active !== false ? '暂停' : '启用'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.is_active !== false ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md hover:bg-expense/10 text-text-secondary hover:text-expense transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
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
