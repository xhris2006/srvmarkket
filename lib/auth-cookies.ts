const DURATION_PATTERN = /^(\d+)\s*([smhd])?$/i

function durationToSeconds(value: string | undefined, fallback: string): number {
  const duration = (value || fallback).trim()
  const match = DURATION_PATTERN.exec(duration)

  if (!match) {
    return durationToSeconds(fallback, '7d')
  }

  const amount = Number(match[1])
  const unit = (match[2] || 's').toLowerCase()

  switch (unit) {
    case 'd':
      return amount * 24 * 60 * 60
    case 'h':
      return amount * 60 * 60
    case 'm':
      return amount * 60
    default:
      return amount
  }
}

export const ACCESS_TOKEN_MAX_AGE = durationToSeconds(process.env.JWT_ACCESS_EXPIRES_IN, '15m')
export const REFRESH_TOKEN_MAX_AGE = durationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN, '7d')

