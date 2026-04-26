'use client'

import { useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { useBookings } from '@/hooks/useBookings'
import { useAuthStore } from '@/lib/store'
import { BookingCard } from '@/components/booking/BookingCard'

type Tab = 'upcoming' | 'active' | 'completed' | 'cancelled'

export default function BookingsPage() {
  const { user } = useAuthStore()
  const role = user?.role === 'PROVIDER' ? 'provider' : 'client'
  const { grouped, isLoading, updateBookingStatus } = useBookings(role)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (bookingId: string, status: string) => {
    setUpdatingId(bookingId)
    await updateBookingStatus(bookingId, status as never)
    setUpdatingId(null)
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Pending',   count: grouped.pending.length },
    { id: 'active',   label: 'Active',    count: grouped.active.length },
    { id: 'completed',label: 'Completed', count: grouped.completed.length },
    { id: 'cancelled',label: 'Cancelled', count: grouped.cancelled.length },
  ]

  const currentBookings = {
    upcoming:  grouped.pending,
    active:    grouped.active,
    completed: grouped.completed,
    cancelled: grouped.cancelled,
  }[activeTab]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            My Bookings
          </h1>
        </div>

        {/* Status tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : currentBookings.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No {activeTab} bookings</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === 'upcoming' ? 'New requests will appear here' : `Your ${activeTab} bookings will appear here`}
            </p>
            {activeTab === 'upcoming' && role === 'client' && (
              <a href="/search" className="inline-block mt-4 gradient-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Find a Provider
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewAs={role}
                onStatusChange={handleStatusChange}
                isUpdating={updatingId === booking.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
