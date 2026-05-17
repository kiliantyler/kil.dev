import { expect, test, type Page } from '@playwright/test'
import { expectAchievementCookieContains, expectConfettiLikely } from '../../fixtures/achievement-helpers'
import { abortNoise, clearState, closeThemeMenu, gotoAndWaitForMain, openThemeMenu } from '../../fixtures/test-helpers'

test.describe('THEME_TAPDANCE Achievement', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page)
    await abortNoise(page)
    // Don't disable animations for this test as we need to test the menu interaction
  })

  test('should not show all seasonal themes before THEME_TAPDANCE', async ({ page }) => {
    await gotoAndWaitForMain(page, '/')

    await openThemeMenu(page)

    const menu = page.locator('#theme-options')
    const names = ['Pride', 'Halloween', 'Thanksgiving', 'Christmas']
    const counts = await Promise.all(names.map(n => menu.getByRole('menuitem', { name: n }).count()))
    const total = counts.reduce((a, b) => a + b, 0)
    // Before unlocking, the menu should not show all seasonal themes at once
    expect(total).toBeLessThan(4)
  })

  async function expectAllUnlockedSeasonalThemesVisible(page: Page) {
    const menu = page.locator('#theme-options')
    await expect(menu).toHaveAttribute('aria-hidden', 'false')
    await Promise.all(
      ['Pride', 'Halloween', 'Thanksgiving', 'Christmas'].map(name =>
        expect(menu.getByRole('menuitem', { name })).toBeVisible(),
      ),
    )
  }

  test('should reset counter if theme is selected', async ({ page }) => {
    await gotoAndWaitForMain(page, '/')

    // Open and close 3 times
    for (let i = 0; i < 3; i++) {
      await openThemeMenu(page)
      await page.waitForTimeout(200)
      await page.locator('button[aria-controls="theme-options"]').first().click()
      await page.waitForTimeout(200)
    }

    // Open menu and actually select a theme
    await openThemeMenu(page)
    // Scope to the theme menu so we don't hit unrelated nav menuitems behind the overlay
    await page.waitForSelector('#theme-options [role="menuitem"]', { state: 'visible' })
    const themeOption = page.locator('#theme-options').getByRole('menuitem').first()
    await themeOption.click()
    await page.waitForTimeout(500)

    // Now open/close 4 more times (counter should have reset and not unlocked yet)
    for (let i = 0; i < 4; i++) {
      await openThemeMenu(page)
      await page.waitForTimeout(200)
      await page.locator('button[aria-controls="theme-options"]').first().click()
      await page.waitForTimeout(200)
    }

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.achievementThemeTapdance), {
        timeout: 100,
      })
      .not.toBe('true')

    await openThemeMenu(page)

    await page.waitForFunction(
      () => {
        return document.documentElement.dataset.achievementThemeTapdance === 'true'
      },
      { timeout: 3000 },
    )
    await expectAchievementCookieContains(page, 'THEME_TAPDANCE')
  })

  test('should unlock THEME_TAPDANCE on the 5th theme menu open and reveal seasonal themes immediately', async ({
    page,
  }) => {
    await gotoAndWaitForMain(page, '/')

    // Open and close theme menu 4 times without selecting a theme.
    for (let i = 0; i < 4; i++) {
      await openThemeMenu(page)
      // Wait for menu to be fully open
      await page.waitForSelector('#theme-options[aria-hidden="false"]', { state: 'attached', timeout: 1000 })
      await page.waitForTimeout(100) // Small delay to ensure state is stable
      await page.locator('button[aria-controls="theme-options"]').first().click()
      // Wait for menu to be fully closed before next iteration
      await page.waitForSelector('#theme-options[aria-hidden="true"]', { state: 'attached', timeout: 1000 })
      await page.waitForTimeout(100) // Small delay to ensure state updates are processed
    }

    await openThemeMenu(page)

    await page.waitForFunction(
      () => {
        return document.documentElement.dataset.achievementThemeTapdance === 'true'
      },
      { timeout: 3000 },
    )

    // Verify achievement is unlocked
    await expectAchievementCookieContains(page, 'THEME_TAPDANCE')

    // Verify the newly unlocked themes are visible in the menu that is already open.
    await expectAllUnlockedSeasonalThemesVisible(page)

    // Verify confetti was triggered (theme tapdance has confetti)
    await expectConfettiLikely(page)
  })

  test('should unlock all seasonal themes after THEME_TAPDANCE', async ({ page }) => {
    await gotoAndWaitForMain(page, '/')

    // Unlock THEME_TAPDANCE by opening the menu 5 times
    for (let i = 0; i < 5; i++) {
      await openThemeMenu(page)
      await page.waitForTimeout(200)
      if (i < 4) await closeThemeMenu(page)
      await page.waitForTimeout(200)
    }

    await page.waitForTimeout(1500)

    // Verify data attribute is set
    const hasAttribute = await page.evaluate(() => {
      return Object.hasOwn(document.documentElement.dataset, 'hasThemeTapdance')
    })
    expect(hasAttribute).toBe(true)
  })
})
