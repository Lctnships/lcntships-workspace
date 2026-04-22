import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb } from '@/lib/supabase/workspace'
import { randomBytes } from 'crypto'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const BUCKET = 'document-assets'

export async function POST(req: NextRequest) {
  const { user, error: authErr } = await requireAuth()
  if (authErr) return authErr

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Verwacht multipart/form-data' }, { status: 400 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Geen file in request' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Filetype niet toegestaan: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Bestand te groot (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${user!.id}/${randomBytes(12).toString('hex')}.${ext}`

  const { error: uploadErr } = await workspaceDb.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadErr) {
    console.error('[storage upload]', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: pub } = workspaceDb.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, path })
}
