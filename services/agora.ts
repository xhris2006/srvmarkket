// ─── AGORA CALL SERVICE ───────────────────────────────────────────────────────
// Wraps Agora RTC SDK operations for voice and video calls
// Install: npm install agora-rtc-sdk-ng

'use client'

import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'

interface AgoraCallOptions {
  channelName: string
  callType: 'voice' | 'video'
  appId: string
  token: string
  uid: number
}

/**
 * Initialises and joins an Agora channel.
 * Returns the client and local tracks so the caller can manage cleanup.
 */
export async function joinAgoraChannel(options: AgoraCallOptions) {
  // Dynamic import so Next.js doesn't try to SSR the browser SDK
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

  // Join the channel
  await client.join(options.appId, options.channelName, options.token, options.uid)

  // Create local audio track (always needed)
  const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()

  // Create local video track (only for video calls)
  const localVideoTrack = options.callType === 'video'
    ? await AgoraRTC.createCameraVideoTrack()
    : null

  const tracksToPublish = localVideoTrack
    ? [localAudioTrack, localVideoTrack]
    : [localAudioTrack]

  await client.publish(tracksToPublish)

  return { client, localAudioTrack, localVideoTrack }
}

/**
 * Cleanly leaves an Agora channel and releases all media resources.
 */
export async function leaveAgoraChannel(
  client: IAgoraRTCClient,
  localAudioTrack: IMicrophoneAudioTrack | null,
  localVideoTrack: ICameraVideoTrack | null
) {
  localAudioTrack?.stop()
  localAudioTrack?.close()
  localVideoTrack?.stop()
  localVideoTrack?.close()
  await client.leave()
}

/**
 * Fetches a fresh Agora token from our backend for a given channel.
 */
export async function fetchAgoraToken(channelName: string, accessToken: string): Promise<{
  token: string
  uid: number
  appId: string
} | null> {
  try {
    const res = await fetch('/api/calls/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ channelName }),
    })
    const data = await res.json()
    if (data.success) return data.data
    return null
  } catch {
    return null
  }
}
