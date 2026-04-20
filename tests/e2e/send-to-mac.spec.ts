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

test('Sales Mode → Email sturen modal → naar mac.valdo1997@gmail.com', async ({ page }) => {
  test.setTimeout(180_000)

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

  await login(page)
  await page.goto('/sales')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Klik Sales Mode
  await page.getByRole('button', { name: /^sales mode/i }).first().click()
  await page.waitForTimeout(2500)

  // Klik "Email sturen" knop (opent de modal)
  const emailBtn = page.getByRole('button', { name: /email sturen/i }).first()
  const btnCount = await emailBtn.count()
  console.log(`"Email sturen" knoppen gevonden: ${btnCount}`)

  if (btnCount === 0) {
    const allBtns = (await page.locator('button:visible').allTextContents()).slice(0, 40)
    console.log('Visible buttons:', allBtns.join(' | '))
    throw new Error('"Email sturen" knop niet gevonden in Sales Mode')
  }

  await emailBtn.click()
  await page.waitForTimeout(1500)

  // Modal moet nu open zijn — vul de 3 inputs
  // De modal heeft een dialog overlay — focus op inputs binnen het modal
  const modalRoot = page.locator('div:has(> div:has-text("Email versturen"))').last()

  // To (type=email)
  const toInput = page.locator('input[type="email"]').last()
  await toInput.fill(TARGET)

  // Subject (placeholder "Onderwerp...")
  const subjectInput = page.locator('input[placeholder*="Onderwerp"]').last()
  await subjectInput.fill('[UI] Test vanuit Sales Mode ' + Date.now())

  // Message (textarea)
  const messageInput = page.locator('textarea').last()
  await messageInput.fill('Deze mail is verstuurd vanuit de workspace Sales Mode via Playwright, om te bewijzen dat de volledige UI-flow werkt.')

  console.log('Velden ingevuld, wacht op knop enable')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/sales-modal-filled.png', fullPage: true })

  // Verstuur-knop in de modal footer
  const sendBtn = page.getByRole('button', { name: /^verstuur|versturen$/i }).last()
  await sendBtn.waitFor({ state: 'visible', timeout: 5000 })

  // Check of hij enabled is
  const isDisabled = await sendBtn.isDisabled()
  console.log(`Verstuur knop disabled? ${isDisabled}`)

  if (isDisabled) {
    // Dump state
    const toVal = await toInput.inputValue()
    const subjVal = await subjectInput.inputValue()
    const msgVal = await messageInput.inputValue()
    console.log(`  to="${toVal}" subject="${subjVal}" msg.len=${msgVal.length}`)
    throw new Error('Verstuur-knop blijft disabled ondanks ingevulde velden')
  }

  console.log('Klik verstuur...')
  await sendBtn.click()
  await page.waitForTimeout(8000)

  await page.screenshot({ path: 'test-results/sales-modal-after-send.png', fullPage: true })

  console.log(`\n=== RESULT ===`)
  console.log(`Send API calls: ${sendCalls.length}`)
  for (const c of sendCalls) {
    console.log(`  status: ${c.status}`)
    console.log(`  payload: ${c.payload.slice(0, 400)}`)
    console.log(`  response: ${c.body}`)
  }

  if (sendCalls.length === 0) throw new Error('API /api/email/send is nooit aangeroepen')
  if (sendCalls[0].status !== 200) throw new Error(`API faalde: ${sendCalls[0].status} ${sendCalls[0].body}`)

  console.log('\n✅ Mail verstuurd via Sales Mode UI → check mac.valdo1997@gmail.com')
})
