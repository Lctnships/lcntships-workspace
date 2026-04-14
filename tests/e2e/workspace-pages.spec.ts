import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'playwright-test@lctnships.com'
const PASSWORD = 'TestPassword123!'

const PAGES = [
  '/dashboard',
  '/sales',
  '/sales/agenda',
  '/scraper',
  '/enrichment',
  '/email',
  '/customers',
  '/marketing/analytics',
  '/content',
  '/settings',
]

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type=email]', EMAIL)
  await page.fill('input[type=password]', PASSWORD)
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ])
  // Let dashboard initial load finish (its in-flight requests would otherwise leak into next nav)
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
}

test.describe('workspace pages load without errors', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  for (const path of PAGES) {
    test(`${path}`, async ({ page }) => {
      const consoleErrors: string[] = []
      const failedRequests: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('response', res => {
        if (res.status() >= 400 && !res.url().includes('favicon')) {
          failedRequests.push(`${res.status()} ${res.url()}`)
        }
      })

      const resp = await page.goto(path, { waitUntil: 'networkidle', timeout: 20000 })
      expect(resp?.status(), `page ${path} returned ${resp?.status()}`).toBeLessThan(400)

      // Wait a bit for client-side data fetching
      await page.waitForTimeout(1500)

      // Filter known noise
      const realErrors = consoleErrors.filter(e =>
        !e.includes('Download the React DevTools') &&
        !e.includes('hydrat') &&
        !e.toLowerCase().includes('favicon') &&
        // Ignore transient Supabase auth refresh fetch failures
        !(e.includes('Failed to fetch') && e.includes('SupabaseAuthClient'))
      )

      if (realErrors.length || failedRequests.length) {
        console.log(`\n--- ${path} ---`)
        realErrors.forEach(e => console.log('CONSOLE:', e))
        failedRequests.forEach(r => console.log('NET:', r))
      }

      expect(realErrors, `${path}: console errors`).toEqual([])
      expect(failedRequests, `${path}: failed requests`).toEqual([])
    })
  }
})
