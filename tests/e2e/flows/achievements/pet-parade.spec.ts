import { expect, test } from '@playwright/test'
import {
  expectAchievementCookieContains,
  expectAchievementPopup,
  expectConfettiLikely,
  flipAllPetCards,
  waitForAchievementCookie,
} from '../../fixtures/achievement-helpers'
import { abortNoise, clearState, gotoAndWaitForMain } from '../../fixtures/test-helpers'

test.describe('PET_PARADE Achievement', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page)
    await abortNoise(page)
    // Do not fully disable animations here; confetti requires motion

    // Pre-unlock ABOUT_AMBLER so the first popup we see is PET_PARADE
    await page.addInitScript(() => {
      try {
        const key = 'kil.dev/achievements/v1'
        const stored = globalThis.window.localStorage.getItem(key)
        const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : {}
        parsed.ABOUT_AMBLER ??= new Date().toISOString()
        globalThis.window.localStorage.setItem(key, JSON.stringify(parsed))
      } catch {}
    })
  })

  test('should unlock PET_PARADE after flipping all pet cards', async ({ page }) => {
    await flipAllPetCards(page)

    // Wait for popup (confetti triggers when popup becomes visible)
    await expectAchievementPopup(page, 'Pet Parade')

    // Verify achievement is unlocked
    await expectAchievementCookieContains(page, 'PET_PARADE')

    // Verify confetti was triggered (pet parade has confetti)
    await expectConfettiLikely(page)
  })

  test('should make pet gallery nav link visible after PET_PARADE', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 0) < 920) {
      test.skip(true, 'Desktop topbar is hidden below the nav breakpoint')
    }

    await flipAllPetCards(page)

    await waitForAchievementCookie(page, 'PET_PARADE')

    // Navigate to home to check for pet gallery link
    await gotoAndWaitForMain(page, '/')

    // Pet gallery link should now be visible
    const petGalleryLink = page.locator('.js-pet-gallery-nav')
    await expect(petGalleryLink).toBeVisible()
  })

  test('should set data-has-pet-gallery attribute after unlock', async ({ page }) => {
    await flipAllPetCards(page)

    await waitForAchievementCookie(page, 'PET_PARADE')

    const hasAttribute = await page.evaluate(() => {
      return Object.hasOwn(document.documentElement.dataset, 'hasPetGallery')
    })

    expect(hasAttribute).toBe(true)
  })

  test('should require all pets to be flipped', async ({ page }) => {
    await gotoAndWaitForMain(page, '/about')

    // Scroll to pets section
    const petsSection = page.getByText('These are my pets')
    await petsSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)

    // Flip only some pet cards (not all)
    const petCards = page.locator('[aria-label*="Toggle details for"]')
    const count = await petCards.count()

    // Flip only half
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const card = petCards.nth(i)
      await card.scrollIntoViewIfNeeded()
      await card.click()
      await page.waitForTimeout(400)
    }

    await page.waitForTimeout(1000)

    // Should NOT be unlocked yet
    const cookies = await page.context().cookies()
    const achievementCookie = cookies.find(c => c.name === 'kil.dev_achievements_v1')

    if (achievementCookie) {
      const decoded = decodeURIComponent(achievementCookie.value)
      const parsed = JSON.parse(decoded) as Record<string, unknown>
      expect(parsed).not.toHaveProperty('PET_PARADE')
    }
  })
})
