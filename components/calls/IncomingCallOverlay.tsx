// ─── INCOMING CALL OVERLAY ────────────────────────────────────────────────────
// Shown globally when receiving a call, regardless of current page
'use client'

import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallStore } from '@/lib/store'
import { Avatar } from '@/components/ui/Avatar'

interface IncomingCallOverlayProps {
  acceptCall: (channelName: string, callerId: string) => void
  rejectCall: (channelName: string, callerId: string) => void
}

export function IncomingCallOverlay({ acceptCall, rejectCall }: IncomingCallOverlayProps) {
  const { incomingCall, setIncomingCall, endCall } = useCallStore()
  const router = useRouter()
  const ringtonRef = useRef<HTMLAudioElement | null>(null)

  // Play ringtone
  useEffect(() => {
    if (incomingCall) {
      // Create a simple oscillator-based ringtone using Web Audio API
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioContext()
        let interval: ReturnType<typeof setInterval>

        const ring = () => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 440
          gain.gain.value = 0.1
          osc.start()
          setTimeout(() => { osc.stop(); gain.disconnect() }, 400)
        }

        ring()
        interval = setInterval(ring, 1500)
        return () => {
          clearInterval(interval)
          ctx.close()
        }
      } catch {
        // Audio not available
      }
    }
  }, [incomingCall])

  if (!incomingCall) return null

  const handleAccept = () => {
    acceptCall(incomingCall.channelName, incomingCall.callerId)
    router.push(`/chat/call?channel=${incomingCall.channelName}&type=${incomingCall.callType}&incoming=true`)
    setIncomingCall(null)
  }

  const handleReject = () => {
    rejectCall(incomingCall.channelName, incomingCall.callerId)
    setIncomingCall(null)
    endCall()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Call card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Purple gradient top */}
        <div className="gradient-brand px-6 pt-8 pb-6 text-white text-center">
          <div className="mb-4 flex justify-center">
            <Avatar
              src={incomingCall.callerAvatar}
              name={incomingCall.callerName}
              size="xl"
              className="ring-4 ring-white/30"
            />
          </div>
          <p className="text-white/70 text-sm mb-1">Incoming {incomingCall.callType} call</p>
          <h2 className="text-2xl font-bold">{incomingCall.callerName}</h2>

          {/* Animated rings */}
          <div className="flex justify-center mt-3 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-6 justify-center px-6 py-6">
          {/* Reject */}
          <button
            onClick={handleReject}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-95 transition-all">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 active:scale-95 transition-all animate-pulse-soft">
              {incomingCall.callType === 'video'
                ? <Video className="w-7 h-7 text-white" />
                : <Phone className="w-7 h-7 text-white" />
              }
            </div>
            <span className="text-xs text-gray-500 font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  )
}
