import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('sales_agenda')
      .select(`
        *,
        lead:sales_leads(id, company_name, contact_name, phone, email, city, status)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching agenda:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in agenda API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    const { lead_id, title, description, type, date, start_time, end_time, location, assigned_to } = body

    if (!title || !date || !start_time) {
      return NextResponse.json({ error: 'Title, date and start_time are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sales_agenda')
      .insert({
        lead_id: lead_id || null,
        title,
        description: description || null,
        type: type || 'meeting',
        date,
        start_time,
        end_time: end_time || null,
        location: location || null,
        assigned_to: assigned_to || null,
      })
      .select(`
        *,
        lead:sales_leads(id, company_name, contact_name, phone, email, city, status)
      `)
      .single()

    if (error) {
      console.error('Error creating agenda item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in agenda API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sales_agenda')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        lead:sales_leads(id, company_name, contact_name, phone, email, city, status)
      `)
      .single()

    if (error) {
      console.error('Error updating agenda item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in agenda API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('sales_agenda')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting agenda item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in agenda API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
