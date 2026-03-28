import { useState } from 'react'

const mockCategories = {
  expense: [
    { id: 1, name: '餐饮', icon: '饭', subcategories: [{ id: 11, name: '早餐' }, { id: 12, name: '午餐' }, { id: 13, name: '晚餐' }, { id: 14, name: '外卖' }] },
    { id: 2, name: '交通', icon: '车', subcategories: [{ id: 21, name: '公交' }, { id: 22, name: '地铁' }, { id: 23, name: '打车' }, { id: 24, name: '加油' }] },
    { id: 3, name: '购物', icon: '购', subcategories: [{ id: 31, name: '日用品' }, { id: 32, name: '服饰' }, { id: 33, name: '电子产品' }] },
    { id: 4, name: '娱乐', icon: '乐', subcategories: [{ id: 41, name: '电影' }, { id: 42, name: '游戏' }, { id: 43, name: '旅行' }] },
    { id: 5, name: '居住', icon: '住', subcategories: [{ id: 51, name: '房租' }, { id: 52, name: '水电' }, { id: 53, name: '物业' }] },
    { id: 6, name: '医疗', icon: '医', subcategories: [{ id: 61, name: '挂号' }, { id: 62, name: '药品' }] },
  ],
  income: [
    { id: 10, name: '工资', icon: '薪', subcategories: [] },
    { id: 11, name: '理财', icon: '财', subcategories: [{ id: 111, name: '利息' }, { id: 112, name: '股息' }] },
    { id: 12, name: '兼职', icon: '兼', subcategories: [] },
    { id: 13, name: '红包', icon: '包', subcategories: [] },
  ],
}

export default function Categories() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const cats = mockCategories[tab]

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
        {cats.map(cat => (
          <div key={cat.id} className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="flex items-center px-4 py-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${tab === 'expense' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}>
                {cat.icon}
              </div>
              <span className="ml-3 text-sm font-semibold">{cat.name}</span>
              {cat.subcategories.length > 0 && (
                <span className="ml-auto text-xs text-text-secondary">{cat.subcategories.length} 个子分类</span>
              )}
            </div>
            {cat.subcategories.length > 0 && (
              <div className="border-t border-border px-4 py-2 flex flex-wrap gap-2">
                {cat.subcategories.map(sub => (
                  <span key={sub.id} className="px-3 py-1 bg-bg rounded-full text-xs text-text-secondary">
                    {sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
