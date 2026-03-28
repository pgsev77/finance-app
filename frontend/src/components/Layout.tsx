import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { getAuth, clearAuth, type User } from '../api'
import { useTheme } from './ThemeProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = getAuth()
  const loc = useLocation()
  if (!auth) return <Navigate to="/login" state={{ from: loc }} replace />
  if (auth.user.force_change_password && loc.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const auth = getAuth()
  if (!auth || auth.user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

// Icon helper
function Icon({ d, className = "w-4 h-4" }: { d: string; className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>
}

const icons = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  transactions: "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  newTx: "M12 4v16m8-8H4",
  reports: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  accounts: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  categories: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  subscriptions: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
}

const pageTitles: Record<string, string> = {
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

export default function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pageTitle, setPageTitle] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAuth()
    if (auth) setUser(auth.user)
  }, [])

  useEffect(() => {
    setPageTitle(pageTitles[location.pathname] || '')
    setSidebarOpen(false)
  }, [location])

  const mainNav = [
    { path: '/dashboard', label: '仪表盘', icon: icons.dashboard },
    { path: '/transactions', label: '交易记录', icon: icons.transactions },
    { path: '/transactions/new', label: '记账', icon: icons.newTx },
  ]

  const toolNav = [
    { path: '/reports', label: '报表', icon: icons.reports },
    { path: '/accounts', label: '账户', icon: icons.accounts },
    { path: '/categories', label: '分类', icon: icons.categories },
    { path: '/subscriptions', label: '订阅', icon: icons.subscriptions },
  ]

  const adminNav = user?.role === 'admin' ? [
    { path: '/users', label: '用户管理', icon: icons.users },
  ] : []

  const mobileNav = [
    { path: '/dashboard', label: '首页', icon: icons.dashboard },
    { path: '/transactions', label: '交易', icon: icons.transactions },
    { path: '/transactions/new', label: '记账', icon: icons.newTx },
    { path: '/reports', label: '报表', icon: icons.reports },
    { path: '/settings', label: '设置', icon: icons.settings },
  ]

  const logout = () => { clearAuth(); navigate('/login') }

  const isActive = (path: string) => location.pathname === path

  const NavItem = ({ item, compact }: { item: { path: string; label: string; icon: string }; compact?: boolean }) => (
    <button onClick={() => navigate(item.path)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive(item.path) ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-text/5 hover:text-text'}`}>
      <Icon d={item.icon} />
      {!compact && <span>{item.label}</span>}
    </button>
  )

  const NavLabel = ({ children }: { children: ReactNode }) => (
    <div className="px-3 pt-5 pb-2 text-[11px] font-semibold text-text-secondary/60 uppercase tracking-wider">{children}</div>
  )

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-surface border-r border-border z-40 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Brand - h-14 aligned with header */}
          <div className="h-14 flex items-center px-5 border-b border-border">
            <span className="text-lg font-bold tracking-tight text-text">账簿</span>
          </div>
          {/* Navigation */}
          <nav className="flex-1 py-2 px-3 overflow-y-auto">
            <NavLabel>概览</NavLabel>
            <div className="space-y-0.5">
              {mainNav.map(item => <NavItem key={item.path} item={item} />)}
            </div>
            <NavLabel>工具</NavLabel>
            <div className="space-y-0.5">
              {toolNav.map(item => <NavItem key={item.path} item={item} />)}
              {adminNav.map(item => <NavItem key={item.path} item={item} />)}
            </div>
          </nav>
          {/* Bottom section */}
          <div className="border-t border-border px-3 py-3 space-y-0.5">
            <button onClick={() => navigate('/settings')}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive('/settings') ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-text/5 hover:text-text'}`}>
              <Icon d={icons.settings} />
              <span>设置</span>
            </button>
            {user && (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mt-1">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{user.username}</div>
                    <div className="text-[11px] text-text-secondary truncate">{user.role === 'admin' ? '管理员' : '用户'}</div>
                  </div>
                </div>
                <button onClick={logout}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:text-expense hover:bg-expense/5 transition-colors">
                  <Icon d={icons.logout} />
                  <span>退出登录</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main area */}
      <div className="lg:ml-60 pb-20 lg:pb-0">
        {/* Header - h-14 aligned with sidebar */}
        <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-lg border-b border-border h-14 flex items-center px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 text-text-secondary hover:text-text -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-sm font-semibold flex-1">{pageTitle}</h1>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 max-w-5xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-lg border-t border-border z-40 lg:hidden">
        <div className="flex">
          {mobileNav.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-colors ${isActive(item.path) ? 'text-accent' : 'text-text-secondary'}`}>
              <Icon d={item.icon} className="w-5 h-5" />
              <span className="mt-1">{item.label}</span>
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
    <button onClick={toggle} className="p-2 rounded-lg hover:bg-text/5 text-text-secondary hover:text-text transition-colors" title="切换主题">
      {theme === 'light' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      )}
    </button>
  )
}
