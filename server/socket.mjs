// ─── SOCKET.IO REAL-TIME SERVER (Pure JS — Railway compatible) ────────────────
// Run via: node server/socket.mjs
// No TypeScript, no @/ aliases, no build step needed.

import { createServer } from 'http'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'

// ─── JWT VERIFICATION ─────────────────────────────────────────────────────────
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'fallback-secret-change-in-production'
)

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload
}

// ─── CORS ORIGINS ─────────────────────────────────────────────────────────────
function getAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  if (configured && configured.length > 0) return configured

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) return [appUrl]

  return true // allow all (dev fallback)
}

const allowedOrigins = getAllowedOrigins()
console.log('[Socket] Allowed origins:', allowedOrigins === true ? 'ALL' : allowedOrigins.join(', '))

// ─── HTTP + SOCKET.IO SERVER ──────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Simple health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  transports: ['websocket', 'polling'],
})

// Track online users: userId -> socketId
const onlineUsers = new Map()

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(' ')[1]

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
io.on('connection', (socket) => {
  const userId = socket.userId

  onlineUsers.set(userId, socket.id)
  socket.broadcast.emit('user:online', { userId })
  console.log(`[Socket] User ${userId} connected (${socket.id})`)

  // ─── CONVERSATIONS ──────────────────────────────────────────────────────────
  socket.on('conversation:join', (conversationId) => {
    socket.join(`conversation:${conversationId}`)
  })

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`)
  })

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  socket.on('message:send', async (data) => {
    try {
      const messagePayload = {
        ...data,
        senderId: userId,
        createdAt: new Date().toISOString(),
      }
      io.to(`conversation:${data.conversationId}`).emit('message:new', messagePayload)
    } catch {
      socket.emit('message:error', { tempId: data.tempId, error: 'Failed to send message' })
    }
  })

  socket.on('message:delete', (data) => {
    io.to(`conversation:${data.conversationId}`).emit('message:deleted', data)
  })

  // ─── TYPING ────────────────────────────────────────────────────────────────
  socket.on('typing:start', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId })
  })

  socket.on('typing:stop', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId })
  })

  // ─── CALL SIGNALING ─────────────────────────────────────────────────────────
  socket.on('call:initiate', (data) => {
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

  socket.on('call:accept', (data) => {
    const callerSocketId = onlineUsers.get(data.callerId)
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:accepted', {
        channelName: data.channelName,
        acceptedBy: userId,
      })
    }
  })

  socket.on('call:reject', (data) => {
    const callerSocketId = onlineUsers.get(data.callerId)
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected', { channelName: data.channelName })
    }
  })

  socket.on('call:end', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended', { channelName: data.channelName })
    }
  })

  // ─── WEBRTC SIGNALING ───────────────────────────────────────────────────────
  socket.on('webrtc:offer', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:offer', { from: userId, offer: data.offer })
    }
  })

  socket.on('webrtc:answer', (data) => {
    const targetSocketId = onlineUsers.get(data.targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:answer', { from: userId, answer: data.answer })
    }
  })

  socket.on('webrtc:ice-candidate', (data) => {
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

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[Socket] Server running on port ${PORT}`)
})
