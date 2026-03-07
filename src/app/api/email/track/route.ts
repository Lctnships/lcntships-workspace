import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Only create client if env vars are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && serviceKey 
  ? createClient(supabaseUrl, serviceKey)
  : null

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const emailId = searchParams.get('id')
    const linkUrl = searchParams.get('url')

    if (!emailId) {
      return new NextResponse('Missing email ID', { status: 400 })
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Track in database (if configured)
    if (type === 'open' && supabaseAdmin) {
      await supabaseAdmin.from('email_tracking').insert({
        email_id: emailId,
        tracking_type: 'open',
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      // Return tracking pixel
      return new NextResponse(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }

    if (type === 'click' && linkUrl && supabaseAdmin) {
      // Validate URL to prevent open redirect attacks (OWASP A07)
      let parsedUrl: URL
      try {
        parsedUrl = new URL(linkUrl)
      } catch {
        return new NextResponse('Invalid URL', { status: 400 })
      }
      const allowedHosts = ['lcntships.com', 'www.lcntships.com', 'localhost']
      if (!allowedHosts.includes(parsedUrl.hostname)) {
        return new NextResponse('Redirect not allowed', { status: 403 })
      }

      await supabaseAdmin.from('email_tracking').insert({
        email_id: emailId,
        tracking_type: 'click',
        link_url: linkUrl,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      // Redirect to the actual URL
      return NextResponse.redirect(linkUrl)
    }

    return new NextResponse('Invalid tracking type', { status: 400 })

  } catch (error) {
    console.error('Tracking error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}
