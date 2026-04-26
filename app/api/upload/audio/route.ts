import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken } from '@/lib/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get('Authorization'))
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await verifyAccessToken(token)

    const formData = await req.formData()
    const file = formData.get('audio') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'Storage not configured' }, { status: 500 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUri = `data:audio/webm;base64,${base64}`

    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha1')
      .update(`folder=voice-messages&resource_type=video&timestamp=${timestamp}${apiSecret}`)
      .digest('hex')

    const uploadData = new FormData()
    uploadData.append('file', dataUri)
    uploadData.append('api_key', apiKey)
    uploadData.append('timestamp', String(timestamp))
    uploadData.append('signature', signature)
    uploadData.append('folder', 'voice-messages')
    uploadData.append('resource_type', 'video')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: 'POST',
      body: uploadData,
    })
    const result = await res.json()

    if (!res.ok || !result.secure_url) {
      console.error('[Upload Audio] Cloudinary error:', result)
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { url: result.secure_url } })
  } catch (error) {
    console.error('[Upload Audio]', error)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}
