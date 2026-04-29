import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken } from '@/lib/auth'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'audio')

function getAudioExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension

  if (file.type.includes('mp4')) return 'm4a'
  if (file.type.includes('mpeg')) return 'mp3'
  if (file.type.includes('ogg')) return 'ogg'
  if (file.type.includes('wav')) return 'wav'
  return 'webm'
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get('Authorization'))
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await verifyAccessToken(token)

    const formData = await req.formData()
    const file = formData.get('audio') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 })
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ success: false, error: 'Only audio uploads are allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true })
      }

      const extension = getAudioExtension(file)
      const filename = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
      await writeFile(join(UPLOAD_DIR, filename), buffer)

      return NextResponse.json({
        success: true,
        data: { url: `/uploads/audio/${filename}`, filename },
      })
    }

    const base64 = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

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
