import { NextRequest, NextResponse } from 'next/server'
import { workspaceDb as supabase } from '@/lib/supabase/workspace'
import { requireAuth } from '@/lib/api-auth'

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { lat: 51.9225, lng: 4.4792 },
  'Den Haag': { lat: 52.0705, lng: 4.3007 },
  'Utrecht': { lat: 52.0907, lng: 5.1214 },
  'Eindhoven': { lat: 51.4416, lng: 5.4697 },
  'Groningen': { lat: 53.2194, lng: 6.5665 },
  'Haarlem': { lat: 52.3874, lng: 4.6462 },
  'Leiden': { lat: 52.1601, lng: 4.4970 },
  'Arnhem': { lat: 51.9851, lng: 5.8987 },
  'Tilburg': { lat: 51.5555, lng: 5.0913 },
}

async function trackUsage() {
  const month = new Date().toISOString().slice(0, 7) // '2026-03'
  const { data } = await supabase
    .from('serpapi_usage')
    .select('searches_used')
    .eq('month', month)
    .single()

  if (data) {
    await supabase
      .from('serpapi_usage')
      .update({ searches_used: data.searches_used + 1 })
      .eq('month', month)
    return data.searches_used + 1
  } else {
    await supabase
      .from('serpapi_usage')
      .insert({ month, searches_used: 1, max_searches: 100 })
    return 1
  }
}

async function getUsage() {
  const month = new Date().toISOString().slice(0, 7)
  const { data } = await supabase
    .from('serpapi_usage')
    .select('searches_used, max_searches')
    .eq('month', month)
    .single()
  return data || { searches_used: 0, max_searches: 100 }
}

export async function POST(req: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const { query, city } = await req.json()

  if (!query) {
    return NextResponse.json({ error: 'query is verplicht' }, { status: 400 })
  }

  const serpApiKey = process.env.SERPAPI_KEY || process.env.SERP_API
  if (!serpApiKey) {
    return NextResponse.json({ error: 'SERPAPI_KEY niet geconfigureerd' }, { status: 500 })
  }

  // Check usage
  const usage = await getUsage()
  if (usage.searches_used >= usage.max_searches) {
    return NextResponse.json({
      error: `SerpAPI limiet bereikt (${usage.searches_used}/${usage.max_searches} searches deze maand)`,
      usage,
    }, { status: 429 })
  }

  // Build query: combine query + city if city provided separately
  const fullQuery = city && !query.toLowerCase().includes(city.toLowerCase())
    ? `${query} ${city}`
    : query

  // Get city coordinates for better results
  const coords = city ? CITY_COORDS[city] : null
  const ll = coords ? `@${coords.lat},${coords.lng},12z` : '@52.3676,4.9041,12z'

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: fullQuery,
    ll,
    hl: 'nl',
    gl: 'nl',
    type: 'search',
    api_key: serpApiKey,
  })

  try {
    const serpRes = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    if (!serpRes.ok) {
      const err = await serpRes.text()
      return NextResponse.json({ error: `SerpAPI fout: ${err}` }, { status: 502 })
    }

    const serpData = await serpRes.json()
    const rawResults = serpData.local_results || []

    // Track usage after successful call
    await trackUsage()

    // Parse results
    const leads = rawResults.map((r: Record<string, unknown>) => {
      const gps = r.gps_coordinates as { latitude?: number; longitude?: number } | undefined
      return {
        name: r.title as string,
        address: r.address as string | undefined,
        city: city || extractCity(r.address as string),
        phone: r.phone as string | undefined,
        website: r.website as string | undefined,
        google_rating: r.rating as number | undefined,
        google_reviews: r.reviews as number | undefined,
        google_url: r.link as string | undefined,
        google_place_id: r.place_id as string | undefined,
        thumbnail: r.thumbnail as string | undefined,
        categories: r.type ? [r.type as string] : [],
        search_query: fullQuery,
        source: 'scraper',
        status: 'new',
        enriched: false,
      }
    })

    // Upsert into Supabase (skip duplicates on name+city)
    const inserted: typeof leads = []
    const duplicates: string[] = []

    for (const lead of leads) {
      const { data, error } = await supabase
        .from('leads')
        .upsert(lead, {
          onConflict: 'name,city',
          ignoreDuplicates: true,
        })
        .select('id, name, city, website, phone, email, enriched, enrichment_error, google_rating, google_reviews, google_url, thumbnail, categories, instagram, facebook, linkedin, twitter, status, search_query, address, notes')
        .single()

      if (data) {
        inserted.push(data)
      } else if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        duplicates.push(lead.name)
        // Fetch existing
        const { data: existing } = await supabase
          .from('leads')
          .select('*')
          .eq('name', lead.name)
          .eq('city', lead.city || '')
          .single()
        if (existing) inserted.push({ ...existing, _duplicate: true })
      } else {
        // Try select if upsert returned nothing
        const { data: existing } = await supabase
          .from('leads')
          .select('*')
          .eq('name', lead.name)
          .eq('city', lead.city || '')
          .single()
        if (existing) inserted.push({ ...existing, _duplicate: true })
        else inserted.push({ ...lead, id: crypto.randomUUID() })
      }
    }

    // Save search history
    await supabase.from('search_history').insert({
      query: fullQuery,
      city: city || null,
      results_count: inserted.length,
      emails_found: inserted.filter((l: Record<string, unknown>) => l.email).length,
    })

    const newUsage = await getUsage()

    return NextResponse.json({
      leads: inserted,
      total: inserted.length,
      duplicates: duplicates.length,
      usage: newUsage,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  const usage = await getUsage()
  const { data: history } = await supabase
    .from('search_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ usage, history: history || [] })
}

// Known Dutch cities for validation
const KNOWN_CITIES: Record<string, string> = {
  'amsterdam': 'Amsterdam', 'rotterdam': 'Rotterdam', 'den haag': 'Den Haag',
  'the hague': 'Den Haag', "'s-gravenhage": 'Den Haag', 'utrecht': 'Utrecht',
  'eindhoven': 'Eindhoven', 'groningen': 'Groningen', 'haarlem': 'Haarlem',
  'leiden': 'Leiden', 'arnhem': 'Arnhem', 'tilburg': 'Tilburg', 'breda': 'Breda',
  'nijmegen': 'Nijmegen', 'almere': 'Almere', 'enschede': 'Enschede',
  'amersfoort': 'Amersfoort', 'apeldoorn': 'Apeldoorn', 'zwolle': 'Zwolle',
  'maastricht': 'Maastricht', 'delft': 'Delft', 'hilversum': 'Hilversum',
  'deventer': 'Deventer', 'leeuwarden': 'Leeuwarden', 'alkmaar': 'Alkmaar',
  'dordrecht': 'Dordrecht', 'zoetermeer': 'Zoetermeer', 'amstelveen': 'Amstelveen',
  'hoofddorp': 'Hoofddorp', 'zaandam': 'Zaandam', 'purmerend': 'Purmerend',
  'hoorn': 'Hoorn', 'gouda': 'Gouda', 'schiedam': 'Schiedam',
  'vlaardingen': 'Vlaardingen', 'heerlen': 'Heerlen', 'venlo': 'Venlo',
  'diemen': 'Diemen', 'den bosch': 'Den Bosch', "'s-hertogenbosch": 'Den Bosch',
  'nieuwegein': 'Nieuwegein', 'vianen': 'Vianen', 'baarn': 'Baarn',
  'bussum': 'Bussum', 'naarden': 'Naarden', 'huizen': 'Huizen',
  'woerden': 'Woerden', 'zeist': 'Zeist', 'bilthoven': 'Bilthoven',
  'soest': 'Soest', 'veenendaal': 'Veenendaal', 'ede': 'Ede',
  'wageningen': 'Wageningen', 'doetinchem': 'Doetinchem', 'harderwijk': 'Harderwijk',
}

function extractCity(address: string | undefined): string {
  if (!address) return ''

  // Dutch addresses: "Straat 1, 1234 AB, Amsterdam" or "Straat 1, Amsterdam"
  const parts = address.split(',').map(p => p.trim())

  // Only return known cities — never guess from unvalidated strings
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    if (!part) continue
    // Strip postal code prefix if combined: "1234 AB Amsterdam" → "Amsterdam"
    const withoutPostal = part.replace(/^\d{4}\s?[A-Za-z]{2}\s+/, '').trim()
    const known = KNOWN_CITIES[withoutPostal.toLowerCase()]
    if (known) return known
    // Also try just the last word (e.g. "Amsterdam-West" → "Amsterdam")
    const lastWord = withoutPostal.split(/[\s-]+/).pop() || ''
    const knownLast = KNOWN_CITIES[lastWord.toLowerCase()]
    if (knownLast) return knownLast
  }

  // Nothing found — return empty, never store unvalidated strings as city
  return ''
}
