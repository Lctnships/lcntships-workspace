import { NextResponse } from 'next/server'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

export async function GET() {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {

    const { data, error } = await supabase
      .from('sales_leads')
      .select('id, company_name, contact_name, email, phone, city, address, website, status, source, notes')
      .order('updated_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in leads API:', error)
    return NextResponse.json([], { status: 500 })
  }
}
