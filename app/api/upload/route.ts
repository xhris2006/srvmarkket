import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'profiles')

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await verifyAccessToken(token)

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image uploads are allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large (max 5MB)' }, { status: 400 })
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const ext = file.name.split('.').pop() || 'png'
    const filename = `profile-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await writeFile(join(UPLOAD_DIR, filename), buffer)

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/profiles/${filename}`,
        filename,
      },
    })
  } catch (error) {
    console.error('[Upload Profile]', error)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}
