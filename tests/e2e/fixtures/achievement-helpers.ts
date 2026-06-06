import { expect, type Page } from '@playwright/test'
import { gotoAndWaitForMain } from './test-helpers'

const ACHIEVEMENTS_COOKIE_NAME = 'kil.dev_achievements_v1'

/**
 * Check if an achievement is unlocked by reading the cookie
 */
export async function expectAchievementCookieContains(page: Page, achievementId: string) {
  if (page.isClosed()) {
    throw new Error('Page is closed, cannot read cookies')
  }

  let cookies
  try {
    cookies = await page.context().cookies()
  } catch (error) {
    throw new Error(`Failed to read cookies: ${error instanceof Error ? error.message : String(error)}`)
  }

  const achievementCookie = cookies.find(c => c.name === ACHIEVEMENTS_COOKIE_NAME)
  expect(achievementCookie, `Achievement cookie should exist`).toBeDefined()

  if (achievementCookie) {
    const decoded = decodeURIComponent(achievementCookie.value)
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    expect(parsed, `Achievement ${achievementId} should be in cookie`).toHaveProperty(achievementId)
    expect(typeof parsed[achievementId], `Achievement ${achievementId} should have timestamp`).toBe('string')
  }
}

/**
 * Wait until the achievement appears in the cookie.
 */
export async function waitForAchievementCookie(page: Page, achievementId: string, timeoutMs = 5000) {
  await expect
    .poll(
      async () => {
        // Check if page/context is still valid before accessing cookies
        if (page.isClosed()) {
          throw new Error('Page is closed, cannot read cookies')
        }

        let cookies
        try {
          cookies = await page.context().cookies()
        } catch (error) {
          // If context is invalid, throw to stop polling
          throw new Error(`Browser context invalid: ${error instanceof Error ? error.message : String(error)}`)
        }

        const c = cookies.find(c => c.name === ACHIEVEMENTS_COOKIE_NAME)
        if (!c) return false
        try {
          const parsed = JSON.parse(decodeURIComponent(c.value)) as Record<string, unknown>
          return Boolean(parsed[achievementId])
        } catch {
          return false
        }
      },
      { timeout: timeoutMs },
    )
    .toBe(true)
}

/**
 * Check if an achievement is unlocked in localStorage
 */
export async function expectAchievementInLocalStorage(page: Page, achievementId: string) {
  const hasAchievement = await page.evaluate(id => {
    const stored = localStorage.getItem('kil.dev/achievements/v1')
    if (!stored) return false
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>
      return Boolean(parsed[id])
    } catch {
      return false
    }
  }, achievementId)

  expect(hasAchievement, `Achievement ${achievementId} should be in localStorage`).toBe(true)
}

/**
 * Check if an achievement data attribute is set on the HTML element
 */
export async function expectAchievementDataAttribute(page: Page, achievementId: string) {
  const kebabId = achievementId.toLowerCase().replaceAll('_', '-')
  const hasAttribute = await page.evaluate(id => {
    return document.documentElement.hasAttribute(`data-achievement-${id}`)
  }, kebabId)

  expect(hasAttribute, `Achievement data-achievement-${kebabId} attribute should be set`).toBe(true)
}

/**
 * Simulate the Konami code sequence: ↑↑↓↓←→←→BA
 */
export async function simulateKonamiCode(page: Page) {
  const sequence = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ]

  for (const key of sequence) {
    await page.keyboard.press(key)
    // Small delay between key presses to simulate real typing
    await page.waitForTimeout(50)
  }

  // Check if we're on the home page - Konami code only works there
  const isHomePage = await page.evaluate(() => globalThis.window.location.pathname === '/')

  await (isHomePage
    ? // Wait for animation to trigger by checking sessionStorage
      page
        .waitForFunction(() => sessionStorage.getItem('konami-animated') === 'true', { timeout: 2000 })
        .catch(async () => {
          // Fallback: if sessionStorage check fails, wait a bit
          // But check if page is still open first
          if (!page.isClosed()) {
            await page.waitForTimeout(300)
          }
        })
    : // On non-home pages, Konami code won't trigger, so just wait a short time
      // for any potential processing
      page.waitForTimeout(100))
}

/**
 * Check if confetti is likely playing (heuristic: canvas element presence)
 * Waits for achievement popup to be visible first, then checks for confetti canvas
 */
export async function expectConfettiLikely(page: Page) {
  // First wait for the achievement popup to appear (confetti is triggered when popup becomes visible)
  await page.waitForSelector('[data-achievement-popup]', { state: 'visible', timeout: 3000 }).catch(() => {
    // If popup doesn't appear, that's okay - confetti might still be triggered
  })

  // Confetti library adds canvas elements to the body
  // Wait up to ~2s for confetti to mount after popup visible
  const deadline = Date.now() + 2000
  let count = 0
  while (Date.now() < deadline) {
    count = await page.locator('body > canvas').count()
    if (count > 0) break
    await page.waitForTimeout(100)
  }
  expect(count, 'Confetti canvas should be present').toBeGreaterThan(0)
}

/**
 * Check if achievement popup appeared (by title text in popup)
 */
export async function expectAchievementPopup(page: Page, achievementTitle: string) {
  const popup = page.locator('[data-achievement-popup]')
  await expect(popup).toBeVisible({ timeout: 5000 })
  await expect(popup).toContainText(achievementTitle, { timeout: 2000 })
}

/**
 * Wait for any achievement popup to appear and complete its animation
 */
export async function waitForAchievementPopup(page: Page) {
  // Wait for popup to appear
  await page.waitForSelector('[data-achievement-popup]', { state: 'visible', timeout: 5000 })
  // Wait until the popup reaches its exit phase (if exposed via data-phase="exit")
  await page
    .waitForSelector('[data-achievement-popup][data-phase="exit"]', { state: 'attached', timeout: 12000 })
    .catch(() => {
      // noop
    })
  // Finally, wait for the popup to be removed from the DOM (covers full animation timeline ~7.7s)
  await page.waitForSelector('[data-achievement-popup]', { state: 'detached', timeout: 15000 })
}

/**
 * Get the count of unlocked achievements from localStorage
 */
export async function getUnlockedAchievementCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const stored = localStorage.getItem('kil.dev/achievements/v1')
    if (!stored) return 0
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>
      return Object.keys(parsed).length
    } catch {
      return 0
    }
  })
}

/**
 * Flip all pet cards on the About page to trigger PET_PARADE achievement
 */
export async function flipAllPetCards(page: Page) {
  // Navigate to about page
  await gotoAndWaitForMain(page, '/about')

  // Scroll to pets section
  const petsSection = page.getByText('These are my pets')
  await petsSection.scrollIntoViewIfNeeded()
  // Wait for section to be visible
  await expect(petsSection).toBeVisible({ timeout: 1000 })

  // Find all pet cards and flip them
  const petCards = page.locator('[aria-label*="Toggle details for"]')
  const count = await petCards.count()

  for (let i = 0; i < count; i++) {
    const card = petCards.nth(i)
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeVisible({ timeout: 3000 })

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if ((await card.getAttribute('aria-pressed')) === 'true') break
      await card.click({ force: true })
      await expect(card)
        .toHaveAttribute('aria-pressed', 'true', { timeout: 1000 })
        .catch(() => {})
    }

    await expect(card).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 })
  }

  // Wait for achievement to be processed
  await waitForAchievementCookie(page, 'PET_PARADE', 5000)
}
