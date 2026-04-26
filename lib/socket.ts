export function getSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001'
  }

  return null
}
