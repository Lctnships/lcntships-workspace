import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/api-auth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    const { csvContent } = await request.json()

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'CSV content is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Limit CSV size to prevent abuse (max ~100KB)
    if (csvContent.length > 100000) {
      return NextResponse.json(
        { error: 'CSV bestand is te groot. Maximum 100KB.' },
        { status: 400 }
      )
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Je bent een data-assistent voor een studio-verhuur platform (lcntships). Analyseer het volgende CSV bestand en extraheer sales leads.

Geef voor elke rij een JSON object met deze velden:
- company_name (verplicht - bedrijfsnaam)
- contact_name (contactpersoon)
- email
- phone (telefoonnummer)
- city (stad)
- address (adres)
- website
- notes (extra info, industrie, etc.)
- status: altijd "cold"
- source: "CSV Import"

Regels:
- Combineer first name + last name als er aparte kolommen zijn
- Sla rijen zonder bedrijfsnaam over
- Herken zowel Nederlandse als Engelse kolomnamen
- Als er kolommen zijn die niet direct mappen, zet ze in "notes"

Geef ALLEEN een JSON array terug, geen uitleg. Voorbeeld:
[{"company_name": "Bedrijf BV", "contact_name": "Jan Jansen", "email": "jan@bedrijf.nl"}]

CSV data:
${csvContent}`
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const leads = JSON.parse(jsonStr)

    if (!Array.isArray(leads)) {
      return NextResponse.json(
        { error: 'Ongeldig antwoord van AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leads,
      count: leads.length,
      model: 'claude-haiku-4-5',
    })
  } catch (error) {
    console.error('CSV analyze error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Kon het CSV bestand niet verwerken. Controleer het formaat.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Er ging iets mis bij de analyse. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}
