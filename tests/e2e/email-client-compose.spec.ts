import { test, Page } from '@playwright/test'

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

test('Email client → Nieuw bericht → stuur naar mac.valdo1997@gmail.com', async ({ page }) => {
  test.setTimeout(180_000)

  const apiCalls: Array<{ url: string; method: string; status: number; body: string; payload: string }> = []
  page.on('request', (req) => {
    if (req.url().includes('/api/email/')) {
      apiCalls.push({ url: req.url(), method: req.method(), status: 0, body: '', payload: req.postData() ?? '' })
    }
  })
  page.on('response', async (res) => {
    if (res.url().includes('/api/email/')) {
      const body = await res.text().catch(() => '')
      const match = apiCalls.findLast((c) => c.url === res.url() && c.method === res.request().method() && c.status === 0)
      if (match) {
        match.status = res.status()
        match.body = body.slice(0, 400)
      }
    }
  })

  await login(page)
  await page.goto('/email')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2500)

  await page.screenshot({ path: 'test-results/email-client-0-loaded.png', fullPage: true })

  // Klik "Nieuw bericht"
  const newMsgBtn = page.getByRole('button', { name: /nieuw bericht/i }).first()
  const cnt = await newMsgBtn.count()
  console.log(`"Nieuw bericht" knoppen: ${cnt}`)
  if (cnt === 0) {
    const buttons = (await page.locator('button:visible').allTextContents()).slice(0, 40)
    console.log('Visible buttons:', buttons.join(' | '))
    throw new Error('"Nieuw bericht" knop niet gevonden')
  }
  await newMsgBtn.click()
  await page.waitForTimeout(1500)

  await page.screenshot({ path: 'test-results/email-client-1-compose-open.png', fullPage: true })

  // Vul compose form
  const toInput = page.locator('input[type="email"], input[placeholder*="aan" i]').last()
  const subjectInput = page.locator('input[placeholder*="onderwerp" i], input[placeholder*="subject" i]').last()
  const messageInput = page.locator('textarea').last()

  if (await toInput.count() === 0) {
    console.log('❌ Geen to-input — compose form niet open')
    throw new Error('Compose form niet open')
  }

  await toInput.fill(TARGET)
  await subjectInput.fill('[Email client] Test ' + Date.now())
  await messageInput.fill('Deze mail is verstuurd vanuit de Email Client (IMAP/SMTP) flow via Playwright.')

  console.log('Velden ingevuld, wacht + klik verstuur')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/email-client-2-filled.png', fullPage: true })

  const sendBtn = page.getByRole('button', { name: /^verstuur|versturen|stuur|send$/i }).last()
  const isDisabled = await sendBtn.isDisabled()
  console.log(`Verstuur disabled? ${isDisabled}`)
  if (isDisabled) {
    console.log('Buttons:', (await page.locator('button:visible').allTextContents()).slice(0, 20))
    throw new Error('Verstuur-knop disabled')
  }

  await sendBtn.click()
  await page.waitForTimeout(8000)

  await page.screenshot({ path: 'test-results/email-client-3-after-send.png', fullPage: true })

  console.log(`\n=== ALLE email API calls tijdens deze test ===`)
  for (const c of apiCalls) {
    const path = c.url.split('/api/email/')[1] || c.url
    const tag = c.status >= 400 ? '❌' : c.status === 0 ? '⏳' : '✅'
    console.log(`${tag} ${c.method} ${path} → ${c.status}`)
    if (c.payload) console.log(`   payload: ${c.payload.slice(0, 250)}`)
    if (c.body && c.body.length < 400) console.log(`   body: ${c.body}`)
  }

  // Verzendroute kan /api/email/send, /api/email/smtp of /api/email/bulk-send zijn
  const sendRoutes = apiCalls.filter((c) =>
    /\/(send|smtp|bulk-send)$/.test(c.url) && c.method === 'POST'
  )
  console.log(`\nVerzendroute calls: ${sendRoutes.length}`)

  if (sendRoutes.length === 0) throw new Error('Geen verzendroute aangeroepen — knop werkt niet')

  const first = sendRoutes[0]
  if (first.status >= 400) throw new Error(`Verzend API faalde: ${first.status} — ${first.body}`)

  console.log(`\n✅ Email verstuurd via ${first.url.split('/api/email/')[1]} — check inbox`)
})
