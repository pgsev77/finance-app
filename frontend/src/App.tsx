import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/ThemeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import Layout, { RequireAuth, RequireAdmin } from './components/Layout'
import { Skeleton } from './components/ui/skeleton'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Login'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const TransactionNew = lazy(() => import('./pages/TransactionNew'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Categories = lazy(() => import('./pages/Categories'))
const Reports = lazy(() => import('./pages/Reports'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const Settings = lazy(() => import('./pages/Settings'))
const Users = lazy(() => import('./pages/Users'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LazyPage><LoginPage /></LazyPage>} />
              <Route path="/change-password" element={
                <RequireAuth><Layout><LazyPage><ChangePassword /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/" element={
                <RequireAuth><Layout><LazyPage><Dashboard /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/dashboard" element={
                <RequireAuth><Layout><LazyPage><Dashboard /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/transactions" element={
                <RequireAuth><Layout><LazyPage><Transactions /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/transactions/new" element={
                <RequireAuth><Layout><LazyPage><TransactionNew /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/accounts" element={
                <RequireAuth><Layout><LazyPage><Accounts /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/categories" element={
                <RequireAuth><Layout><LazyPage><Categories /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/reports" element={
                <RequireAuth><Layout><LazyPage><Reports /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/subscriptions" element={
                <RequireAuth><Layout><LazyPage><Subscriptions /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/settings" element={
                <RequireAuth><Layout><LazyPage><Settings /></LazyPage></Layout></RequireAuth>
              } />
              <Route path="/users" element={
                <RequireAuth><RequireAdmin><Layout><LazyPage><Users /></LazyPage></Layout></RequireAdmin></RequireAuth>
              } />
              <Route path="*" element={
                <div className="flex min-h-screen items-center justify-center bg-bg">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
                    <p className="mt-2 text-muted-foreground">页面未找到</p>
                    <a href="/" className="mt-4 inline-block text-primary hover:underline">返回首页</a>
                  </div>
                </div>
              } />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
