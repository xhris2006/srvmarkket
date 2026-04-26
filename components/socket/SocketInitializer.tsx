'use client'

import { IncomingCallOverlay } from '@/components/calls/IncomingCallOverlay'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/lib/store'
import { getSocketUrl } from '@/lib/socket'

function SocketProviderContent() {
  const { acceptCall, rejectCall } = useSocket()

  return <IncomingCallOverlay acceptCall={acceptCall} rejectCall={rejectCall} />
}

export function SocketInitializer() {
  const { user } = useAuthStore()
  const socketUrl = getSocketUrl()

  if (!user || !socketUrl) return null

  return <SocketProviderContent />
}
