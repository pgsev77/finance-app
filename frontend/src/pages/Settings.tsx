import { useState } from 'react'
import { getAuth, clearAuth, api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const nav = useNavigate()
  const auth = getAuth()
  const user = auth?.user
  const [confirmDelete, setConfirmDelete] = useState('none')

  const handleLogout = () => {
    clearAuth()
    nav('/login', { replace: true })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* User info */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-xl font-bold text-accent">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-base font-semibold">{user?.username}</div>
            <div className="text-sm text-text-secondary">{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
          </div>
        </div>
      </div>

      {/* Delete confirmation strategy */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold mb-3">交易删除确认</h2>
        <p className="text-sm text-text-secondary mb-4">删除交易记录时的确认策略</p>
        <div className="space-y-2">
          {[
            { value: 'none', label: '无需确认' },
            { value: 'soft', label: '软删除（可恢复）' },
            { value: 'hard', label: '硬删除（不可恢复）' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:border-accent/50 transition-colors">
              <input type="radio" name="deleteStrategy" value={opt.value}
                checked={confirmDelete === opt.value}
                onChange={e => setConfirmDelete(e.target.value)}
                className="accent-accent" />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Feishu binding */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold mb-3">飞书绑定</h2>
        <div className="text-sm text-text-secondary mb-3">绑定飞书账号以接收通知</div>
        <button className="w-full py-2.5 border border-accent text-accent rounded-lg text-sm font-medium hover:bg-accent/5 transition-colors">
          绑定飞书账号
        </button>
      </div>

      {/* Change password */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold mb-3">账户安全</h2>
        <button onClick={() => nav('/change-password')}
          className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          修改密码
        </button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full py-3 border border-expense text-expense rounded-xl text-sm font-medium hover:bg-expense/5 transition-colors">
        退出登录
      </button>
    </div>
  )
}
