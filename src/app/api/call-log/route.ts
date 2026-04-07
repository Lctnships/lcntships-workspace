import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD format

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Get all call/voicemail activities for the given date
    const { data: activities, error: activitiesError } = await supabase
      .from('lead_activities')
      .select('*')
      .in('type', ['call', 'voicemail', 'email', 'meeting', 'note'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json({ error: activitiesError.message }, { status: 500 })
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ activities: [], leads: [] })
    }

    // Get unique lead IDs
    const leadIds = [...new Set(activities.map(a => a.lead_id))]

    // Fetch the associated leads
    const { data: leads, error: leadsError } = await supabase
      .from('sales_leads')
      .select('*')
      .in('id', leadIds)

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    // Get dates that have activities (for the calendar navigation)
    const { data: dateList, error: dateError } = await supabase
      .from('lead_activities')
      .select('created_at')
      .in('type', ['call', 'voicemail', 'email', 'meeting', 'note'])
      .order('created_at', { ascending: false })
      .limit(500)

    const activeDates = dateList
      ? [...new Set(dateList.map(d => d.created_at.split('T')[0]))]
      : []

    return NextResponse.json({
      activities: activities || [],
      leads: leads || [],
      activeDates,
    })
  } catch (error) {
    console.error('Error in call-log API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
