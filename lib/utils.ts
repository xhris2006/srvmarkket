// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes safely, resolving conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a number as a USD currency string */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Truncates a string to maxLength, adding ellipsis if needed */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/** Converts a category enum value to a display label */
export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    CLEANING: 'Cleaning',
    REPAIR: 'Repair',
    PLUMBING: 'Plumbing',
    ELECTRICAL: 'Electrical',
    PAINTING: 'Painting',
    MOVING: 'Moving',
    GARDENING: 'Gardening',
    COOKING: 'Cooking',
    TUTORING: 'Tutoring',
    BEAUTY: 'Beauty',
    FITNESS: 'Fitness',
    PET_CARE: 'Pet Care',
    IT_SUPPORT: 'IT Support',
    PHOTOGRAPHY: 'Photography',
    OTHER: 'Other',
  }
  return map[category] || category
}

/** Returns a category icon emoji */
export function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    CLEANING: '🧹', REPAIR: '🔧', PLUMBING: '🪛',
    ELECTRICAL: '⚡', PAINTING: '🎨', MOVING: '📦',
    GARDENING: '🌿', COOKING: '🍳', TUTORING: '📚',
    BEAUTY: '💅', FITNESS: '💪', PET_CARE: '🐾',
    IT_SUPPORT: '💻', PHOTOGRAPHY: '📸', OTHER: '✨',
  }
  return map[category] || '🔹'
}

/** Generates a unique room/channel name for calls */
export function generateChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort().join('-')
  return `call-${sorted}-${Date.now()}`
}

/** Delays execution by ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Safely parses JSON, returning null on error */
export function safeJsonParse<T>(str: string): T | null {
  try { return JSON.parse(str) as T }
  catch { return null }
}

/** Converts meters to kilometers with 1 decimal */
export function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(1)
}

/** Checks if a URL is a valid absolute URL */
export function isValidUrl(url: string): boolean {
  try { new URL(url); return true }
  catch { return false }
}

/** Returns initials from a full name (max 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('')
}

/** Formats seconds as MM:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
