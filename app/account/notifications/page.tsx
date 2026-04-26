'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Bell, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'

interface NotificationItem {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { success } = useToast()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setNotifications(d.data) })
      .finally(() => setIsLoading(false))
  }, [accessToken])

  const markAllRead = async () => {
    if (!accessToken) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    success('All notifications marked as read')
  }

  const TYPE_ICONS: Record<string, string> = {
    BOOKING_REQUEST: '📅',
    BOOKING_UPDATE:  '🔔',
    PAYMENT_SUCCESS: '✅',
    PAYMENT_RECEIVED:'💰',
    CALL:            '📞',
    DEFAULT:         '🔔',
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="ml-auto text-sm text-purple-600 font-medium hover:text-purple-700">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">Activity from bookings and messages will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-4 transition-colors ${!n.isRead ? 'bg-purple-50/50' : 'bg-white'}`}
              >
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0 border border-gray-100">
                  {TYPE_ICONS[n.type] || TYPE_ICONS.DEFAULT}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
