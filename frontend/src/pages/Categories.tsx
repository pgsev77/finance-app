import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Categories() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [tree, setTree] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await api.getCategories()
      setTree(Array.isArray(data) ? data : [])
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  const filtered = tree.filter((c: any) => c.type === tab)

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {/* Tab */}
      <div className="flex bg-surface border border-border rounded-lg p-1 w-fit">
        <button onClick={() => setTab('expense')}
          className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'expense' ? 'bg-expense text-white' : 'text-text-secondary'}`}>
          支出分类
        </button>
        <button onClick={() => setTab('income')}
          className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'income' ? 'bg-income text-white' : 'text-text-secondary'}`}>
          收入分类
        </button>
      </div>

      {/* Category tree */}
      <div className="space-y-3">
        {filtered.map((cat: any) => (
          <div key={cat.id} className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="flex items-center px-4 py-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${tab === 'expense' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}>
                {cat.icon || cat.name?.[0] || '?'}
              </div>
              <span className="ml-3 text-sm font-semibold">{cat.name}</span>
              {cat.children?.length > 0 && (
                <span className="ml-auto text-xs text-text-secondary">{cat.children.length} 个子分类</span>
              )}
            </div>
            {cat.children?.length > 0 && (
              <div className="border-t border-border px-4 py-2 flex flex-wrap gap-2">
                {cat.children.map((sub: any) => (
                  <span key={sub.id} className="px-3 py-1 bg-bg rounded-full text-xs text-text-secondary">
                    {sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-text-secondary py-8">暂无{tab === 'expense' ? '支出' : '收入'}分类</div>
      )}
    </div>
  )
}
