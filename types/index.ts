// ─── GLOBAL TYPES FOR SERVMARKET ──────────────────────────────────────────────

export type Role = 'CLIENT' | 'PROVIDER' | 'ADMIN'
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
export type MessageType = 'TEXT' | 'VOICE' | 'IMAGE' | 'SYSTEM'
export type ServiceCategory = 
  | 'CLEANING' | 'REPAIR' | 'PLUMBING' | 'ELECTRICAL' | 'PAINTING'
  | 'MOVING' | 'GARDENING' | 'COOKING' | 'TUTORING' | 'BEAUTY'
  | 'FITNESS' | 'PET_CARE' | 'IT_SUPPORT' | 'PHOTOGRAPHY' | 'OTHER'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string | null
  role: Role
  isVerified: boolean
}

export interface JWTPayload {
  sub: string
  email: string
  role: Role
  iat: number
  exp: number
}

export interface Provider {
  id: string
  userId: string
  user: AuthUser
  bio?: string | null
  tagline?: string | null
  isAvailable: boolean
  isVerifiedBadge: boolean
  rating: number
  totalReviews: number
  completedJobs: number
  services: Service[]
  distance?: number // km, computed
}

export interface Service {
  id: string
  providerId: string
  title: string
  description: string
  category: ServiceCategory
  price: number
  priceType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE'
  duration?: number | null
  images: string[]
  isActive: boolean
}

export interface Booking {
  id: string
  clientId: string
  client: AuthUser
  providerId: string
  serviceId: string
  service: Service
  status: BookingStatus
  scheduledAt: string
  address?: string | null
  notes?: string | null
  totalAmount: number
  platformFee: number
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  sender: AuthUser
  content?: string | null
  type: MessageType
  audioUrl?: string | null
  isDeleted: boolean
  createdAt: string
}

export interface Conversation {
  id: string
  participants: AuthUser[]
  lastMessage?: string | null
  lastMessageAt?: string | null
  messages?: Message[]
}

export interface Transaction {
  id: string
  bookingId: string
  userId: string
  amount: number
  currency: string
  platformFee: number
  providerAmount: number
  status: TransactionStatus
  provider: 'STRIPE' | 'PAYPAL'
  createdAt: string
}

export interface Review {
  id: string
  bookingId: string
  authorId: string
  author: AuthUser
  providerId: string
  rating: number
  comment?: string | null
  createdAt: string
}

// ─── API RESPONSE SHAPES ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── SEARCH/FILTER PARAMS ─────────────────────────────────────────────────────

export interface SearchParams {
  query?: string
  category?: ServiceCategory
  lat?: number
  lng?: number
  radius?: number // km
  minPrice?: number
  maxPrice?: number
  minRating?: number
  isAvailable?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'distance' | 'rating' | 'price' | 'newest'
}

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────────

export interface SocketEvents {
  // Messages
  'message:send': { conversationId: string; content: string; type: MessageType; audioUrl?: string }
  'message:new': Message
  'message:delete': { messageId: string; conversationId: string }
  
  // Calls
  'call:initiate': { targetUserId: string; callType: 'voice' | 'video'; channelName: string }
  'call:incoming': { callerId: string; caller: AuthUser; callType: 'voice' | 'video'; channelName: string }
  'call:accept': { channelName: string }
  'call:reject': { channelName: string }
  'call:end': { channelName: string }
  
  // Presence
  'user:online': { userId: string }
  'user:offline': { userId: string }
  
  // Notifications
  'notification:new': { title: string; body: string; type: string }
}
