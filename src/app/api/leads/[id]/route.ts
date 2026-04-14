import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete related activities first
    await supabase.from('lead_activities').delete().eq('lead_id', id)

    // Delete related agenda items
    await supabase.from('sales_agenda').delete().eq('lead_id', id)

    // Delete the lead
    const { error } = await supabase
      .from('sales_leads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting lead:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in lead delete API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
