import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get all leads with a city value
    const { data: leads, error } = await supabase
      .from('sales_leads')
      .select('id, city')
      .not('city', 'is', null)
      .neq('city', '')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: 'No leads with city values', updated: 0 })
    }

    // 2. Get unique city values
    const uniqueCities = [...new Set(leads.map(l => l.city).filter(Boolean))] as string[]

    // 3. Ask Haiku to normalize
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Je bent een data-normalisatie expert voor Nederlandse steden.

Hieronder staat een JSON array van city-waarden uit een database. Sommige zijn correcte stadsnamen, maar andere bevatten straatnamen, adressen, postcodes, of Engelse namen.

Normaliseer elke waarde naar de juiste Nederlandse stadsnaam. Regels:
- "The Hague" → "Den Haag"
- "'s-Gravenhage" → "Den Haag"
- "'s-Hertogenbosch" → "Den Bosch"
- Straatnamen met een stad erin (bijv. "Coolsingel 5, Rotterdam") → "Rotterdam"
- Postcodes: gebruik het postcode-prefix om de stad te bepalen (1000-1099 = Amsterdam, 3000-3099 = Rotterdam, 2500-2599 = Den Haag, etc.)
- Als je de stad echt niet kunt bepalen, return null

Return ALLEEN een JSON object waar de keys de originele waarden zijn en de values de genormaliseerde stadsnaam (of null). Geen uitleg, geen markdown, puur JSON.

${JSON.stringify(uniqueCities)}`
      }]
    })

    // 4. Parse Haiku's response
    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 })
    }

    let cityMap: Record<string, string | null>
    try {
      // Strip potential markdown fences
      const cleaned = textBlock.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      cityMap = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response', raw: textBlock.text }, { status: 500 })
    }

    // 5. Bulk update leads
    let updated = 0
    const changes: Array<{ from: string; to: string | null }> = []

    for (const lead of leads) {
      const originalCity = lead.city as string
      const normalizedCity = cityMap[originalCity]

      // Skip if no mapping, or already correct
      if (normalizedCity === undefined || normalizedCity === originalCity) continue

      if (normalizedCity === null) {
        // Clear invalid city values
        const { error: updateErr } = await supabase
          .from('sales_leads')
          .update({ city: null })
          .eq('id', lead.id)

        if (!updateErr) {
          updated++
          changes.push({ from: originalCity, to: null })
        }
      } else {
        const { error: updateErr } = await supabase
          .from('sales_leads')
          .update({ city: normalizedCity })
          .eq('id', lead.id)

        if (!updateErr) {
          updated++
          changes.push({ from: originalCity, to: normalizedCity })
        }
      }
    }

    // Deduplicate changes for summary
    const uniqueChanges = [...new Map(changes.map(c => [`${c.from}→${c.to}`, c])).values()]

    return NextResponse.json({
      message: `${updated} leads updated`,
      updated,
      totalLeads: leads.length,
      uniqueCities: uniqueCities.length,
      mapping: cityMap,
      changes: uniqueChanges,
    })
  } catch (error) {
    console.error('Error normalizing cities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
