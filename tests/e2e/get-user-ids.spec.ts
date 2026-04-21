import { test, Page } from '@playwright/test'

async function loginAndGetUserId(page: Page, email: string, password: string): Promise<string> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/wachtwoord|password/i).fill(password)
  await page.getByRole('button', { name: /inloggen|sign in|log in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  // Lees de session uit Supabase cookie
  const cookies = await page.context().cookies()
  const sbCookie = cookies.find(c => c.name.includes('sb-') && c.name.includes('auth-token'))
  if (!sbCookie) return 'NO SESSION COOKIE'

  // Parse JWT payload (base64-decode middle section)
  try {
    const raw = sbCookie.value.startsWith('base64-') ? sbCookie.value.slice(7) : sbCookie.value
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    const token = parsed.access_token ?? parsed[0]
    if (!token) return 'NO ACCESS TOKEN'
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'))
    return payload.sub
  } catch (e) {
    return `parse-error: ${e}`
  }
}

test('identificeer user_ids', async ({ page }) => {
  test.setTimeout(90_000)
  const uriel = await loginAndGetUserId(page, 'uriel@lctnships.com', 'Mack123')
  console.log(`\n  uriel@lctnships.com user_id: ${uriel}`)
  // Uitloggen — via Supabase client of gewoon cookie legen
  await page.context().clearCookies()
})
