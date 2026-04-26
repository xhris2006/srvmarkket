'use client'

import { useState, useEffect } from 'react'
import { DollarSign, RefreshCw, Download, Loader2, TrendingUp, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { TransactionStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'

interface Transaction {
  id: string
  amount: number
  platformFee: number
  providerAmount: number
  status: string
  currency: string
  provider: string
  createdAt: string
  user: { name: string; email: string }
  booking: { service: { title: string } }
}

interface Analytics {
  revenue: { total: number; thisMonth: number; transactions: number }
}

export default function AdminPaymentsPage() {
  const { accessToken } = useAuthStore()
  const { success, error } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (statusFilter) params.set('status', statusFilter)

      const [txRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/transactions?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const [txData, analyticsData] = await Promise.all([txRes.json(), analyticsRes.json()])
      if (txData.success) {
        setTransactions(txData.data.items)
        setTotalPages(txData.data.totalPages)
      }
      if (analyticsData.success) setAnalytics(analyticsData.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [page, statusFilter, accessToken])

  const handleRefund = async (txId: string) => {
    if (!accessToken || !confirm('Issue a full refund for this transaction?')) return
    setRefundingId(txId)
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ transactionId: txId }),
      })
      const data = await res.json()
      if (data.success) {
        setTransactions((prev) => prev.map((t) => t.id === txId ? { ...t, status: 'REFUNDED' } : t))
        success('Refund issued successfully')
      } else {
        error(data.error || 'Refund failed')
      }
    } finally {
      setRefundingId(null)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['ID', 'Date', 'Customer', 'Service', 'Amount', 'Platform Fee', 'Provider Amount', 'Status'],
      ...transactions.map((t) => [
        t.id,
        format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
        t.user?.name,
        t.booking?.service?.title,
        t.amount.toFixed(2),
        t.platformFee.toFixed(2),
        t.providerAmount.toFixed(2),
        t.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const STAT_CARDS = analytics ? [
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `$${analytics.revenue.total.toFixed(2)}`,
      sub: 'All-time platform commissions',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: TrendingUp,
      label: 'This Month',
      value: `$${analytics.revenue.thisMonth.toFixed(2)}`,
      sub: 'Platform fee collected',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: ArrowUpRight,
      label: 'Transactions',
      value: analytics.revenue.transactions,
      sub: 'Completed payments',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ] : []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments & Revenue</h1>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Customer', 'Service', 'Amount', 'Platform Fee', 'Provider', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">No transactions found</td>
                  </tr>
                ) : transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(tx.createdAt), 'MMM d, yyyy')}
                      <br />
                      <span className="text-gray-400">{format(new Date(tx.createdAt), 'HH:mm')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 whitespace-nowrap">{tx.user?.name}</p>
                      <p className="text-xs text-gray-400">{tx.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <p className="text-gray-700 truncate">{tx.booking?.service?.title}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                      ${tx.amount.toFixed(2)} <span className="text-xs font-normal text-gray-400">{tx.currency.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-green-700 font-semibold whitespace-nowrap">
                      ${tx.platformFee.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-blue-700 whitespace-nowrap">
                      ${tx.providerAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <TransactionStatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3">
                      {tx.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleRefund(tx.id)}
                          disabled={refundingId === tx.id}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          {refundingId === tx.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />
                          }
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
