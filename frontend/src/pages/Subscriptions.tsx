import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/utils'
import { api } from '../api'

const cycleOptions = [
  { value: 'weekly', label: '周付', sub: '/周' },
  { value: 'monthly', label: '月付', sub: '/月' },
  { value: 'quarterly', label: '季付', sub: '/季' },
  { value: 'yearly', label: '年付', sub: '/年' },
  { value: 'custom', label: '自定义', sub: '' },
  { value: 'once', label: '一次性', sub: '' },
]
const cycleLabel: Record<string, string> = Object.fromEntries(cycleOptions.map(o => [o.value, o.label]))

const statusLabel: Record<string, string> = { trial: '试用中', active: '生效中', paused: '已暂停', cancelled: '已取消' }
const statusColor: Record<string, string> = { trial: 'text-accent', active: 'text-income', paused: 'text-text-secondary', cancelled: 'text-text-secondary' }

interface Summary {
  monthly_total: number
  yearly_total: number
  total_count?: number
  active_count?: number
  by_category: { category_id: number | null; category_name: string; icon?: string | null; color?: string | null; monthly_amount?: number; total?: number; count: number }[]
  upcoming: { id: number; name: string; amount: number; next_date: string; days_until?: number }[]
}

const emptyForm = {
  name: '', amount: '', subscription_category_id: '', account_id: '',
  cycle_type: 'monthly', cycle_days: '', next_date: '',
  trial_days: '', trial_start_date: '',
  auto_record: false, currency: 'CNY', note: ''
}

export default function Subscriptions() {
  const [subs, setSubs] = useState<any[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [subCategories, setSubCategories] = useState<any[]>([])
  const [_categories, _setCategories] = useState<unknown[]>([])
  const [accs, setAccs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    loadData()
    api.getSubscriptionCategories().then(c => setSubCategories(Array.isArray(c) ? c : [])).catch(() => {})
    api.getCategories().then(c => _setCategories(Array.isArray(c) ? c : [])).catch(() => {})
    api.getAccounts().then(a => setAccs(Array.isArray(a) ? a : [])).catch(() => {})
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [subRes, summaryRes] = await Promise.all([
        api.getSubscriptions(),
        api.getSubscriptionSummary().catch(() => null),
      ])
      setSubs(Array.isArray(subRes) ? subRes : [])
      if (summaryRes) setSummary(summaryRes)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  function openEdit(s: any) {
    setEditing(s.id)
    setForm({
      name: s.name || '',
      amount: String((s.amount || 0) / 100),
      subscription_category_id: s.subscription_category_id ? String(s.subscription_category_id) : '',
      account_id: s.account_id ? String(s.account_id) : '',
      cycle_type: s.cycle_type || 'monthly',
      cycle_days: s.cycle_days ? String(s.cycle_days) : '',
      next_date: s.next_date?.slice(0, 10) || '',
      trial_days: s.trial_days ? String(s.trial_days) : '',
      trial_start_date: s.trial_start_date?.slice(0, 10) || '',
      auto_record: s.auto_record || false,
      currency: s.currency || 'CNY',
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
      cycle_type: form.cycle_type,
      next_date: form.next_date,
      auto_record: form.auto_record,
      currency: form.currency,
    }
    if (form.subscription_category_id) payload.subscription_category_id = Number(form.subscription_category_id)
    if (form.account_id) payload.account_id = Number(form.account_id)
    if (form.cycle_type === 'custom' && form.cycle_days) payload.cycle_days = Number(form.cycle_days)
    if (form.trial_days) payload.trial_days = Number(form.trial_days)
    if (form.trial_start_date && form.trial_days) payload.trial_start_date = form.trial_start_date
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
    } catch { /* toast handled by api */ }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此订阅？')) return
    try { await api.deleteSubscription(id); await loadData() } catch { /* toast handled by api */ }
  }

  async function handleToggleActive(s: any) {
    const newStatus = s.status === 'paused' ? 'active' : 'paused'
    try { await api.updateSubscription(s.id, { status: newStatus }); await loadData() } catch { /* toast handled by api */ }
  }

  async function handleToggleAutoRecord(s: any) {
    try { await api.updateSubscription(s.id, { auto_record: !s.auto_record }); await loadData() } catch { /* toast handled by api */ }
  }

  function getTrialDaysLeft(s: any): number | null {
    if (s.status !== 'trial' || !s.trial_start_date || !s.trial_days) return null
    const start = new Date(s.trial_start_date)
    const end = new Date(start.getTime() + s.trial_days * 86400000)
    const left = Math.ceil((end.getTime() - Date.now()) / 86400000)
    return left > 0 ? left : 0
  }

  // 饼图颜色
  const pieColors = ['#b8860b', '#c8965a', '#34a853', '#ea4335', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#6366f1', '#10b981', '#64748b', '#ef4444']

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  const totalMonthly = summary?.monthly_total ?? 0
  const totalYearly = summary?.yearly_total ?? 0
  const activeCount = summary?.total_count ?? 0
  const upcoming = summary?.upcoming ?? []

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* 即将到期 */}
      {upcoming.length > 0 && (
        <div className="bg-expense/5 border border-expense/20 rounded-xl p-3.5 lg:p-4">
          <div className="text-sm font-medium text-expense mb-2">即将到期 ({upcoming.length})</div>
          <div className="space-y-1">
            {upcoming.map((s: any) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-text-secondary">{formatMoney(s.amount)} - {s.days_until === 0 ? '今天' : `${s.days_until}天后`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
          <div className="text-xs lg:text-sm text-text-secondary">月均订阅</div>
          <div className="text-sm lg:text-2xl font-bold text-expense money mt-0.5 lg:mt-1">{formatMoney(totalMonthly)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
          <div className="text-xs lg:text-sm text-text-secondary">年度预估</div>
          <div className="text-sm lg:text-2xl font-bold text-expense money mt-0.5 lg:mt-1">{formatMoney(totalYearly)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
          <div className="text-xs lg:text-sm text-text-secondary">订阅数量</div>
          <div className="text-sm lg:text-2xl font-bold text-text mt-0.5 lg:mt-1">{activeCount}</div>
        </div>
      </div>

      {/* 分类饼图 */}
      {summary?.by_category && summary.by_category.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4 lg:p-5">
          <div className="text-sm font-medium mb-3">分类占比</div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="shrink-0">
              <svg viewBox="0 0 100 100" className="w-28 h-28 lg:w-36 lg:h-36">
                {(() => {
                  const total = summary.by_category.reduce((s, c) => s + (c.monthly_amount ?? c.total ?? 0), 0)
                  let offset = 0
                  return summary.by_category.map((cat, i) => {
                    const amt = cat.monthly_amount ?? cat.total ?? 0
                    const pct = total > 0 ? amt / total : 0
                    const dasharray = `${pct * 100} ${100 - pct * 100}`
                    const el = <circle key={i} cx="50" cy="50" r="40" fill="none"
                      stroke={pieColors[i % pieColors.length]} strokeWidth="20"
                      strokeDasharray={dasharray} strokeDashoffset={-offset * 100}
                      transform="rotate(-90 50 50)" />
                    offset += pct
                    return el
                  })
                })()}
              </svg>
            </div>
            <div className="flex-1 space-y-1.5 overflow-x-auto">
              {summary.by_category.map((cat, i) => (
                <div key={cat.category_id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                    <span className="truncate">{cat.category_name}</span>
                    <span className="text-text-secondary">x{cat.count}</span>
                  </div>
                  <span className="money shrink-0">{formatMoney(cat.monthly_amount ?? cat.total ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 新增按钮 */}
      <button onClick={openAdd}
        className="w-full py-3 bg-accent text-accent-foreground rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors">
        + 新增订阅
      </button>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-surface rounded-xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold">{editing ? '编辑订阅' : '新增订阅'}</h3>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="订阅名称"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <div className="flex gap-2">
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="金额"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              {/* 可视化周期选择 */}
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">计费周期</label>
                <div className="flex flex-wrap gap-1.5">
                  {cycleOptions.map(o => (
                    <button key={o.value} type="button" onClick={() => setForm({ ...form, cycle_type: o.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.cycle_type === o.value
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-border hover:border-accent/50 text-text-secondary'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.cycle_type === 'custom' && (
                <input type="number" min="1" value={form.cycle_days} onChange={e => setForm({ ...form, cycle_days: e.target.value })} placeholder="自定义周期天数"
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              )}

              <input type="date" value={form.next_date} onChange={e => setForm({ ...form, next_date: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />

              {/* 订阅分类 */}
              <select value={form.subscription_category_id} onChange={e => setForm({ ...form, subscription_category_id: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">选择订阅分类 (可选)</option>
                {subCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* 试用设置 */}
              <div className="flex gap-2">
                <input type="number" min="1" value={form.trial_days} onChange={e => setForm({ ...form, trial_days: e.target.value })} placeholder="试用天数"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                <input type="date" value={form.trial_start_date} onChange={e => setForm({ ...form, trial_start_date: e.target.value })} placeholder="试用开始"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>

              <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">选择账户 (可选)</option>
                {accs.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="备注 (可选)"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />

              {/* 自动入账开关 */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <div onClick={() => setForm({ ...form, auto_record: !form.auto_record })}
                  className={`w-9 h-5 rounded-full transition-colors relative ${form.auto_record ? 'bg-accent' : 'bg-border'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.auto_record ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                自动入账
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-surface-hover transition-colors">取消</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="bg-surface rounded-xl border border-border divide-y divide-border">
        {subs.map((s: any) => {
          const trialLeft = getTrialDaysLeft(s)
          return (
            <div key={s.id} className="flex items-center px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  {s.status === 'trial' && trialLeft !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium shrink-0">
                      试用 {trialLeft}天
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {cycleLabel[s.cycle_type || s.cycle] || s.cycle_type || s.cycle}
                  {s.currency && s.currency !== 'CNY' ? ` ${s.currency}` : ''}
                  {' - 下次: '}{s.next_date?.slice(5)}
                </div>
              </div>
              <div className="text-right shrink-0 mr-3">
                <div className="text-sm font-semibold text-expense money">{formatMoney(s.amount)}</div>
                <div className={`text-xs mt-0.5 ${statusColor[s.status] || 'text-text-secondary'}`}>
                  {statusLabel[s.status] || s.status}
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {/* 自动入账开关 */}
                <button onClick={() => handleToggleAutoRecord(s)} className="p-1.5 rounded-md hover:bg-surface-hover transition-colors" title={s.auto_record ? '关闭自动入账' : '开启自动入账'}>
                  <svg className={`w-4 h-4 ${s.auto_record ? 'text-accent' : 'text-text-secondary/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleToggleActive(s)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text transition-colors" title={s.status === 'paused' ? '启用' : '暂停'}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.status === 'paused' ? "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md hover:bg-expense/10 text-text-secondary hover:text-expense transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {subs.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无订阅</div>
      )}
    </div>
  )
}
