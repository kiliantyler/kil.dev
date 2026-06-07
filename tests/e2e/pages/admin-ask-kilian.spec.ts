import { expect, test, type BrowserContext, type Page } from '@playwright/test'
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

async function readKnowledgeVisibleCounts(page: Page) {
  const countText = await page.getByText(/\d+ entries\s+\u00B7\s+\d+ visible/).textContent()
  const counts = countText?.match(/(\d+) entries\s+\u00B7\s+(\d+) visible/)
  if (!counts) throw new Error(`Could not parse knowledge table counts from "${countText}"`)
  return {
    total: Number(counts[1]),
    visible: Number(counts[2]),
  }
}

test.describe('Admin Ask Kilian', () => {
  test.beforeEach(async ({ page }) => {
    await disableSeasonalOverlays(page)
    await abortNoise(page)
    await disableAnimations(page)
  })

  test('renders cockpit shell, centered tabs, and Test Lab chat interface', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoAndWaitForMain(page, '/admin/ask-kilian')

    await expect(page.getByRole('heading', { level: 1, name: 'Ask Kilian Admin' })).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Ask Kilian admin sections' })).toBeVisible()
    const status = page.getByLabel('Ask Kilian admin status')
    await expect(status.getByText('Runtime', { exact: true })).toBeVisible()
    await expect(status.getByText('RAG', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Test Lab' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Test Lab' })).toBeVisible()

    const chat = page.getByRole('region', { name: 'Ask Kilian chat' })
    await expect(chat).toBeVisible()
    await expect(chat.getByText('No messages yet')).toBeVisible()

    const messageInput = chat.getByRole('textbox', { name: 'Message Ask Kilian' })
    await expect(messageInput).toBeVisible()
    const sendButton = chat.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeDisabled()
    await messageInput.fill('What should I know about this site?')
    await expect(sendButton).toBeEnabled()

    await expect(page.getByText('Context and debug output')).toBeVisible()
  })

  test('creates and removes access filter chips from search keyboard flows', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoAndWaitForMain(page, '/admin/ask-kilian')

    const searchInput = page.getByRole('combobox', { name: 'Search knowledge entries' })
    const accessOneChipRemove = page.getByRole('button', { name: 'Remove Access 1 filter' })
    const initialCounts = await readKnowledgeVisibleCounts(page)
    expect(initialCounts.total).toBeGreaterThan(1)
    expect(initialCounts.visible).toBe(initialCounts.total)

    await searchInput.fill('access: 1')
    await expect(accessOneChipRemove).toBeVisible()
    await expect(searchInput).toHaveValue('')
    const typedFilterCounts = await readKnowledgeVisibleCounts(page)
    expect(typedFilterCounts.visible).toBeLessThan(typedFilterCounts.total)

    await searchInput.press('Backspace')
    await expect(accessOneChipRemove).toHaveCount(0)
    await expect(searchInput).toHaveValue('')
    const clearedCounts = await readKnowledgeVisibleCounts(page)
    expect(clearedCounts.visible).toBe(clearedCounts.total)

    await searchInput.fill('acc')
    await searchInput.press('Enter')
    await expect(searchInput).toHaveValue('access: ')
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')
    await expect(accessOneChipRemove).toBeVisible()
    await expect(searchInput).toHaveValue('')
    const autocompleteCounts = await readKnowledgeVisibleCounts(page)
    expect(autocompleteCounts.visible).toBeLessThan(autocompleteCounts.total)
  })
})
