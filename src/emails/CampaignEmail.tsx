import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
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
  contactName,
  companyName,
  message,
  senderName,
  senderEmail,
  primaryButtonText = 'Bekijk onze website',
  primaryButtonUrl = 'https://lcntships.com',
  secondaryButtonText,
  secondaryButtonUrl,
  attachments = [],
}: CampaignEmailProps) {
  const previewText = `${senderName} van LCTNSHIPS wil graag contact met ${companyName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: {
                  50: '#eef2ff',
                  100: '#e0e7ff',
                  500: '#6366f1',
                  600: '#4f46e5',
                  700: '#4338ca',
                },
              },
            },
          },
        }}
      >
        <Body className="bg-gray-50 font-sans py-4">
          <Container className="mx-auto max-w-[600px] bg-white rounded-lg overflow-hidden shadow-lg">
            {/* Header */}
            <Section className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
              <Text className="text-white text-2xl font-bold text-center m-0">
                lcntships
              </Text>
              <Text className="text-white/80 text-sm text-center m-0 mt-1">
                Verbinden van studenten met creatieve studio&apos;s
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-4">
                {contactName ? `Hallo ${contactName},` : 'Hallo,'}
              </Heading>

              <Text className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                {message}
              </Text>

              {/* CTA Buttons */}
              {(primaryButtonText || secondaryButtonText) && (
                <Section className="my-8">
                  <Row>
                    {primaryButtonText && primaryButtonUrl && (
                      <Column className="pr-2">
                        <Button
                          href={primaryButtonUrl}
                          className="bg-[#4f46e5] text-white px-6 py-3 rounded-lg font-semibold text-sm no-underline inline-block"
                        >
                          {primaryButtonText}
                        </Button>
                      </Column>
                    )}
                    {secondaryButtonText && secondaryButtonUrl && (
                      <Column className="pl-2">
                        <Button
                          href={secondaryButtonUrl}
                          className="bg-white text-[#4f46e5] border-2 border-[#4f46e5] px-6 py-3 rounded-lg font-semibold text-sm no-underline inline-block"
                        >
                          {secondaryButtonText}
                        </Button>
                      </Column>
                    )}
                  </Row>
                </Section>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <Section className="bg-gray-50 rounded-lg p-4 my-6">
                  <Text className="text-gray-600 text-sm font-semibold m-0 mb-3">
                    📎 Bijlagen ({attachments.length})
                  </Text>
                  {attachments.map((att, i) => (
                    <Text key={i} className="text-gray-500 text-sm m-0 py-1">
                      • {att.name}
                    </Text>
                  ))}
                </Section>
              )}

              <Text className="text-gray-500 text-sm mt-8">
                Met vriendelijke groet,
                <br />
                <strong className="text-gray-900">{senderName}</strong>
                <br />
                <span className="text-[#4f46e5]">LCTNSHIPS</span>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 border-t border-gray-200">
              <Text className="text-gray-400 text-xs text-center m-0">
                Verstuurd door {senderName} ({senderEmail}) via LCTNSHIPS
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-2">
                © {new Date().getFullYear()} lcntships. Alle rechten voorbehouden.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
