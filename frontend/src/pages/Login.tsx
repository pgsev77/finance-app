import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, saveAuth } from '../api'

export default function LoginPage() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.login(username, password)
      saveAuth(res.token, res.user)
      if (res.user.force_change_password) {
        nav('/change-password', { replace: true })
      } else {
        nav('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl border border-border p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent">账簿</h1>
          <p className="text-sm text-text-secondary mt-1">个人财务管理系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-expense bg-expense/10 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1.5">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              placeholder="请输入用户名" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              placeholder="请输入密码" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
