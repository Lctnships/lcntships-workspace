import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/with-rate-limit'
import { z } from 'zod'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'
import { parseJson } from '@/lib/api-validate'
import { requireAuth } from '@/lib/api-auth'

const AgendaCreateBody = z.object({
  lead_id: z.string().max(200).nullable().optional(),
  title: z.string().max(2000).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: z.string().max(64).optional(),
  date: z.string().max(64).optional(),
  start_time: z.string().max(64).optional(),
  end_time: z.string().max(64).nullable().optional(),
  location: z.string().max(2000).nullable().optional(),
  assigned_to: z.string().max(200).nullable().optional(),
  attendees: z.array(z.string().max(200)).max(1000).optional(),
}).passthrough()

const AgendaPatchBody = z.object({
  id: z.string().max(200).optional(),
}).passthrough()

export async function GET(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
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

async function _POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: body, error: __validationError } = await parseJson(request, AgendaCreateBody)
    if (__validationError) return __validationError

    const { lead_id, title, description, type, date, start_time, end_time, location, assigned_to, attendees } = body

    if (!title || !date || !start_time) {
      return NextResponse.json({ error: 'Title, date and start_time are required' }, { status: 400 })
    }

    // Normalise attendees: if not provided but assigned_to is, seed the array
    const attendeeList: string[] = Array.isArray(attendees) && attendees.length > 0
      ? attendees
      : assigned_to
      ? [assigned_to]
      : []

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
        assigned_to: attendeeList[0] || assigned_to || null,
        attendees: attendeeList,
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

async function _PATCH(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { data: body, error: __validationError } = await parseJson(request, AgendaPatchBody)
    if (__validationError) return __validationError
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

async function _DELETE(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
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

export const POST = withRateLimit(_POST, { limit: 60, windowSec: 60, route: 'agenda:POST' })
export const PATCH = withRateLimit(_PATCH, { limit: 60, windowSec: 60, route: 'agenda:PATCH' })
export const DELETE = withRateLimit(_DELETE, { limit: 60, windowSec: 60, route: 'agenda:DELETE' })
