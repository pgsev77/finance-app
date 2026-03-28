import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, saveAuth, getAuth } from '../api'

export default function ChangePassword() {
  const nav = useNavigate()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPwd !== confirm) { setError('两次密码不一致'); return }
    if (newPwd.length < 6) { setError('密码至少6位'); return }
    setLoading(true)
    try {
      await api.changePassword(oldPwd, newPwd)
      // Update localStorage: clear force_change_password flag
      const auth = getAuth()
      if (auth) saveAuth(auth.token, { ...auth.user, force_change_password: false })
      nav('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl border border-border p-8 shadow-lg">
        <h1 className="text-xl font-bold text-center mb-6">修改密码</h1>
        {error && <div className="text-sm text-expense bg-expense/10 rounded-lg px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">当前密码</label>
            <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">新密码</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">确认新密码</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50">
            {loading ? '提交中...' : '确认修改'}
          </button>
        </form>
      </div>
    </div>
  )
}
