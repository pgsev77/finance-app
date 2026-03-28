import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { getAuth, clearAuth, type User } from '../api'
import { useTheme } from './ThemeProvider'

// Auth guard
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = getAuth()
  const loc = useLocation()
  if (!auth) return <Navigate to="/login" state={{ from: loc }} replace />
  if (auth.user.force_change_password && loc.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />
  return <>{children}</>
}

// Admin guard
export function RequireAdmin({ children }: { children: ReactNode }) {
  const auth = getAuth()
  if (!auth || auth.user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

// Layout shell
export default function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAuth()
    if (auth) setUser(auth.user)
  }, [])

  useEffect(() => {
    const map: Record<string, string> = {
      '/dashboard': '仪表盘',
      '/transactions': '交易记录',
      '/transactions/new': '新增交易',
      '/accounts': '账户管理',
      '/categories': '分类管理',
      '/reports': '月度报表',
      '/subscriptions': '订阅管理',
      '/settings': '个人设置',
      '/users': '用户管理',
      '/change-password': '修改密码',
    }
    setPage(map[location.pathname] || '')
    setSidebarOpen(false)
  }, [location])

  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: 'D' },
    { path: '/transactions', label: '交易记录', icon: 'T' },
    { path: '/transactions/new', label: '记账', icon: '+' },
    { path: '/reports', label: '报表', icon: 'R' },
    { path: '/settings', label: '设置', icon: 'S' },
  ]

  const moreItems = [
    { path: '/accounts', label: '账户' },
    { path: '/categories', label: '分类' },
    { path: '/subscriptions', label: '订阅' },
    ...(user?.role === 'admin' ? [{ path: '/users', label: '用户管理' }] : []),
  ]

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar - desktop only */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-surface border-r border-border z-40 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="h-16 flex items-center px-5 border-b border-border">
            <span className="text-xl font-bold text-accent">账簿</span>
          </div>
          {/* Nav */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.slice(0, 2).map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-border/50'}`}>
                {item.label}
              </button>
            ))}
            {moreItems.map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-border/50'}`}>
                {item.label}
              </button>
            ))}
          </nav>
          {/* User */}
          {user && (
            <div className="p-4 border-t border-border">
              <div className="text-sm font-medium truncate">{user.username}</div>
              <div className="text-xs text-text-secondary">{user.role === 'admin' ? '管理员' : '普通用户'}</div>
              <button onClick={logout} className="mt-2 text-xs text-expense hover:underline">退出登录</button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="lg:ml-60 pb-20 lg:pb-0">
        {/* Header - desktop only shows title */}
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-border h-14 flex items-center px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 text-text-secondary hover:text-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-base font-semibold flex-1">{page}</h1>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 lg:hidden">
        <div className="flex">
          {navItems.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${location.pathname === item.path ? 'text-accent' : 'text-text-secondary'}`}>
              <span className="text-lg">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="p-2 rounded-lg hover:bg-border/50 text-text-secondary hover:text-text transition-colors" title="切换主题">
      {theme === 'light' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      )}
    </button>
  )
}
