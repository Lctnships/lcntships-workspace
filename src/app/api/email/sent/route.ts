import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    const result = await resend.emails.list()

    if (!result.data) {
      return NextResponse.json({ error: 'Kon emails niet ophalen van Resend' }, { status: 500 })
    }

    const emailList: any[] = Array.isArray((result.data as any).data)
      ? (result.data as any).data
      : Array.isArray(result.data)
      ? result.data
      : []

    const emails = emailList.map((e: any) => ({
      id: e.id,
      subject: e.subject || '(geen onderwerp)',
      from: { name: e.from || '', email: e.from || '' },
      to: (e.to || []).map((addr: string) => ({ name: '', email: addr })),
      date: e.created_at,
      body: '',
      isRead: true,
      isStarred: false,
      folder: 'sent' as const,
      status: e.last_event || 'sent',
    }))

    return NextResponse.json({ emails })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    console.error('[RESEND SENT ERROR]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
