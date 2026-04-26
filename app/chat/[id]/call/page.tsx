'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mic, MicOff, Phone, PhoneOff, RotateCcw, Video, VideoOff } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteAudioTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng'
import { useAuthStore, useCallStore } from '@/lib/store'
import { getSocketUrl } from '@/lib/socket'
import { fetchAgoraToken, joinAgoraChannel, leaveAgoraChannel } from '@/services/agora'

export default function CallPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { isMuted, isCameraOff, toggleMute, toggleCamera, endCall } = useCallStore()

  const channelName = searchParams.get('channel') || ''
  const callerId = searchParams.get('caller') || ''
  const callType = (searchParams.get('type') || 'voice') as 'voice' | 'video'
  const isIncoming = searchParams.get('incoming') === 'true'

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting')
  const [callDuration, setCallDuration] = useState(0)
  const [peerName, setPeerName] = useState('Connecting...')
  const [isJoining, setIsJoining] = useState(true)

  const localVideoRef = useRef<HTMLDivElement | null>(null)
  const remoteMediaRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null)
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const remoteAudioTrackRef = useRef<IRemoteAudioTrack | null>(null)
  const remoteVideoTrackRef = useRef<IRemoteVideoTrack | null>(null)

  useEffect(() => {
    if (!accessToken || !user || !channelName) return

    const socketUrl = getSocketUrl()
    if (!socketUrl) return

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim()
    if (!appId) {
      console.error('[Call] NEXT_PUBLIC_AGORA_APP_ID is missing')
    }

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    const startCall = async () => {
      setIsJoining(true)
      setCallStatus(isIncoming ? 'ringing' : 'connecting')

      try {
        const tokenData = await fetchAgoraToken(channelName, accessToken)
        if (!tokenData) {
          throw new Error('Unable to fetch Agora token')
        }

        const joinResult = await joinAgoraChannel({
          channelName,
          callType,
          appId: appId || tokenData.appId,
          token: tokenData.token,
          uid: tokenData.uid,
        })

        agoraClientRef.current = joinResult.client
        localAudioTrackRef.current = joinResult.localAudioTrack
        localVideoTrackRef.current = joinResult.localVideoTrack

        if (callType === 'video' && joinResult.localVideoTrack && localVideoRef.current) {
          joinResult.localVideoTrack.play(localVideoRef.current)
        }

        joinResult.client.on('user-published', async (remoteUser, mediaType) => {
          await joinResult.client.subscribe(remoteUser, mediaType)

          if (mediaType === 'video' && remoteMediaRef.current && remoteUser.videoTrack) {
            remoteVideoTrackRef.current = remoteUser.videoTrack
            remoteUser.videoTrack.play(remoteMediaRef.current)
          }

          if (mediaType === 'audio' && remoteUser.audioTrack) {
            remoteAudioTrackRef.current = remoteUser.audioTrack
            remoteUser.audioTrack.play()
          }

          setPeerName(remoteUser.uid ? `User ${remoteUser.uid}` : 'Connected user')
          setCallStatus('active')

          if (!durationIntervalRef.current) {
            durationIntervalRef.current = setInterval(() => setCallDuration((duration) => duration + 1), 1000)
          }
        })

        joinResult.client.on('user-unpublished', (_remoteUser, mediaType) => {
          if (mediaType === 'video' && remoteMediaRef.current) {
            remoteMediaRef.current.innerHTML = ''
          }
        })

        setCallStatus(isIncoming ? 'ringing' : 'active')
      } catch (error) {
        console.error('[Call] Failed to join Agora channel:', error)
        setCallStatus('ended')
      } finally {
        setIsJoining(false)
      }
    }

    socket.on('connect', async () => {
      if (isIncoming && callerId) {
        socket.emit('call:accept', { channelName, callerId })
      }

      await startCall()
    })

    socket.on('call:ended', () => {
      setCallStatus('ended')
      setTimeout(() => router.back(), 1200)
    })

    socket.on('call:rejected', () => {
      setCallStatus('ended')
      setTimeout(() => router.back(), 1200)
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, callType, callerId, channelName, isIncoming, router, user])

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      if (agoraClientRef.current) {
        void leaveAgoraChannel(
          agoraClientRef.current,
          localAudioTrackRef.current,
          localVideoTrackRef.current
        )
      }
    }
  }, [])

  const handleToggleMute = () => {
    if (localAudioTrackRef.current) {
      void localAudioTrackRef.current.setEnabled(isMuted)
    }
    toggleMute()
  }

  const handleToggleCamera = () => {
    if (localVideoTrackRef.current) {
      void localVideoTrackRef.current.setEnabled(isCameraOff)
    }
    toggleCamera()
  }

  const handleEndCall = async () => {
    socketRef.current?.emit('call:end', { channelName, targetUserId: callerId || 'peer' })

    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    if (agoraClientRef.current) {
      await leaveAgoraChannel(
        agoraClientRef.current,
        localAudioTrackRef.current,
        localVideoTrackRef.current
      )
    }

    endCall()
    router.back()
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-between relative overflow-hidden">
      <div ref={remoteMediaRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-8">
        <div className="text-center mt-16">
          <div className="w-24 h-24 gradient-brand rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-xl">
            {peerName[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">{peerName}</h2>
          <p className="text-white/60 text-sm">
            {isJoining || callStatus === 'connecting' ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
              </span>
            ) : null}
            {!isJoining && callStatus === 'ringing' ? (
              <span className="flex items-center gap-2 justify-center">
                <Phone className="w-4 h-4" /> Waiting for other user...
              </span>
            ) : null}
            {!isJoining && callStatus === 'active' ? formatDuration(callDuration) : null}
            {callStatus === 'ended' ? 'Call ended' : null}
          </p>
        </div>

        {callType === 'video' ? (
          <div className="absolute top-24 right-4 w-28 h-40 bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
            <div ref={localVideoRef} className="w-full h-full" />
            {isCameraOff ? (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-white/60" />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => void handleEndCall()}
            className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {callType === 'video' ? (
            <button
              onClick={handleToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
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
