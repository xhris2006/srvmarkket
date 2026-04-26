// ─── AVATAR COMPONENT ─────────────────────────────────────────────────────────
import { clsx } from 'clsx'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
}

const dotSizes = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
}

/**
 * Deterministically picks a gradient class from the user's name
 * so the same user always gets the same color.
 */
function getGradient(name: string): string {
  const gradients = [
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-pink-400 to-pink-600',
    'from-green-400 to-green-600',
    'from-orange-400 to-orange-600',
    'from-cyan-400 to-cyan-600',
    'from-red-400 to-red-600',
    'from-indigo-400 to-indigo-600',
  ]
  const index = name.charCodeAt(0) % gradients.length
  return gradients[index]
}

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const safeName = name?.trim() || 'Utilisateur'

  const initials = safeName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={safeName}
          className={clsx(sizes[size], 'rounded-full object-cover')}
        />
      ) : (
        <div
          className={clsx(
            sizes[size],
            'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold',
            getGradient(safeName)
          )}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            dotSizes[size],
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            online ? 'bg-green-400' : 'bg-gray-300'
          )}
        />
      )}
    </div>
  )
}
