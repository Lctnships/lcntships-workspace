import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { data: null, error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = (result.error as ZodError).issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    )
    return {
      data: null,
      error: NextResponse.json({ error: 'Validation failed', issues }, { status: 400 }),
    }
  }
  return { data: result.data, error: null }
}
