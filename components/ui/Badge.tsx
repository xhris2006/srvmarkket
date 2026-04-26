// ─── BADGE COMPONENT ──────────────────────────────────────────────────────────
import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variants = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

const dotColors = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variants[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

// ─── BOOKING STATUS BADGE ─────────────────────────────────────────────────────
export function BookingStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string; dot?: boolean }> = {
    PENDING:     { variant: 'warning',  label: 'Pending',     dot: true },
    ACCEPTED:    { variant: 'info',     label: 'Accepted',    dot: true },
    IN_PROGRESS: { variant: 'purple',   label: 'In Progress', dot: true },
    COMPLETED:   { variant: 'success',  label: 'Completed' },
    CANCELLED:   { variant: 'default',  label: 'Cancelled' },
    REJECTED:    { variant: 'error',    label: 'Rejected' },
  }
  const c = config[status] || { variant: 'default', label: status }
  return <Badge variant={c.variant} dot={c.dot}>{c.label}</Badge>
}

// ─── TRANSACTION STATUS BADGE ─────────────────────────────────────────────────
export function TransactionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING:    { variant: 'warning', label: 'Pending' },
    PROCESSING: { variant: 'info',    label: 'Processing' },
    COMPLETED:  { variant: 'success', label: 'Paid' },
    FAILED:     { variant: 'error',   label: 'Failed' },
    REFUNDED:   { variant: 'default', label: 'Refunded' },
  }
  const c = config[status] || { variant: 'default', label: status }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
