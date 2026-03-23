import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // 1. Get all leads with a city value
    const { data: leads, error } = await supabase
      .from('sales_leads')
      .select('id, city')
      .not('city', 'is', null)
      .neq('city', '')

    if (error) {
      return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: 'No leads with city values', updated: 0 })
    }

    // 2. Get unique city values
    const uniqueCities = [...new Set(leads.map(l => l.city).filter(Boolean))] as string[]

    // 3. Ask Haiku to normalize
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Je bent een data-normalisatie expert voor Nederlandse steden.

Hieronder staat een JSON array van city-waarden uit een database. Sommige zijn correcte stadsnamen, maar andere bevatten straatnamen, adressen, postcodes, of Engelse namen.

Normaliseer elke waarde naar de juiste Nederlandse stadsnaam. Regels:
- "The Hague" → "Den Haag"
- "'s-Gravenhage" → "Den Haag"
- "'s-Hertogenbosch" → "Den Bosch"
- "amsterdam" (lowercase) → "Amsterdam" (capitalize)
- Straatnamen zoals "Rokin 75", "Atlantisplein 1", "Kerkstraat 266HS" → als je WEET dat deze straat in een specifieke stad ligt (bijv. omdat je dat weet van Google Maps data), geef die stad. Zo niet, return null.
- Straatnamen met een stad erin (bijv. "Coolsingel 5, Rotterdam") → "Rotterdam"
- Als een waarde al een correcte stadsnaam is, return die (met juiste hoofdletters)
- Als je de stad echt niet kunt bepalen uit een straatnaam, return null

Return ALLEEN een JSON object waar de keys de originele waarden zijn en de values de genormaliseerde stadsnaam (of null). Geen uitleg, geen markdown code blocks, puur JSON.

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
      const cleaned = textBlock.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      cityMap = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response', raw: textBlock.text }, { status: 500 })
    }

    // 5. Batch updates by normalized city to reduce DB calls
    const updateGroups = new Map<string | null, string[]>() // normalizedCity → [leadIds]

    for (const lead of leads) {
      const originalCity = lead.city as string
      const normalizedCity = cityMap[originalCity]

      // Skip if no mapping found, or already correct
      if (normalizedCity === undefined || normalizedCity === originalCity) continue

      const key = normalizedCity ?? '__null__'
      if (!updateGroups.has(key)) updateGroups.set(key, [])
      updateGroups.get(key)!.push(lead.id)
    }

    let updated = 0
    const changes: Array<{ to: string | null; count: number }> = []

    for (const [key, ids] of updateGroups) {
      const newCity = key === '__null__' ? null : key
      const { error: updateErr } = await supabase
        .from('sales_leads')
        .update({ city: newCity })
        .in('id', ids)

      if (!updateErr) {
        updated += ids.length
        changes.push({ to: newCity, count: ids.length })
      }
    }

    return NextResponse.json({
      message: `${updated} leads updated`,
      updated,
      totalLeads: leads.length,
      uniqueValues: uniqueCities.length,
      mapping: cityMap,
      changes,
    })
  } catch (error) {
    console.error('Error normalizing cities:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal error: ${message}` }, { status: 500 })
  }
}
