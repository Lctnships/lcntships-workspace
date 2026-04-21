import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ShotItem {
  shot: string
  description?: string
}

interface ContentBriefingEmailProps {
  briefTitle: string
  studioName: string
  shootDate?: string | null
  callTime?: string | null
  endTime?: string | null
  location?: string | null
  contactPerson?: string | null
  contactPhone?: string | null
  description?: string | null
  shotlist?: ShotItem[]
  equipment?: string[]
  deliverables?: string | null
  notes?: string | null
  briefUrl: string
  senderName?: string
}

export default function ContentBriefingEmail({
  briefTitle,
  studioName,
  shootDate,
  callTime,
  endTime,
  location,
  contactPerson,
  contactPhone,
  description,
  shotlist = [],
  equipment = [],
  deliverables,
  notes,
  briefUrl,
  senderName = 'lctnships',
}: ContentBriefingEmailProps) {
  const formatDate = (d?: string | null) => {
    if (!d) return null
    try {
      return new Date(d).toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return d
    }
  }

  return (
    <Html>
      <Head />
      <Preview>Content briefing: {briefTitle} — {studioName}</Preview>
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Section style={{ backgroundColor: '#0f172a', padding: '32px 32px 24px 32px' }}>
            <Text style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>
              Content briefing
            </Text>
            <Heading style={{ color: '#ffffff', fontSize: '24px', margin: '0 0 4px 0', fontWeight: 700 }}>
              {briefTitle}
            </Heading>
            <Text style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>
              {studioName}
            </Text>
          </Section>

          <Section style={{ padding: '24px 32px' }}>
            {shootDate && (
              <Row label="Datum" value={formatDate(shootDate)!} />
            )}
            {(callTime || endTime) && (
              <Row label="Tijden" value={[callTime, endTime].filter(Boolean).join(' – ')} />
            )}
            {location && <Row label="Locatie" value={location} />}
            {contactPerson && (
              <Row
                label="Contact"
                value={`${contactPerson}${contactPhone ? ` — ${contactPhone}` : ''}`}
              />
            )}
          </Section>

          {description && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
              <Section style={{ padding: '24px 32px' }}>
                <SectionTitle>Omschrijving</SectionTitle>
                <Text style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {description}
                </Text>
              </Section>
            </>
          )}

          {shotlist.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
              <Section style={{ padding: '24px 32px' }}>
                <SectionTitle>Shotlist</SectionTitle>
                {shotlist.map((s, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <Text style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600, margin: '0 0 2px 0' }}>
                      {i + 1}. {s.shot}
                    </Text>
                    {s.description && (
                      <Text style={{ color: '#64748b', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                        {s.description}
                      </Text>
                    )}
                  </div>
                ))}
              </Section>
            </>
          )}

          {equipment.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
              <Section style={{ padding: '24px 32px' }}>
                <SectionTitle>Equipment</SectionTitle>
                <Text style={{ color: '#334155', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
                  {equipment.map((e) => `• ${e}`).join('\n')}
                </Text>
              </Section>
            </>
          )}

          {deliverables && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
              <Section style={{ padding: '24px 32px' }}>
                <SectionTitle>Deliverables</SectionTitle>
                <Text style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {deliverables}
                </Text>
              </Section>
            </>
          )}

          {notes && (
            <>
              <Hr style={{ borderColor: '#e5e7eb', margin: 0 }} />
              <Section style={{ padding: '24px 32px' }}>
                <SectionTitle>Notities</SectionTitle>
                <Text style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {notes}
                </Text>
              </Section>
            </>
          )}

          <Section style={{ padding: '24px 32px', backgroundColor: '#f8fafc', textAlign: 'center' as const }}>
            <Link
              href={briefUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Open volledige brief online
            </Link>
            <Text style={{ color: '#94a3b8', fontSize: '12px', margin: '16px 0 0 0' }}>
              Verstuurd door {senderName} via lctnships
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', marginBottom: '8px' }}>
      <Text style={{ color: '#94a3b8', fontSize: '13px', margin: 0, width: '100px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: '14px', margin: 0, fontWeight: 500, flex: 1 }}>
        {value}
      </Text>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
      {children}
    </Text>
  )
}
