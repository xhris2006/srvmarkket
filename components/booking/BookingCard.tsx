// ─── BOOKING CARD COMPONENT ───────────────────────────────────────────────────
'use client'

import { Calendar, MapPin, ChevronRight, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import { format } from 'date-fns'

interface BookingCardProps {
  booking: {
    id: string
    status: string
    scheduledAt: string
    totalAmount: number
    address?: string | null
    service: {
      title: string
      category: string
      provider: {
        id: string
        user: { name: string; avatar?: string | null }
      }
    }
    client: { id: string; name: string; avatar?: string | null }
    transaction?: { status: string } | null
  }
  viewAs: 'client' | 'provider'
  onStatusChange?: (bookingId: string, status: string) => Promise<void>
  isUpdating?: boolean
}

export function BookingCard({ booking, viewAs, onStatusChange, isUpdating }: BookingCardProps) {
  const router = useRouter()
  const other = viewAs === 'client' ? booking.service.provider.user : booking.client
  const isPending = booking.status === 'PENDING'
  const isAccepted = booking.status === 'ACCEPTED'
  const canPay = isAccepted && viewAs === 'client' && booking.transaction?.status !== 'COMPLETED'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 card-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={other.avatar} name={other.name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{other.name}</p>
            <p className="text-xs text-gray-500 truncate">{booking.service.title}</p>
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {format(new Date(booking.scheduledAt), 'EEE, MMM d · h:mm a')}
        </div>
        {booking.address && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{booking.address}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Total</span>
          <span className="font-bold text-gray-900">${booking.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Provider: Accept / Reject pending bookings */}
        {viewAs === 'provider' && isPending && onStatusChange && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(booking.id, 'REJECTED')}
              isLoading={isUpdating}
              className="flex-1"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => onStatusChange(booking.id, 'ACCEPTED')}
              isLoading={isUpdating}
              className="flex-1"
            >
              Accept
            </Button>
          </>
        )}

        {/* Provider: Mark complete */}
        {viewAs === 'provider' && booking.status === 'IN_PROGRESS' && onStatusChange && (
          <Button
            size="sm"
            onClick={() => onStatusChange(booking.id, 'COMPLETED')}
            isLoading={isUpdating}
            className="flex-1"
          >
            Mark Complete
          </Button>
        )}

        {/* Client: Pay now */}
        {canPay && (
          <Button
            size="sm"
            onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
            className="flex-1"
          >
            Pay Now
          </Button>
        )}

        {/* Client: Cancel pending */}
        {viewAs === 'client' && isPending && onStatusChange && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(booking.id, 'CANCELLED')}
            isLoading={isUpdating}
            className="flex-1 text-red-500 hover:bg-red-50"
          >
            Cancel
          </Button>
        )}

        {/* Chat button */}
        <button
          onClick={() => router.push(`/chat?userId=${other === booking.client ? booking.service.provider.user : booking.client}`)}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        {/* Details arrow */}
        <button
          onClick={() => router.push(`/bookings/${booking.id}`)}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
