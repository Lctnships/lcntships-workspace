import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface CampaignEmailProps {
  contactName: string
  companyName: string
  message: string
  senderName: string
  senderEmail: string
  primaryButtonText?: string
  primaryButtonUrl?: string
  secondaryButtonText?: string
  secondaryButtonUrl?: string
  attachments?: { name: string; size: number }[]
}

export default function CampaignEmail({
  contactName = '',
  companyName = '',
  message = '',
  senderName = 'Rivaldo',
  senderEmail = 'rivaldomacandrew@lctnships.com',
  primaryButtonText = 'Plan een gesprek',
  primaryButtonUrl = 'https://calendly.com/rivaldorose/30min',
  secondaryButtonText,
  secondaryButtonUrl,
  attachments = [],
}: CampaignEmailProps) {
  const previewText = `${senderName} van lctnships wil graag contact met ${companyName}`
  const logoUrl = 'https://lcntships-workspace.vercel.app/lcntships-logo.png'

  const personalizedMessage = message
    .replace(/{company_name}/g, companyName)
    .replace(/{contact_name}/g, contactName)
    .replace(/\{\{company_name\}\}/g, companyName)
    .replace(/\{\{contact_name\}\}/g, contactName)

  const paragraphs = personalizedMessage
    .replace(/<\/?p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  return (
    <Html lang="nl">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; border-radius: 0 !important; }
            .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
            .feature-card { padding: 16px !important; }
            .cta-button { font-size: 14px !important; padding: 14px 20px !important; }
            .heading-text { font-size: 20px !important; }
            .body-text { font-size: 16px !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: '#1152d4',
              },
            },
          },
        }}
      >
        <Body className="bg-[#f6f6f8] font-sans" style={{ margin: 0, padding: '40px 0' }}>
          <Container className="email-container" style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            {/* Header */}
            <Section style={{ paddingTop: '40px', paddingBottom: '24px', textAlign: 'center' }}>
              <Img
                src={logoUrl}
                width="100"
                height="100"
                alt="lctnships"
                style={{ margin: '0 auto' }}
              />
            </Section>

            {/* Content */}
            <Section className="email-padding" style={{ paddingLeft: '40px', paddingRight: '40px', paddingBottom: '40px' }}>
              {/* Message paragraphs */}
              {paragraphs.map((paragraph, i) => (
                <Text key={i} className="body-text" style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', margin: '0 0 14px 0' }}>
                  {paragraph}
                </Text>
              ))}

              {paragraphs.length === 0 && (
                <>
                  <Text className="body-text" style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', margin: '0 0 14px 0' }}>
                    Ik zag <strong style={{ color: '#1152d4', fontWeight: 'bold' }}>{companyName}</strong> online en jullie ruimte ziet er sterk uit.
                  </Text>
                  <Text className="body-text" style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', margin: '0 0 14px 0' }}>
                    lctnships helpt creatieve ruimtes hun bereik te vergroten en boekingen te automatiseren zonder gedoe. We verbinden jouw studio direct met de juiste creators.
                  </Text>
                </>
              )}

              {/* CTA Buttons */}
              {primaryButtonText && primaryButtonUrl && (
                <Section style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <Button
                    href={primaryButtonUrl}
                    className="cta-button"
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      padding: '14px 32px',
                      textDecoration: 'none',
                      display: 'inline-block',
                      textAlign: 'center',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {primaryButtonText}
                  </Button>
                </Section>
              )}
              {secondaryButtonText && secondaryButtonUrl && (
                <Section style={{ textAlign: 'center' }}>
                  <Button
                    href={secondaryButtonUrl}
                    className="cta-button"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      padding: '12px 32px',
                      textDecoration: 'none',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '2px solid #e2e8f0',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {secondaryButtonText}
                  </Button>
                </Section>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <Section style={{ marginTop: '28px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <Text style={{ color: '#475569', fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
                    Bijlagen ({attachments.length})
                  </Text>
                  {attachments.map((att, i) => (
                    <Text key={i} style={{ color: '#64748b', fontSize: '13px', margin: '0 0 4px 0' }}>
                      📎 {att.name}
                    </Text>
                  ))}
                </Section>
              )}
            </Section>

            {/* Footer */}
            <Section className="email-footer" style={{ backgroundColor: '#f8fafc', padding: '36px 40px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
              <Img
                src={logoUrl}
                width="48"
                height="48"
                alt="lctnships"
                style={{ margin: '0 auto 10px auto' }}
              />
              <Text style={{ fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0', fontSize: '13px' }}>
                {senderName} — Oprichter lctnships
              </Text>
              <Link
                href="https://www.lctnships.com"
                style={{ fontSize: '13px', color: '#1152d4', textDecoration: 'none' }}
              >
                lctnships.com
              </Link>

              <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

              <Link
                href="#"
                style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'underline' }}
              >
                Afmelden voor deze mails
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
