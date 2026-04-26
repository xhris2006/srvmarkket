'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Mic, MicOff, Phone, Video, MoreVertical, Loader2, X, Play, Pause } from 'lucide-react'
import { getSocketUrl } from '@/lib/socket'
import { useAuthStore, useChatStore, useCallStore } from '@/lib/store'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  conversationId: string
  senderId: string
  sender: { id: string; name: string; avatar?: string | null }
  content?: string | null
  type: 'TEXT' | 'VOICE' | 'IMAGE' | 'SYSTEM'
  audioUrl?: string | null
  isDeleted: boolean
  createdAt: string
  tempId?: string
}

interface ConversationInfo {
  id: string
  participants: Array<{ userId: string; user: { id: string; name: string; avatar?: string | null } }>
}

let socketInstance: Socket | null = null

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { addMessage, setMessages, messages: storeMessages } = useChatStore()
  const { setIncomingCall } = useCallStore()

  const conversationId = params.id as string
  const [conversation, setConversation] = useState<ConversationInfo | null>(null)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const messages = storeMessages[conversationId] || []

  // Get the other participant
  const otherParticipant = conversation?.participants.find((p) => p.userId !== user?.id)

  // ─── FETCH HISTORY ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return

    const loadData = async () => {
      try {
        const [convRes, msgRes] = await Promise.all([
          fetch('/api/messages', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`/api/messages/${conversationId}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ])
        const [convData, msgData] = await Promise.all([convRes.json(), msgRes.json()])

        if (convData.success) {
          const conv = convData.data.find((c: ConversationInfo) => c.id === conversationId)
          setConversation(conv || null)
        }
        if (msgData.success) {
          setMessages(conversationId, msgData.data.messages)
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [conversationId, accessToken, setMessages])

  // ─── SOCKET CONNECTION ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !user) return
    const socketUrl = getSocketUrl()
    if (!socketUrl) return

    socketInstance = io(socketUrl, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      socketInstance?.emit('conversation:join', conversationId)
    })

    socketInstance.on('disconnect', () => setIsConnected(false))

    socketInstance.on('message:new', (msg: Message) => {
      if (msg.senderId !== user.id) {
        addMessage(conversationId, msg)
      }
    })

    socketInstance.on('typing:start', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => [...prev.filter((id) => id !== userId), userId])
    })

    socketInstance.on('typing:stop', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId))
    })

    socketInstance.on('call:incoming', (data: { callerId: string; callType: 'voice' | 'video'; channelName: string }) => {
      setIncomingCall({
        callerId: data.callerId,
        callerName: otherParticipant?.user.name || 'Unknown',
        callerAvatar: otherParticipant?.user.avatar ?? undefined,
        callType: data.callType,
        channelName: data.channelName,
      })
      router.push(`/chat/${conversationId}/call?channel=${data.channelName}&type=${data.callType}&incoming=true`)
    })

    return () => {
      socketInstance?.emit('conversation:leave', conversationId)
      socketInstance?.disconnect()
      socketInstance = null
    }
  }, [accessToken, user, conversationId, addMessage, setIncomingCall, otherParticipant, router])

  // ─── AUTO SCROLL ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── SEND TEXT MESSAGE ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isSending || !accessToken) return
    const content = inputText.trim()
    setInputText('')
    setIsSending(true)

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId, tempId, conversationId, senderId: user!.id,
      sender: { id: user!.id, name: user!.name, avatar: user?.avatar || undefined },
      content, type: 'TEXT', isDeleted: false, createdAt: new Date().toISOString(),
    }
    addMessage(conversationId, optimisticMsg)

    try {
      // Persist to DB
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content, type: 'TEXT' }),
      })
      const data = await res.json()

      // Emit via socket to other participants
      socketInstance?.emit('message:send', { conversationId, content, type: 'TEXT', tempId })

      // Replace optimistic message with real one
      if (data.success) {
        setMessages(conversationId, [
          ...messages.filter((m) => m.id !== tempId),
          data.data,
        ])
      }
    } finally {
      setIsSending(false)
    }
  }, [inputText, isSending, accessToken, user, conversationId, addMessage, messages, setMessages])

  // ─── TYPING INDICATOR ────────────────────────────────────────────────────────
  const handleTyping = (value: string) => {
    setInputText(value)
    socketInstance?.emit('typing:start', conversationId)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socketInstance?.emit('typing:stop', conversationId)
    }, 2000)
  }

  // ─── VOICE RECORDING ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        await uploadAndSendVoice(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    } catch {
      alert('Microphone permission denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
  }

  const uploadAndSendVoice = async (blob: Blob) => {
    if (!accessToken) return
    const formData = new FormData()
    formData.append('audio', blob, 'voice-message.webm')
    formData.append('conversationId', conversationId)

    try {
      const uploadRes = await fetch('/api/upload/audio', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadData.success) return

      await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ type: 'VOICE', audioUrl: uploadData.data.url }),
      })
      socketInstance?.emit('message:send', { conversationId, type: 'VOICE', audioUrl: uploadData.data.url, tempId: `voice-${Date.now()}` })
    } catch (err) {
      console.error('Voice upload failed:', err)
    }
  }

  // ─── INITIATE CALL ───────────────────────────────────────────────────────────
  const initiateCall = (callType: 'voice' | 'video') => {
    if (!otherParticipant) return
    const channelName = `call-${conversationId}-${Date.now()}`
    socketInstance?.emit('call:initiate', { targetUserId: otherParticipant.userId, callType, channelName })
    router.push(`/chat/${conversationId}/call?channel=${channelName}&type=${callType}`)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white z-10 flex-shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {otherParticipant ? (
          <>
            <div className="relative">
              {otherParticipant.user.avatar ? (
                <img src={otherParticipant.user.avatar} alt={otherParticipant.user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white font-bold">
                  {otherParticipant.user.name[0]}
                </div>
              )}
              {isConnected && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">{otherParticipant.user.name}</p>
              <p className="text-xs text-gray-400">{isConnected ? 'Online' : 'Offline'}</p>
            </div>
          </>
        ) : (
          <div className="flex-1"><p className="font-semibold text-sm text-gray-500">Loading...</p></div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => initiateCall('voice')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={() => initiateCall('video')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── MESSAGES ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex gap-1 bg-gray-100 rounded-2xl px-3 py-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── INPUT BAR ───────────────────────────────────────────────────────── */}
      <div className="border-t px-4 py-3 bg-white flex-shrink-0 safe-bottom">
        {isRecording ? (
          <div className="flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 font-medium text-sm flex-1">
              Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
            </span>
            <button onClick={stopRecording} className="text-red-600 font-semibold text-sm">
              Send
            </button>
            <button onClick={() => { mediaRecorderRef.current?.stop(); setIsRecording(false) }} className="text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
              <input
                value={inputText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Message..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {inputText.trim() ? (
              <button
                onClick={sendMessage}
                disabled={isSending}
                className="w-10 h-10 gradient-brand rounded-2xl flex items-center justify-center flex-shrink-0"
              >
                {isSending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onTouchStart={startRecording}
                className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 hover:bg-purple-100 transition-colors"
              >
                <Mic className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MESSAGE BUBBLE ─────────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <span className="text-xs text-gray-400 italic px-3 py-2">Message deleted</span>
      </div>
    )
  }

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play(); setIsPlaying(true) }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
          isOwn
            ? 'gradient-brand text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {message.type === 'VOICE' && message.audioUrl ? (
          <div className="flex items-center gap-2 min-w-[120px]">
            <button onClick={toggleAudio} className={`w-8 h-8 rounded-full flex items-center justify-center ${isOwn ? 'bg-white/20' : 'bg-purple-100'}`}>
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <div className={`flex-1 h-1 rounded-full ${isOwn ? 'bg-white/30' : 'bg-gray-300'}`} />
            <span className="text-xs opacity-70">Voice</span>
            <audio ref={audioRef} src={message.audioUrl} onEnded={() => setIsPlaying(false)} />
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{message.content}</p>
        )}
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60 text-right' : 'text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
