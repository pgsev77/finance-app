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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-accent/5 via-transparent to-income/5 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-lg">
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary font-serif tracking-widest">账簿</h1>
            <p className="text-sm text-muted-foreground mt-2 tracking-wide">个人财务管理系统</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-expense bg-expense/10 rounded-xl px-3 py-2.5 border border-expense/20">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
                placeholder="请输入密码"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          账号由管理员创建 · 首次登录需修改密码
        </p>
      </div>
    </div>
  )
}
