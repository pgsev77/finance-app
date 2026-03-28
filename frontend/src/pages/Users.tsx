import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await api.getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      // 静默处理
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newUsername || !newPassword) return
    setError('')
    try {
      await api.createUser({ username: newUsername, password: newPassword, role: newRole })
      setNewUsername('')
      setNewPassword('')
      setShowCreate(false)
      await loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleToggle(id: number) {
    try {
      await api.toggleUser(id)
      await loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="text-center text-text-secondary py-12">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-expense bg-expense/10 rounded-lg px-3 py-2">{error}</div>}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-text-secondary">共 {users.length} 个用户</div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          {showCreate ? '取消' : '创建用户'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <button onClick={handleCreate}
            className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover">
            创建
          </button>
        </div>
      )}

      {/* User list */}
      <div className="bg-surface rounded-xl border border-border divide-y divide-border">
        {users.map((u: any) => (
          <div key={u.id} className="flex items-center px-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{u.username}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {u.role === 'admin' ? '管理员' : '普通用户'} - {u.is_active !== false ? '启用' : '禁用'}
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium mr-3 ${u.is_active !== false ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
              {u.is_active !== false ? '启用' : '禁用'}
            </span>
            {u.id !== 1 && (
              <button onClick={() => handleToggle(u.id)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:border-accent/50 text-text-secondary hover:text-accent transition-colors">
                {u.is_active !== false ? '禁用' : '启用'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
