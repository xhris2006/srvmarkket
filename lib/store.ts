// ─── ZUSTAND GLOBAL STATE STORE ───────────────────────────────────────────────
// Central state management for auth, UI, notifications

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AuthUser, Conversation, Message } from '@/types'

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
)

// ─── CHAT STORE ───────────────────────────────────────────────────────────────
interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]> // conversationId -> messages
  onlineUsers: Set<string>
  typingUsers: Record<string, string[]> // conversationId -> userIds
  
  setConversations: (convs: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  deleteMessage: (conversationId: string, messageId: string) => void
  setUserOnline: (userId: string) => void
  setUserOffline: (userId: string) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  onlineUsers: new Set(),
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),
  
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),
    
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),
    
  deleteMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, isDeleted: true } : m
        ),
      },
    })),
    
  setUserOnline: (userId) =>
    set((state) => ({
      onlineUsers: new Set([...state.onlineUsers, userId]),
    })),
    
  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers)
      next.delete(userId)
      return { onlineUsers: next }
    }),
    
  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || []
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: isTyping
            ? [...current.filter((id) => id !== userId), userId]
            : current.filter((id) => id !== userId),
        },
      }
    }),
}))

// ─── CALL STORE ───────────────────────────────────────────────────────────────
interface CallState {
  activeCall: {
    channelName: string
    callType: 'voice' | 'video'
    peerId: string
    status: 'ringing' | 'active' | 'ended'
  } | null
  incomingCall: {
    callerId: string
    callerName: string
    callerAvatar?: string
    callType: 'voice' | 'video'
    channelName: string
  } | null
  isMuted: boolean
  isCameraOff: boolean
  
  setActiveCall: (call: CallState['activeCall']) => void
  setIncomingCall: (call: CallState['incomingCall']) => void
  endCall: () => void
  toggleMute: () => void
  toggleCamera: () => void
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  incomingCall: null,
  isMuted: false,
  isCameraOff: false,
  
  setActiveCall: (activeCall) => set({ activeCall, incomingCall: null }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  endCall: () => set({ activeCall: null, incomingCall: null, isMuted: false, isCameraOff: false }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
}))

// ─── NOTIFICATION STORE ───────────────────────────────────────────────────────
interface NotificationState {
  notifications: Array<{ id: string; title: string; body: string; type: string; isRead: boolean }>
  unreadCount: number
  addNotification: (n: Omit<NotificationState['notifications'][0], 'isRead'>) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((state) => ({
      notifications: [{ ...n, isRead: false }, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}))
