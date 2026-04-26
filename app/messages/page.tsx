'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { Avatar } from '@/components/ui/Avatar'
import { useChatStore } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  id: string
  participants: Array<{
    userId: string
    user: { id: string; name: string; avatar?: string | null }
  }>
  lastMessage?: string | null
  lastMessageAt?: string | null
}

export default function MessagesPage() {
  const { user, accessToken } = useAuthStore()
  const { onlineUsers } = useChatStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/messages', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setConversations(d.data) })
      .finally(() => setIsLoading(false))
  }, [accessToken])

  const filtered = conversations.filter((conv) => {
    if (!search) return true
    const other = conv.participants.find((p) => p.userId !== user?.id)
    return other?.user.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          Messages
        </h1>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-4">
          <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No conversations yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Message a provider to get started
          </p>
          <a
            href="/search"
            className="inline-block mt-4 gradient-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Find a Provider
          </a>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((conv) => {
            const other = conv.participants.find((p) => p.userId !== user?.id)
            if (!other) return null
            const isOnline = onlineUsers.has(other.userId)

            return (
              <a
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <Avatar
                  src={other.user.avatar}
                  name={other.user.name}
                  size="md"
                  online={isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">{other.user.name}</p>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage || 'Start a conversation'}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
