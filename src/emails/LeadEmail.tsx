import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'
import * as React from 'react'

interface LeadEmailProps {
  companyName: string
  contactName: string
  message: string
  ctaText?: string
  ctaUrl?: string
  greeting?: string
}

export default function LeadEmail({
  companyName,
  contactName,
  message,
  ctaText = 'Bekijk ons aanbod',
  ctaUrl = 'https://lctnships.com',
  greeting = 'Hallo',
}: LeadEmailProps) {
  const previewText = `${greeting} ${contactName || companyName}, interesse in samenwerken?`

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
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white rounded-lg overflow-hidden shadow-lg">
            {/* Header */}
            <Section className="bg-[#111111] px-8 py-6">
              <Text className="text-white text-2xl font-bold text-center m-0">
                lcntships
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-4">
                {greeting.includes(contactName) || greeting.length > 10
                  ? `${greeting},`
                  : `${greeting} ${contactName || 'daar'},`}
              </Heading>

              <Text className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                {message}
              </Text>

              {/* CTA Button */}
              {ctaText && ctaUrl && (
                <Section className="text-center my-8">
                  <Button
                    href={ctaUrl}
                    className="bg-[#111111] text-white px-8 py-3 rounded-full font-semibold text-base no-underline inline-block"
                  >
                    {ctaText}
                  </Button>
                </Section>
              )}

              <Text className="text-gray-500 text-sm mt-8">
                Met vriendelijke groet,
                <br />
                <strong className="text-gray-900">Het lcntships Team</strong>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-100 px-8 py-6 border-t border-gray-200">
              <Text className="text-gray-500 text-xs text-center mb-2">
                © {new Date().getFullYear()} lcntships. Alle rechten voorbehouden.
              </Text>
              <Text className="text-gray-400 text-xs text-center">
                Je ontvangt deze email omdat {companyName} is geregistreerd als potentiele partner.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
