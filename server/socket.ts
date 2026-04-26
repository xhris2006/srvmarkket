// ─── SOCKET.IO REAL-TIME SERVER ───────────────────────────────────────────────
// Handles real-time chat, voice messages, call signaling
// Run this as a separate process: npx tsx server/socket.ts

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { verifyAccessToken } from '@/lib/auth'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
}

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
})

// Track online users: userId -> socketId
const onlineUsers = new Map<string, string>()

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
io.use(async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
  
  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    const decoded = await verifyAccessToken(token)
    socket.userId = decoded.sub
    socket.userRole = decoded.role
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

// ─── CONNECTION HANDLER ───────────────────────────────────────────────────────
io.on('connection', (socket: AuthenticatedSocket) => {
  const userId = socket.userId!
  
  // Mark user as online
  onlineUsers.set(userId, socket.id)
  socket.broadcast.emit('user:online', { userId })
  
  console.log(`[Socket] User ${userId} connected (${socket.id})`)

  // ─── JOIN CONVERSATION ──────────────────────────────────────────────────────
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`)
  })

  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
  })

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  socket.on('message:send', async (data: {
    conversationId: string
    content?: string
    type: 'TEXT' | 'VOICE' | 'IMAGE'
    audioUrl?: string
    tempId: string
  }) => {
    try {
      // Broadcast to conversation room (including sender for confirmation)
      const messagePayload = {
        ...data,
        senderId: userId,
        createdAt: new Date().toISOString(),
      }
      
      io.to(`conversation:${data.conversationId}`).emit('message:new', messagePayload)
    } catch (err) {
      socket.emit('message:error', { tempId: data.tempId, error: 'Failed to send message' })
    }
  })

  socket.on('message:delete', (data: { messageId: string; conversationId: string }) => {
    io.to(`conversation:${data.conversationId}`).emit('message:deleted', data)
  })

  // ─── TYPING INDICATOR ───────────────────────────────────────────────────────
  socket.on('typing:start', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId })
  })

  socket.on('typing:stop', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId })
  })

  // ─── CALL SIGNALING ─────────────────────────────────────────────────────────
  socket.on('call:initiate', (data: {
    targetUserId: string
    callType: 'voice' | 'video'
    channelName: string
  }) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (!targetSocketId) {
      socket.emit('call:failed', { reason: 'User is offline' })
      return
    }
    
    io.to(targetSocketId).emit('call:incoming', {
      callerId: userId,
      callType: data.callType,
      channelName: data.channelName,
    })
  })

  socket.on('call:accept', (data: { channelName: string; callerId: string }) => {
    const callerSocketId = onlineUsers.get(data.callerId)
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:accepted', {
        channelName: data.channelName,
        acceptedBy: userId,
      })
    }
  })

  socket.on('call:reject', (data: { channelName: string; callerId: string }) => {
    const callerSocketId = onlineUsers.get(data.callerId)
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected', { channelName: data.channelName })
    }
  })

  socket.on('call:end', (data: { channelName: string; targetUserId: string }) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended', { channelName: data.channelName })
    }
  })

  // WebRTC signaling passthrough (for peer-to-peer WebRTC)
  socket.on('webrtc:offer', (data: { targetUserId: string; offer: RTCSessionDescriptionInit }) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:offer', { from: userId, offer: data.offer })
    }
  })

  socket.on('webrtc:answer', (data: { targetUserId: string; answer: RTCSessionDescriptionInit }) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:answer', { from: userId, answer: data.answer })
    }
  })

  socket.on('webrtc:ice-candidate', (data: { targetUserId: string; candidate: RTCIceCandidateInit }) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:ice-candidate', { from: userId, candidate: data.candidate })
    }
  })

  // ─── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(userId)
    socket.broadcast.emit('user:offline', { userId })
    console.log(`[Socket] User ${userId} disconnected`)
  })
})

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[Socket] Real-time server running on port ${PORT}`)
})

export { io }
