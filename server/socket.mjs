import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'fallback-secret-change-in-production'
)

function getAllowedOrigins() {
  const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) {
    return [appUrl]
  }

  return true
}

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload
}

const httpServer = createServer()
const allowedOrigins = getAllowedOrigins()

console.log('[Socket] Allowed origins:', allowedOrigins === true ? 'all' : allowedOrigins.join(', '))

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
})

const onlineUsers = new Map()

io.use(async (socket, next) => {
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

io.on('connection', (socket) => {
  const userId = socket.userId
  if (!userId) return

  onlineUsers.set(userId, socket.id)
  socket.broadcast.emit('user:online', { userId })

  console.log(`[Socket] User ${userId} connected (${socket.id})`)

  socket.on('conversation:join', (conversationId) => {
    socket.join(`conversation:${conversationId}`)
  })

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`)
  })

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

  socket.on('typing:start', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId })
  })

  socket.on('typing:stop', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId })
  })

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

  socket.on('disconnect', () => {
    onlineUsers.delete(userId)
    socket.broadcast.emit('user:offline', { userId })
    console.log(`[Socket] User ${userId} disconnected`)
  })
})

const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[Socket] Real-time server running on port ${PORT}`)
})

