import { useState, useEffect } from 'react'
import { api } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tag, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Category } from '@/types'

export default function Categories() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [tree, setTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', parent_id: '' as string, icon: '', color: '' })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await api.getCategories()
      setTree(Array.isArray(data) ? data : [])
    } catch { /* toast handled by api */ } finally {
      setLoading(false)
    }
  }

  function openCreate(parentId?: number) {
    setEditing(null)
    setForm({ name: '', parent_id: parentId ? String(parentId) : '', icon: '', color: '' })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({
      name: cat.name,
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      icon: cat.icon || '',
      color: cat.color || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('请输入分类名称'); return }
    try {
      if (editing) {
        await api.updateCategory(editing.id, {
          name: form.name.trim(),
          icon: form.icon || undefined,
          color: form.color || undefined,
        })
        toast.success('分类已更新')
      } else {
        await api.createCategory({
          name: form.name.trim(),
          type: tab,
          parent_id: form.parent_id ? Number(form.parent_id) : null,
          icon: form.icon || undefined,
          color: form.color || undefined,
        })
        toast.success('分类已创建')
      }
      setDialogOpen(false)
      await loadCategories()
    } catch { /* toast handled by api */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.deleteCategory(deleteTarget.id)
      toast.success('分类已删除')
      setDeleteTarget(null)
      await loadCategories()
    } catch { /* toast handled by api */ }
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = tree.filter(c => c.type === tab)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56 rounded-xl" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex bg-surface border border-border rounded-xl p-1">
          <button onClick={() => setTab('expense')}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'expense' ? 'bg-expense text-white' : 'text-text-secondary'}`}>
            支出分类
          </button>
          <button onClick={() => setTab('income')}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'income' ? 'bg-income text-white' : 'text-text-secondary'}`}>
            收入分类
          </button>
        </div>
        <Button onClick={() => openCreate()} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增分类
        </Button>
      </div>

      {/* Category tree */}
      <div className="space-y-3">
        {filtered.map(cat => {
          const hasChildren = (cat.children?.length ?? 0) > 0
          const isExpanded = expanded.has(cat.id)
          return (
            <div key={cat.id} className="bg-surface rounded-xl border border-border overflow-hidden hover:border-border-bright transition-all" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center px-4 py-3 group">
                {/* Expand toggle */}
                <button
                  onClick={() => hasChildren && toggleExpand(cat.id)}
                  className={`mr-2 transition-transform ${hasChildren ? 'cursor-pointer' : 'invisible'} ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${tab === 'expense' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}>
                  {cat.icon || cat.name?.[0] || '?'}
                </div>
                <span className="ml-3 text-sm font-semibold flex-1">{cat.name}</span>

                {hasChildren && (
                  <span className="text-xs text-muted-foreground mr-3">{cat.children!.length} 个子分类</span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openCreate(cat.id)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors" title="添加子分类">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors" title="编辑">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="border-t border-border px-4 py-2 space-y-1">
                  {cat.children!.map(sub => (
                    <div key={sub.id} className="flex items-center py-1.5 pl-8 group/sub">
                      <span className="text-sm text-muted-foreground flex-1">{sub.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(sub)} className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteTarget(sub)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Tag}
          title={`暂无${tab === 'expense' ? '支出' : '收入'}分类`}
          description="点击上方按钮创建第一个分类"
          action={{ label: '新增分类', onClick: () => openCreate() }}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑分类' : '新增分类'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">分类名称</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="如：餐饮"
                autoFocus
              />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium mb-1.5">父分类</label>
                <select
                  value={form.parent_id}
                  onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="">无（顶级分类）</option>
                  {filtered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">图标（单个字符）</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value.slice(0, 2) }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                placeholder="如：🍔 或 餐"
                maxLength={2}
              />
            </div>
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
            确定要删除分类 <strong>{deleteTarget?.name}</strong> 吗？此操作不可撤销。
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
