import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { account, to, subject, body } = await req.json()

  if (!account || !to || !subject || !body) {
    return NextResponse.json({ error: 'account, to, subject en body zijn verplicht' }, { status: 400 })
  }

  const smtpHost = account.smtpHost === 'lctnships.com' ? 'mail.lctnships.com' : account.smtpHost

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: account.smtpPort || 587,
    secure: account.smtpPort === 465,
    auth: {
      user: account.user,
      pass: account.password,
    },
    tls: { rejectUnauthorized: false },
  })

  try {
    await transporter.sendMail({
      from: `${account.name} <${account.user}>`,
      to,
      subject,
      text: body,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Versturen mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
