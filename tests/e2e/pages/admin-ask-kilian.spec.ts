import { expect, test, type BrowserContext } from '@playwright/test'
import { ADMIN_TEST_BYPASS_COOKIE, ADMIN_TEST_BYPASS_COOKIE_VALUE } from '../../../src/lib/admin-test-bypass'
import {
  abortNoise,
  disableAnimations,
  disableSeasonalOverlays,
  E2E_BASE_URL,
  gotoAndWaitForMain,
} from '../fixtures/test-helpers'

async function authorizeAdmin(context: BrowserContext) {
  await context.addCookies([
    {
      name: ADMIN_TEST_BYPASS_COOKIE,
      value: ADMIN_TEST_BYPASS_COOKIE_VALUE,
      url: E2E_BASE_URL,
      sameSite: 'Lax',
    },
  ])
}

test.describe('Admin Ask Kilian', () => {
  test.beforeEach(async ({ page }) => {
    await disableSeasonalOverlays(page)
    await abortNoise(page)
    await disableAnimations(page)
  })

  test('renders cockpit shell, centered tabs, and KTY-66-owned response panel', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoAndWaitForMain(page, '/admin/ask-kilian')

    await expect(page.getByRole('heading', { level: 1, name: 'Ask Kilian Admin' })).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Ask Kilian admin sections' })).toBeVisible()
    const status = page.getByLabel('Ask Kilian admin status')
    await expect(status.getByText('Runtime', { exact: true })).toBeVisible()
    await expect(status.getByText('RAG', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Test Lab' }).click()
    await expect(page.getByRole('region', { name: 'KTY-66 response panel' })).toContainText(
      'Live generation is reserved for KTY-66',
    )
    await expect(page.getByRole('button', { name: /send|generate/i })).toHaveCount(0)
  })
})
