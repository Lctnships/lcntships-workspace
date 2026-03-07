import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { id } = await params

    // Get emails sent to this lead
    const { data: emails, error } = await supabase
      .from('sent_emails')
      .select('subject, sent_at, status')
      .eq('lead_id', id)
      .order('sent_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching emails:', error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(emails || [])
  } catch (error) {
    console.error('Error in emails API:', error)
    return NextResponse.json([], { status: 500 })
  }
}
