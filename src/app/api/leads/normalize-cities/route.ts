import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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

    // 2. Normalize each city value with simple rules
    const ALIASES: Record<string, string> = {
      'the hague': 'Den Haag',
      'den haag': 'Den Haag',
      '\'s-gravenhage': 'Den Haag',
      's-gravenhage': 'Den Haag',
      'den bosch': 'Den Bosch',
      '\'s-hertogenbosch': 'Den Bosch',
      's-hertogenbosch': 'Den Bosch',
      'amsterdam': 'Amsterdam',
      'rotterdam': 'Rotterdam',
      'utrecht': 'Utrecht',
      'eindhoven': 'Eindhoven',
      'groningen': 'Groningen',
      'arnhem': 'Arnhem',
      'haarlem': 'Haarlem',
      'tilburg': 'Tilburg',
      'breda': 'Breda',
      'nijmegen': 'Nijmegen',
      'almere': 'Almere',
      'enschede': 'Enschede',
      'amersfoort': 'Amersfoort',
      'apeldoorn': 'Apeldoorn',
      'zwolle': 'Zwolle',
      'leiden': 'Leiden',
      'maastricht': 'Maastricht',
      'delft': 'Delft',
      'hilversum': 'Hilversum',
      'deventer': 'Deventer',
      'leeuwarden': 'Leeuwarden',
      'alkmaar': 'Alkmaar',
      'dordrecht': 'Dordrecht',
      'zoetermeer': 'Zoetermeer',
      'amstelveen': 'Amstelveen',
      'hoofddorp': 'Hoofddorp',
      'zaandam': 'Zaandam',
      'purmerend': 'Purmerend',
      'hoorn': 'Hoorn',
      'gouda': 'Gouda',
      'schiedam': 'Schiedam',
      'vlaardingen': 'Vlaardingen',
      'heerlen': 'Heerlen',
      'venlo': 'Venlo',
      'diemen': 'Diemen',
    }

    function normalize(raw: string): string | null {
      const trimmed = raw.trim()
      const lower = trimmed.toLowerCase()

      // Direct alias match
      if (ALIASES[lower]) return ALIASES[lower]

      // If it contains a comma, check last part (e.g. "Rokin 75, Amsterdam")
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim())
        for (let i = parts.length - 1; i >= 0; i--) {
          const partLower = parts[i].toLowerCase()
          if (ALIASES[partLower]) return ALIASES[partLower]
        }
      }

      // If it contains digits, it's probably a street address → null
      if (/\d/.test(trimmed)) return null

      // If it's already a properly capitalized known city, keep it
      if (Object.values(ALIASES).includes(trimmed)) return trimmed

      // Check if a known city appears inside the value
      for (const [alias, canonical] of Object.entries(ALIASES)) {
        if (lower.includes(alias) && alias.length > 3) return canonical
      }

      // Short-ish text without numbers — probably a valid city, capitalize first letter
      if (trimmed.length <= 30) {
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
      }

      return null
    }

    // 3. Build batch updates
    const updateGroups = new Map<string, string[]>() // "newCity" or "__null__" → [leadIds]
    let skipped = 0

    for (const lead of leads) {
      const original = lead.city as string
      const normalized = normalize(original)

      if (normalized === original) {
        skipped++
        continue
      }

      const key = normalized ?? '__null__'
      if (!updateGroups.has(key)) updateGroups.set(key, [])
      updateGroups.get(key)!.push(lead.id)
    }

    // 4. Execute batch updates
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
      message: `${updated} leads bijgewerkt`,
      updated,
      skipped,
      totalLeads: leads.length,
      changes,
    })
  } catch (error) {
    console.error('Error normalizing cities:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
