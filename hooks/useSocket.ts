// ─── useSocket HOOK ───────────────────────────────────────────────────────────
// Manages a single Socket.io connection across the app with auto-reconnect

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuthStore, useChatStore, useCallStore, useNotificationStore } from '@/lib/store'
import { getSocketUrl } from '@/lib/socket'

let globalSocket: Socket | null = null

export function useSocket() {
  const pathname = usePathname()
  const { user, accessToken } = useAuthStore()
  const { addMessage, setUserOnline, setUserOffline, setTyping } = useChatStore()
  const { setIncomingCall } = useCallStore()
  const { addNotification } = useNotificationStore()
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const hasTriedRef = useRef(false)
  const errorLoggedRef = useRef(false)

  const connect = useCallback(() => {
    const isPublicRoute =
      pathname.startsWith('/auth/') ||
      pathname === '/admin/login'

    if (isPublicRoute) return
    if (!accessToken || !user) return
    const socketUrl = getSocketUrl()
    if (!socketUrl) {
      if (!hasTriedRef.current) {
        console.warn('[Socket] URL non definie - chat desactive')
        hasTriedRef.current = true
      }
      return
    }
    if (globalSocket?.connected) {
      socketRef.current = globalSocket
      setIsConnected(true)
      return
    }

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    })

    // ─── CONNECTION EVENTS ────────────────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnected(true)
      errorLoggedRef.current = false
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      if (!errorLoggedRef.current) {
        console.error('[Socket] Connection error:', err.message)
        errorLoggedRef.current = true
      }
      setIsConnected(false)
    })

    // ─── MESSAGES ─────────────────────────────────────────────────────────────
    socket.on('message:new', (msg) => {
      addMessage(msg.conversationId, msg)
    })

    socket.on('message:deleted', ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      useChatStore.getState().deleteMessage(conversationId, messageId)
    })

    // ─── TYPING ───────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      if (userId !== user.id) setTyping(conversationId, userId, true)
    })

    socket.on('typing:stop', ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      setTyping(conversationId, userId, false)
    })

    // ─── PRESENCE ─────────────────────────────────────────────────────────────
    socket.on('user:online', ({ userId }: { userId: string }) => {
      setUserOnline(userId)
    })

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      setUserOffline(userId)
    })

    // ─── INCOMING CALLS ───────────────────────────────────────────────────────
    socket.on('call:incoming', (data: {
      callerId: string
      callerName: string
      callerAvatar?: string
      callType: 'voice' | 'video'
      channelName: string
    }) => {
      setIncomingCall(data)
      addNotification({
        id: `call-${Date.now()}`,
        title: `Incoming ${data.callType} call`,
        body: `${data.callerName} is calling you`,
        type: 'CALL',
      })
    })

    // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
    socket.on('notification:new', (data: { title: string; body: string; type: string }) => {
      addNotification({ id: `notif-${Date.now()}`, ...data })
    })

    globalSocket = socket
    socketRef.current = socket
  }, [pathname, accessToken, user, addMessage, setUserOnline, setUserOffline, setTyping, setIncomingCall, addNotification])

  useEffect(() => {
    connect()
    return () => {
      // Don't disconnect on unmount — keep global socket alive
    }
  }, [connect])

  /**
   * Join a conversation room to receive messages
   */
  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:join', conversationId)
  }, [])

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:leave', conversationId)
  }, [])

  /**
   * Emit a message via socket (real-time delivery)
   */
  const sendSocketMessage = useCallback((data: {
    conversationId: string
    content?: string
    type: 'TEXT' | 'VOICE' | 'IMAGE'
    audioUrl?: string
    tempId: string
  }) => {
    socketRef.current?.emit('message:send', data)
  }, [])

  /**
   * Emit typing events
   */
  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:start', conversationId)
  }, [])

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:stop', conversationId)
  }, [])

  /**
   * Initiate a call
   */
  const initiateCall = useCallback((data: {
    targetUserId: string
    callType: 'voice' | 'video'
    channelName: string
  }) => {
    socketRef.current?.emit('call:initiate', data)
  }, [])

  const acceptCall = useCallback((channelName: string, callerId: string) => {
    socketRef.current?.emit('call:accept', { channelName, callerId })
  }, [])

  const rejectCall = useCallback((channelName: string, callerId: string) => {
    socketRef.current?.emit('call:reject', { channelName, callerId })
  }, [])

  const endCall = useCallback((channelName: string, targetUserId: string) => {
    socketRef.current?.emit('call:end', { channelName, targetUserId })
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation,
    sendSocketMessage,
    startTyping,
    stopTyping,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  }
}
