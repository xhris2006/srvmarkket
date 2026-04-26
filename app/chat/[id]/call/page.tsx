'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, RotateCcw, Loader2 } from 'lucide-react'
import { getSocketUrl } from '@/lib/socket'
import { useAuthStore, useCallStore } from '@/lib/store'
import { io, Socket } from 'socket.io-client'

export default function CallPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { isMuted, isCameraOff, toggleMute, toggleCamera, endCall } = useCallStore()

  const channelName = searchParams.get('channel') || ''
  const callType = (searchParams.get('type') || 'voice') as 'voice' | 'video'
  const isIncoming = searchParams.get('incoming') === 'true'

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting')
  const [callDuration, setCallDuration] = useState(0)
  const [peerName, setPeerName] = useState('Connecting...')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── ICE SERVERS (STUN/TURN) ─────────────────────────────────────────────────
  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  // ─── SETUP LOCAL MEDIA ───────────────────────────────────────────────────────
  const setupLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    } catch (err) {
      console.error('Media access error:', err)
      setCallStatus('ended')
      return null
    }
  }, [callType])

  // ─── CREATE PEER CONNECTION ──────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!)
    })

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
      setCallStatus('active')
      durationIntervalRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)
    }

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc:ice-candidate', {
          targetUserId: 'peer',
          candidate: event.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        setCallStatus('ended')
      }
    }

    return pc
  }, [ICE_SERVERS])

  // ─── SOCKET SETUP & WEBRTC SIGNALING ────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !user) return
    const socketUrl = getSocketUrl()
    if (!socketUrl) return

    const socket = io(socketUrl, {
      auth: { token: accessToken },
    })
    socketRef.current = socket

    socket.on('connect', async () => {
      const stream = await setupLocalStream()
      if (!stream) return

      if (!isIncoming) {
        // Caller: create offer
        setCallStatus('ringing')
        const pc = createPeerConnection()
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc:offer', { targetUserId: 'peer', offer })
      } else {
        // Callee: wait for offer, send answer
        setCallStatus('ringing')
      }
    })

    // Caller receives answer
    socket.on('webrtc:answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer))
      setCallStatus('active')
    })

    // Callee receives offer
    socket.on('webrtc:offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection()
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc:answer', { targetUserId: from, answer })
      setPeerName(from)
    })

    // ICE candidates
    socket.on('webrtc:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
    })

    socket.on('call:ended', () => {
      setCallStatus('ended')
      setTimeout(() => router.back(), 1500)
    })

    socket.on('call:rejected', () => {
      setCallStatus('ended')
      setTimeout(() => router.back(), 1500)
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, user, isIncoming, setupLocalStream, createPeerConnection, router])

  // ─── CLEANUP ON UNMOUNT ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      peerConnectionRef.current?.close()
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    }
  }, [])

  // ─── TOGGLE MUTE ─────────────────────────────────────────────────────────────
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted))
    }
    toggleMute()
  }

  // ─── TOGGLE CAMERA ────────────────────────────────────────────────────────────
  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isCameraOff))
    }
    toggleCamera()
  }

  // ─── END CALL ─────────────────────────────────────────────────────────────────
  const handleEndCall = () => {
    socketRef.current?.emit('call:end', { channelName, targetUserId: 'peer' })
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    peerConnectionRef.current?.close()
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    endCall()
    router.back()
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-between relative overflow-hidden">
      {/* Remote video (full screen background for video calls) */}
      {callType === 'video' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-8">
        {/* Top - Call info */}
        <div className="text-center mt-16">
          <div className="w-24 h-24 gradient-brand rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-xl">
            {peerName[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">{peerName}</h2>
          <p className="text-white/60 text-sm">
            {callStatus === 'connecting' && (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
              </span>
            )}
            {callStatus === 'ringing' && '📞 Ringing...'}
            {callStatus === 'active' && formatDuration(callDuration)}
            {callStatus === 'ended' && 'Call ended'}
          </p>
        </div>

        {/* Local video (small PiP for video calls) */}
        {callType === 'video' && (
          <div className="absolute top-24 right-4 w-28 h-40 bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isCameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-white/60" />
              </div>
            )}
          </div>
        )}

        {/* Voice call audio (hidden video element) */}
        {callType === 'voice' && (
          <audio ref={remoteVideoRef as React.RefObject<HTMLAudioElement>} autoPlay />
        )}

        {/* Bottom - Controls */}
        <div className="flex items-center gap-6 mb-8">
          {/* Mute */}
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="w-18 h-18 w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Camera toggle (video calls only) */}
          {callType === 'video' ? (
            <button
              onClick={handleToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onClick={() => {}}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
