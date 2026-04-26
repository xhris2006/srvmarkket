import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle,
  CreditCard,
  Dumbbell,
  Droplets,
  Landmark,
  Leaf,
  Monitor,
  MoreHorizontal,
  Package,
  Paintbrush,
  PawPrint,
  Phone,
  Scissors,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'

export type CategoryOption = {
  value: string
  label: string
  icon: LucideIcon
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'CLEANING', label: 'Cleaning', icon: Sparkles },
  { value: 'REPAIR', label: 'Repair', icon: Wrench },
  { value: 'PLUMBING', label: 'Plumbing', icon: Droplets },
  { value: 'ELECTRICAL', label: 'Electrical', icon: Zap },
  { value: 'PAINTING', label: 'Painting', icon: Paintbrush },
  { value: 'MOVING', label: 'Moving', icon: Package },
  { value: 'GARDENING', label: 'Gardening', icon: Leaf },
  { value: 'COOKING', label: 'Cooking', icon: ShieldCheck },
  { value: 'TUTORING', label: 'Tutoring', icon: BookOpen },
  { value: 'BEAUTY', label: 'Beauty', icon: Scissors },
  { value: 'FITNESS', label: 'Fitness', icon: Dumbbell },
  { value: 'PET_CARE', label: 'Pet Care', icon: PawPrint },
  { value: 'IT_SUPPORT', label: 'IT Support', icon: Monitor },
  { value: 'PHOTOGRAPHY', label: 'Photography', icon: Camera },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
]

export function getCategoryOption(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)
}

export function getCategoryIcon(category: string): LucideIcon {
  return getCategoryOption(category)?.icon || MoreHorizontal
}

export function getCategoryLabel(category: string): string {
  return getCategoryOption(category)?.label || category
}

export function getNotificationIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    BOOKING_REQUEST: Calendar,
    BOOKING_UPDATE: Bell,
    PAYMENT_SUCCESS: CheckCircle,
    PAYMENT_RECEIVED: Wallet,
    CALL: Phone,
    DEFAULT: Bell,
  }

  return icons[type] || icons.DEFAULT
}

export const PAYMENT_METHODS: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Card', icon: CreditCard },
  { label: 'Apple Pay', icon: Smartphone },
  { label: 'Google Pay', icon: Wallet },
  { label: 'SEPA', icon: Landmark },
]

export const EMPTY_STATE_ICON = Search
export const RINGING_ICON = Phone
