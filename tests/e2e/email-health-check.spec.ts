import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'uriel@lctnships.com'
const TEST_PASSWORD = 'Mack123'

test('email health check: login -> settings -> send test mail', async ({ page }) => {
  test.setTimeout(90_000)

  // 1. Login
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/wachtwoord|password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /inloggen|sign in|log in/i }).click()

  // Wait until we leave /login (handles MFA redirect too)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  const currentPath = new URL(page.url()).pathname
  console.log('Post-login URL:', currentPath)

  // Skip MFA challenge if we hit it — test is about email, not auth
  if (currentPath.startsWith('/mfa-challenge') || currentPath.includes('mfa-enroll')) {
    test.skip(true, `Stopped at ${currentPath} — disable MFA locally or re-run with MFA_ENFORCEMENT=off`)
  }

  // 2. Navigate to settings
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  // 3. Scroll to the Authentication section where the health check card lives
  const card = page.getByRole('heading', { name: /email pipeline test/i })
  await card.scrollIntoViewIfNeeded()
  await expect(card).toBeVisible()

  // 4. Listen for the API response before clicking
  const apiPromise = page.waitForResponse(
    (res) => res.url().includes('/api/email/health-check') && res.request().method() === 'POST',
    { timeout: 30_000 },
  )

  await page.getByRole('button', { name: /naar rivaldo/i }).click()

  const response = await apiPromise
  const json = await response.json()
  console.log('Health check response:', JSON.stringify(json, null, 2))

  expect(response.status(), `API status: ${response.status()} — body: ${JSON.stringify(json)}`).toBe(200)
  expect(json.ok).toBe(true)
  expect(json.messageId).toBeTruthy()

  // 5. Confirm UI shows success
  await expect(page.getByText(/test succesvol/i)).toBeVisible({ timeout: 10_000 })
})
