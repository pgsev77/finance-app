import { useState, useEffect } from 'react'
import { formatMoney, thisMonthRange } from '../lib/utils'
import { api } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Wallet, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Account } from '@/types'

const typeIcons: Record<string, string> = { wechat: '微', alipay: '支', bank: '银', credit_card: '信', cash: '现' }
const typeColors: Record<string, string> = { wechat: 'bg-green-500/10 text-green-500', alipay: 'bg-blue-500/10 text-blue-500', bank: 'bg-red-500/10 text-red-500', credit_card: 'bg-orange-500/10 text-orange-500', cash: 'bg-yellow-600/10 text-yellow-600' }
const typeLabels: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '银行卡', credit_card: '信用卡', cash: '现金' }

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [monthlyStats, setMonthlyStats] = useState<Record<number, { income: number; expense: number }>>({})
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({ name: '', type: 'bank', balance: '' })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)

  useEffect(() => { loadAccounts() }, [])

  async function loadAccounts() {
    setLoading(true)
    try {
      const data = await api.getAccounts()
      const accs = Array.isArray(data) ? data : []
      setAccounts(accs)
      const { start, end } = thisMonthRange()
      const allTxns = await api.getTransactions({ start_date: start, end_date: end, page: '1', page_size: '500' })
      const stats: Record<number, { income: number; expense: number }> = {}
      accs.forEach(a => { stats[a.id] = { income: 0, expense: 0 } })
      ;(allTxns.items || []).forEach(t => {
        const aid = t.account_id
        if (aid && stats[aid]) {
          const amt = Math.abs(t.amount || 0)
          if (t.type === 'income') stats[aid].income += amt
          else stats[aid].expense += amt
        }
      })
      setMonthlyStats(stats)
    } catch { /* toast handled by api */ } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', type: 'bank', balance: '' })
    setDialogOpen(true)
  }

  function openEdit(acc: Account) {
    setEditing(acc)
    setForm({
      name: acc.name,
      type: acc.type,
      balance: String((acc.balance || 0) / 100),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('请输入账户名称'); return }
    try {
      if (editing) {
        await api.updateAccount(editing.id, {
          name: form.name.trim(),
          type: form.type,
        })
        toast.success('账户已更新')
      } else {
        await api.createAccount({
          name: form.name.trim(),
          type: form.type,
          balance: Math.round(Number(form.balance) * 100) || 0,
        })
        toast.success('账户已创建')
      }
      setDialogOpen(false)
      await loadAccounts()
    } catch { /* toast handled by api */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.deleteAccount(deleteTarget.id)
      toast.success('账户已删除')
      setDeleteTarget(null)
      await loadAccounts()
    } catch { /* toast handled by api */ }
  }

  const activeAccounts = accounts.filter(a => a.is_active !== false)
  const totalBalance = activeAccounts.reduce((s, a) => s + (a.balance || 0), 0)

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-border p-3.5 lg:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-3.5 w-20 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-28 mt-4" />
              <Skeleton className="h-3 w-36 mt-2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Total banner */}
      <div className="bg-gradient-to-r from-accent to-accent-hover rounded-xl p-4 lg:p-6 text-white">
        <div className="text-sm opacity-80">总资产</div>
        <div className="text-2xl lg:text-3xl font-bold mt-1 money">{formatMoney(totalBalance)}</div>
        <div className="text-sm opacity-70 mt-2">共 {activeAccounts.length} 个账户</div>
      </div>

      {/* Add button */}
      <Button onClick={openCreate} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        新增账户
      </Button>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {activeAccounts.map(a => (
          <div key={a.id} className="bg-surface rounded-xl border border-border p-3.5 lg:p-5 hover:border-border-bright transition-all group" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${typeColors[a.type] || 'bg-gray-500/10 text-gray-500'}`}>
                {typeIcons[a.type] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <div className="text-xs text-muted-foreground">{typeLabels[a.type] || a.type}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(a)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteTarget(a)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className={`mt-4 text-xl font-bold money ${(a.balance || 0) >= 0 ? 'text-foreground' : 'text-expense'}`}>
              {(a.balance || 0) >= 0 ? '' : '-'}{formatMoney(Math.abs(a.balance || 0))}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-income money">收入 {formatMoney(monthlyStats[a.id]?.income || 0)}</span>
              <span className="text-expense money">支出 {formatMoney(monthlyStats[a.id]?.expense || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      {activeAccounts.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="暂无账户"
          description="添加你的第一个资产账户"
          action={{ label: '新增账户', onClick: openCreate }}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑账户' : '新增账户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">账户名称</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="如：招商银行"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">账户类型</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium mb-1.5">初始余额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            确定要删除账户 <strong>{deleteTarget?.name}</strong> 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
