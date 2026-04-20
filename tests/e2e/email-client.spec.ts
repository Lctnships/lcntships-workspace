import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = 'uriel@lctnships.com'
const TEST_PASSWORD = 'Mack123'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/wachtwoord|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /inloggen|sign in|log in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  const p = new URL(page.url()).pathname
  if (p.startsWith('/mfa-challenge') || p.includes('mfa-enroll')) {
    throw new Error(`MFA gate active at ${p} — set MFA_ENFORCEMENT=off locally`)
  }
}

test.describe('Email Client E2E', () => {
  test.setTimeout(120_000)

  test('1) Email page loads + shows UI', async ({ page }) => {
    const apiCalls: Array<{ url: string; status: number; body?: string }> = []
    page.on('response', async (res) => {
      if (res.url().includes('/api/email/')) {
        try {
          const body = await res.text().catch(() => '')
          apiCalls.push({ url: res.url(), status: res.status(), body: body.slice(0, 300) })
        } catch {}
      }
    })

    await login(page)
    await page.goto('/email')
    await page.waitForLoadState('networkidle')

    console.log('\n=== EMAIL PAGE API CALLS ===')
    for (const c of apiCalls) {
      const tag = c.status >= 400 ? '❌' : '✅'
      console.log(`${tag} ${c.status} ${c.url.replace('http://localhost:3000', '')}`)
      if (c.status >= 400 && c.body) console.log(`   body: ${c.body}`)
    }

    const errors = apiCalls.filter((c) => c.status >= 400)
    expect(errors, `${errors.length} API errors op /email: ${errors.map(e => `${e.status} ${e.url.split('/api/email/')[1]}`).join(', ')}`).toHaveLength(0)
  })

  test('2) IMAP inbox fetch', async ({ page }) => {
    const imapResponses: Array<{ status: number; body: string }> = []
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/email/imap') && res.request().method() === 'POST') {
        const body = await res.text().catch(() => '')
        imapResponses.push({ status: res.status(), body: body.slice(0, 500) })
      }
    })

    await login(page)
    await page.goto('/email')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // geef IMAP tijd om te laden

    console.log('\n=== IMAP RESPONSES ===')
    for (const r of imapResponses) {
      console.log(`status=${r.status} body=${r.body}`)
    }

    if (imapResponses.length === 0) {
      console.log('⚠️ Geen IMAP requests. Email client hit imap route niet — waarschijnlijk mist een email account of er is een frontend crash.')
    }
  })

  test('3) Sales Mode email send', async ({ page }) => {
    const sendResponses: Array<{ status: number; body: string }> = []
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/email/send') && res.request().method() === 'POST') {
        const body = await res.text().catch(() => '')
        sendResponses.push({ status: res.status(), body: body.slice(0, 500) })
      }
    })

    await login(page)
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')

    // Probeer een lead te openen
    const firstLead = page.locator('[class*="cursor-pointer"]').first()
    const leadCount = await firstLead.count()
    console.log(`Leads gevonden op /sales: ${leadCount}`)

    if (leadCount === 0) {
      test.skip(true, 'Geen leads om mee te testen op /sales')
    }

    await firstLead.click()
    await page.waitForTimeout(1000)

    // Zoek de Email knop / Sales Mode
    const salesBtn = page.getByRole('button', { name: /sales.*mode|stuur.*email|email/i }).first()
    if (await salesBtn.count() === 0) {
      console.log('⚠️ Geen email-knop in sales detail gevonden — UI check nodig')
      test.skip(true, 'Email-knop niet gevonden op sales detail')
    }

    await salesBtn.click()
    await page.waitForTimeout(1500)

    // Dump alle visibile knoppen zodat we zien welke er zijn
    const buttons = await page.locator('button:visible').allTextContents()
    console.log(`\nVisible buttons na sales mode click:\n  ${buttons.slice(0, 20).join('\n  ')}`)

    console.log(`\n=== SEND RESPONSES: ${sendResponses.length} ===`)
    for (const r of sendResponses) {
      console.log(`status=${r.status} body=${r.body}`)
    }
  })

  test('4) Email outbox viewer shows rows', async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Scroll naar Outbox viewer
    const outboxHeading = page.getByRole('heading', { name: /email outbox/i })
    await outboxHeading.scrollIntoViewIfNeeded()
    await expect(outboxHeading).toBeVisible()

    await page.waitForTimeout(2000) // wacht op outbox fetch

    const rows = page.locator('text=/pipeline check|email\\/send|health-check/i')
    const count = await rows.count()
    console.log(`Outbox rows visible: ${count}`)

    expect(count, 'Verwacht ≥1 outbox rows (testmails van eerder)').toBeGreaterThan(0)
  })
})
