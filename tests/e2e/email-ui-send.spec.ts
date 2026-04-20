import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = 'uriel@lctnships.com'
const TEST_PASSWORD = 'Mack123'
const TARGET = 'mac.valdo1997@gmail.com'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/wachtwoord|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /inloggen|sign in|log in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}

test.describe('Email verzend flows via UI', () => {
  test.setTimeout(180_000)

  test('Sales Mode: open een lead, klik Sales Mode, stuur email naar target', async ({ page }) => {
    const sendCalls: Array<{ status: number; body: string; payload: string }> = []
    page.on('request', (req) => {
      if (req.url().endsWith('/api/email/send') && req.method() === 'POST') {
        sendCalls.push({ status: 0, body: '', payload: req.postData() ?? '' })
      }
    })
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/email/send') && res.request().method() === 'POST') {
        const body = await res.text().catch(() => '')
        const last = sendCalls[sendCalls.length - 1]
        if (last) {
          last.status = res.status()
          last.body = body.slice(0, 500)
        }
      }
    })
    const consoleErrs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrs.push(msg.text())
    })

    await login(page)
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Filter eerst op hot/warm/negotiation zodat we leads hebben met email
    // (Sales Mode werkt op filteredLeads - default = alle)

    // Klik direct op "Sales Mode" knop in de toolbar
    const salesModeBtn = page.getByRole('button', { name: /sales mode/i })
    const smCount = await salesModeBtn.count()
    console.log(`[Sales] Sales Mode knop(pen) gevonden: ${smCount}`)
    if (smCount === 0) {
      console.log('[Sales] ❌ Sales Mode knop niet gevonden')
      console.log('Visible knoppen:', (await page.locator('button:visible').allTextContents()).slice(0, 40))
      test.skip()
    }

    await salesModeBtn.first().click()
    await page.waitForTimeout(2500)

    console.log(`[Sales] URL na click: ${page.url()}`)
    await page.screenshot({ path: 'test-results/sales-mode-wizard.png', fullPage: true })

    console.log(`[Sales] Huidige URL: ${page.url()}`)

    // Zoek email-compositie knop
    const btnNames = (await page.locator('button:visible').allTextContents()).slice(0, 40)
    console.log('[Sales] Buttons in Sales Mode:', btnNames.join(' | '))

    // Zoek de email section — klik op een email knop als die er is
    const emailBtn = page.getByRole('button', { name: /email|mail|verstuur|stuur/i }).first()
    if (await emailBtn.count() === 0) {
      console.log('[Sales] ❌ Geen email knop in Sales Mode')
      test.skip()
    }

    // Screenshot voor debugging
    await page.screenshot({ path: 'test-results/sales-mode-state.png', fullPage: true })

    // Probeer subject + bericht in te vullen als die velden zichtbaar zijn
    const subjectInput = page.locator('input[placeholder*="onderwerp" i], input[placeholder*="subject" i]').first()
    const messageInput = page.locator('textarea').first()
    const toInput = page.locator('input[type="email"], input[placeholder*="aan" i], input[placeholder*="to" i]').first()

    if (await toInput.count() > 0) {
      await toInput.fill(TARGET)
      console.log('[Sales] ✅ Ingevuld: to =', TARGET)
    }
    if (await subjectInput.count() > 0) {
      await subjectInput.fill('[Playwright] Sales Mode test ' + new Date().toISOString())
      console.log('[Sales] ✅ Ingevuld: subject')
    }
    if (await messageInput.count() > 0) {
      await messageInput.fill('Deze mail is verstuurd vanuit Sales Mode via een Playwright test om te bewijzen dat de knop werkt.')
      console.log('[Sales] ✅ Ingevuld: bericht')
    }

    // Nu klikken op echte verstuur-knop
    const sendBtn = page.getByRole('button', { name: /^(verstuur|versturen|stuur|send)$/i }).first()
    if (await sendBtn.count() === 0) {
      console.log('[Sales] ❌ Geen Verstuur knop zichtbaar')
      console.log('Buttons nu:', (await page.locator('button:visible').allTextContents()).slice(0, 30))
      test.skip()
    }

    await sendBtn.click()
    await page.waitForTimeout(4000)

    console.log(`\n[Sales] === Send calls: ${sendCalls.length} ===`)
    for (const c of sendCalls) {
      console.log(`  status=${c.status}`)
      console.log(`  payload=${c.payload.slice(0, 200)}`)
      console.log(`  response=${c.body}`)
    }
    if (consoleErrs.length > 0) {
      console.log('\n[Sales] Console errors:')
      consoleErrs.forEach((e) => console.log('  -', e.slice(0, 200)))
    }

    expect(sendCalls.length, 'Sales Mode moet /api/email/send aanroepen').toBeGreaterThan(0)
    expect(sendCalls[0].status, `API status ${sendCalls[0].status} — ${sendCalls[0].body}`).toBeLessThan(400)
  })

  test('Email client pagina: compose mail en verstuur naar target', async ({ page }) => {
    const smtpCalls: Array<{ status: number; body: string }> = []
    page.on('response', async (res) => {
      if (res.url().endsWith('/api/email/smtp') && res.request().method() === 'POST') {
        const body = await res.text().catch(() => '')
        smtpCalls.push({ status: res.status(), body: body.slice(0, 500) })
      }
    })

    await login(page)
    await page.goto('/email')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/email-page-state.png', fullPage: true })

    // Zoek compose / nieuwe mail knop
    const composeBtn = page.getByRole('button', { name: /compose|nieuwe|opstellen|new/i }).first()
    if (await composeBtn.count() === 0) {
      const buttons = (await page.locator('button:visible').allTextContents()).slice(0, 30)
      console.log('[Email] ❌ Geen compose knop. Buttons:', buttons.join(' | '))
      test.skip()
    }
    await composeBtn.click()
    await page.waitForTimeout(1500)

    const toInput = page.locator('input[type="email"], input[placeholder*="aan" i], input[placeholder*="to" i]').first()
    const subjectInput = page.locator('input[placeholder*="onderwerp" i], input[placeholder*="subject" i]').first()
    const messageInput = page.locator('textarea').first()

    if (await toInput.count() === 0) {
      console.log('[Email] ❌ Compose form niet gevonden na click')
      test.skip()
    }

    await toInput.fill(TARGET)
    await subjectInput.fill('[Playwright] Email client test')
    await messageInput.fill('Deze mail is verstuurd vanuit de email-client pagina via Playwright.')

    const sendBtn = page.getByRole('button', { name: /^(verstuur|versturen|stuur|send)$/i }).first()
    await sendBtn.click()
    await page.waitForTimeout(5000)

    console.log(`\n[Email] === SMTP calls: ${smtpCalls.length} ===`)
    for (const c of smtpCalls) {
      console.log(`  status=${c.status}  body=${c.body}`)
    }

    expect(smtpCalls.length, 'Email compose moet /api/email/smtp aanroepen').toBeGreaterThan(0)
    expect(smtpCalls[0].status).toBeLessThan(400)
  })
})
