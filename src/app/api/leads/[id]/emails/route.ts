import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
