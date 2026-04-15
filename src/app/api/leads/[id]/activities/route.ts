import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { id } = await params

    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(activities || [])
  } catch (error) {
    console.error('Error in activities API:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { id } = await params
    const body = await request.json()

    const { type, summary, notes, metadata } = body

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    // Insert the activity
    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: id,
        type,
        summary: summary || null,
        notes: notes || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update last_contacted_at on the lead if it's a contact-type activity
    if (['call', 'voicemail', 'email', 'meeting'].includes(type)) {
      await supabase
        .from('sales_leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', id)
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error in activities API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
