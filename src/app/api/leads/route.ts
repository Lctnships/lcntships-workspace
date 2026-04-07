import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

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
