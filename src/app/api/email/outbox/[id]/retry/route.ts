import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { retryOutbox } from '@/lib/email-outbox'

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth()
  if (authErr) return authErr
  const { id } = await context.params

  const result = await retryOutbox(id)
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 })
  }
  return NextResponse.json(result)
}
