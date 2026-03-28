import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import Layout, { RequireAuth, RequireAdmin } from './components/Layout'
import LoginPage from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import TransactionNew from './pages/TransactionNew'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import Subscriptions from './pages/Subscriptions'
import Settings from './pages/Settings'
import Users from './pages/Users'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={
            <RequireAuth><Layout><ChangePassword /></Layout></RequireAuth>
          } />
          <Route path="/" element={
            <RequireAuth><Layout><Dashboard /></Layout></RequireAuth>
          } />
          <Route path="/dashboard" element={
            <RequireAuth><Layout><Dashboard /></Layout></RequireAuth>
          } />
          <Route path="/transactions" element={
            <RequireAuth><Layout><Transactions /></Layout></RequireAuth>
          } />
          <Route path="/transactions/new" element={
            <RequireAuth><Layout><TransactionNew /></Layout></RequireAuth>
          } />
          <Route path="/accounts" element={
            <RequireAuth><Layout><Accounts /></Layout></RequireAuth>
          } />
          <Route path="/categories" element={
            <RequireAuth><Layout><Categories /></Layout></RequireAuth>
          } />
          <Route path="/reports" element={
            <RequireAuth><Layout><Reports /></Layout></RequireAuth>
          } />
          <Route path="/subscriptions" element={
            <RequireAuth><Layout><Subscriptions /></Layout></RequireAuth>
          } />
          <Route path="/settings" element={
            <RequireAuth><Layout><Settings /></Layout></RequireAuth>
          } />
          <Route path="/users" element={
            <RequireAuth><RequireAdmin><Layout><Users /></Layout></RequireAdmin></RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
