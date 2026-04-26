'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, Ban, Eye, BarChart2, MessageSquare, Settings, LogOut, Shield, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface Analytics {
  users: { total: number; newThisMonth: number; providers: number }
  bookings: { total: number; completed: number; pending: number }
  revenue: { total: number; thisMonth: number; transactions: number }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isVerified: boolean
  isBanned: boolean
  createdAt: string
}

interface Transaction {
  id: string
  amount: number
  platformFee: number
  status: string
  currency: string
  createdAt: string
  user: { name: string; email: string }
  booking: { service: { title: string } }
}

type AdminTab = 'overview' | 'users' | 'transactions' | 'moderation'

export default function AdminDashboard() {
  const { user, accessToken, logout } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }
    loadDashboard()
  }, [user, router])

  const loadDashboard = async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const [analyticsRes, usersRes, txRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/users?pageSize=20', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/transactions?pageSize=20', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const [aData, uData, tData] = await Promise.all([analyticsRes.json(), usersRes.json(), txRes.json()])
      if (aData.success) setAnalytics(aData.data)
      if (uData.success) setUsers(uData.data.items)
      if (tData.success) setTransactions(tData.data.items)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'verify' | 'unverify') => {
    if (!accessToken) return
    setActionLoading(`${userId}-${action}`)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId, action }),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data.data } : u))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefund = async (transactionId: string) => {
    if (!accessToken) return
    setActionLoading(`refund-${transactionId}`)
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ transactionId }),
      })
      const data = await res.json()
      if (data.success) {
        setTransactions((prev) => prev.map((t) => t.id === transactionId ? { ...t, status: 'REFUNDED' } : t))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const STAT_CARDS = analytics ? [
    { icon: Users, label: 'Total Users', value: analytics.users.total, sub: `+${analytics.users.newThisMonth} this month`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: DollarSign, label: 'Platform Revenue', value: `$${analytics.revenue.total.toFixed(2)}`, sub: `$${analytics.revenue.thisMonth.toFixed(2)} this month`, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Calendar, label: 'Total Bookings', value: analytics.bookings.total, sub: `${analytics.bookings.pending} pending`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: TrendingUp, label: 'Completed Jobs', value: analytics.bookings.completed, sub: `${analytics.revenue.transactions} paid transactions`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ] : []

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'moderation', label: 'Moderation', icon: Shield },
  ] as const

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ─── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">ServMarket Admin</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={() => { logout(); router.push('/admin/login') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Mobile tabs */}
        <div className="md:hidden bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ─── OVERVIEW TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {STAT_CARDS.map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl p-5 card-shadow">
                    <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent users */}
              <div className="bg-white rounded-2xl card-shadow p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Users</h2>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {u.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'PROVIDER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── USERS TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 w-48"
                />
              </div>

              <div className="bg-white rounded-2xl card-shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 gradient-brand rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'PROVIDER' ? 'bg-purple-100 text-purple-700' : u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {u.isBanned ? (
                              <span className="text-xs text-red-600 flex items-center gap-1"><Ban className="w-3 h-3" /> Banned</span>
                            ) : u.isVerified ? (
                              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>
                            ) : (
                              <span className="text-xs text-gray-400">Unverified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {!u.isBanned ? (
                              <button
                                onClick={() => handleUserAction(u.id, 'ban')}
                                disabled={actionLoading === `${u.id}-ban`}
                                className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1"
                              >
                                {actionLoading === `${u.id}-ban` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                Ban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserAction(u.id, 'unban')}
                                disabled={actionLoading === `${u.id}-unban`}
                                className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50"
                              >
                                Unban
                              </button>
                            )}
                            {!u.isVerified && (
                              <button
                                onClick={() => handleUserAction(u.id, 'verify')}
                                disabled={actionLoading === `${u.id}-verify`}
                                className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                              >
                                {actionLoading === `${u.id}-verify` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TRANSACTIONS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'transactions' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>
              <div className="bg-white rounded-2xl card-shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Customer', 'Service', 'Amount', 'Platform Fee', 'Status', 'Date', 'Actions'].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{tx.user?.name}</p>
                          <p className="text-xs text-gray-400">{tx.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">
                          {tx.booking?.service?.title}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ${tx.amount.toFixed(2)} {tx.currency.toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-700 font-medium">
                          ${tx.platformFee.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                            : tx.status === 'REFUNDED' ? 'bg-orange-100 text-orange-700'
                            : tx.status === 'FAILED' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {tx.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleRefund(tx.id)}
                              disabled={actionLoading === `refund-${tx.id}`}
                              className="text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 flex items-center gap-1"
                            >
                              {actionLoading === `refund-${tx.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── MODERATION TAB ───────────────────────────────────────────────── */}
          {activeTab === 'moderation' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Moderation</h1>
              <div className="bg-white rounded-2xl p-8 text-center card-shadow">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No pending reports</h3>
                <p className="text-sm text-gray-400">Reports from users will appear here for review</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
