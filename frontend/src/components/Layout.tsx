import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { getAuth, clearAuth, type User } from '../api'
import { useTheme } from './ThemeProvider'
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Wallet,
  Tag,
  CreditCard,
  Settings,
  Users,
  LogOut,
  Plus,
  Sun,
  Moon,
  Menu,
  type LucideIcon,
} from 'lucide-react'

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

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

export default function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAuth()
    if (auth) setUser(auth.user)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  const mainNav: NavItem[] = [
    { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { path: '/transactions', label: '交易记录', icon: ArrowLeftRight },
    { path: '/reports', label: '报表', icon: BarChart3 },
  ]

  const manageNav: NavItem[] = [
    { path: '/accounts', label: '账户管理', icon: Wallet },
    { path: '/categories', label: '分类管理', icon: Tag },
    { path: '/subscriptions', label: '订阅管理', icon: CreditCard },
  ]

  const adminNav: NavItem[] = user?.role === 'admin' ? [
    { path: '/users', label: '用户管理', icon: Users },
  ] : []

  const logout = () => { clearAuth(); navigate('/login') }
  const isActive = (path: string) => location.pathname === path || (path === '/dashboard' && location.pathname === '/')

  function NavButton({ item }: { item: NavItem }) {
    const Icon = item.icon
    const active = isActive(item.path)
    return (
      <button
        onClick={() => navigate(item.path)}
        aria-current={active ? 'page' : undefined}
        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
          active
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar */}
      <aside aria-label="主导航" className={`fixed inset-y-0 left-0 w-60 bg-background border-r border-border z-40 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="h-14 flex items-center px-5 border-b border-border">
            <span className="text-lg font-semibold tracking-wider font-serif text-primary">账簿</span>
          </div>

          {/* Navigation */}
          <nav aria-label="侧边栏导航" className="flex-1 px-3 pt-4 overflow-y-auto">
            {/* Main section */}
            <div className="mb-6">
              <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">概览</div>
              <div className="space-y-0.5">
                {mainNav.map(item => <NavButton key={item.path} item={item} />)}
              </div>
            </div>

            {/* Manage section */}
            <div className="mb-6">
              <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">管理</div>
              <div className="space-y-0.5">
                {manageNav.map(item => <NavButton key={item.path} item={item} />)}
                {adminNav.map(item => <NavButton key={item.path} item={item} />)}
              </div>
            </div>
          </nav>

          {/* Bottom: settings + user + logout */}
          <div className="border-t border-border px-3 py-3 space-y-0.5">
            <NavButton item={{ path: '/settings', label: '设置', icon: Settings }} />
            {user && (
              <>
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl hover:bg-surface-hover cursor-pointer transition-colors"
                  onClick={() => navigate('/settings')}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{user.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.role === 'admin' ? '管理员' : '用户'}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="lg:ml-60 min-h-screen pb-20 lg:pb-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="mr-3 text-muted-foreground hover:text-foreground transition-colors" aria-label="打开菜单">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold flex-1 font-serif text-primary tracking-wide">账簿</span>
          <ThemeToggle />
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end h-14 px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <ThemeToggle />
        </div>

        {/* Page content */}
        <main className="px-3 py-4 lg:px-6 lg:py-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="移动端导航" className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border z-40 lg:hidden">
        <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {/* Home */}
          <MobileNavItem path="/dashboard" label="首页" icon={LayoutDashboard} active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />

          {/* Transactions */}
          <MobileNavItem path="/transactions" label="交易" icon={ArrowLeftRight} active={isActive('/transactions')} onClick={() => navigate('/transactions')} />

          {/* Center: Record button (floating) */}
          <button
            onClick={() => navigate('/transactions/new')}
            className="relative -top-3 flex flex-col items-center"
            aria-label="快速记账"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isActive('/transactions/new')
                ? 'bg-accent-hover scale-105'
                : 'bg-accent hover:bg-accent-hover hover:scale-105'
            }`}>
              <Plus className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-[10px] mt-1 font-medium text-accent">记账</span>
          </button>

          {/* Reports */}
          <MobileNavItem path="/reports" label="报表" icon={BarChart3} active={isActive('/reports')} onClick={() => navigate('/reports')} />

          {/* Settings */}
          <MobileNavItem path="/settings" label="设置" icon={Settings} active={isActive('/settings')} onClick={() => navigate('/settings')} />
        </div>
      </nav>
    </div>
  )
}

function MobileNavItem({ label, icon: Icon, active, onClick }: {
  path: string
  label: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center py-2 px-3 text-[10px] font-medium transition-colors ${
        active ? 'text-accent' : 'text-muted-foreground'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="mt-0.5">{label}</span>
    </button>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
      title="切换主题"
    >
      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  )
}
