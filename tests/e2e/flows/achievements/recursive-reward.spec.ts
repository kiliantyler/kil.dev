import { expect, test } from '@playwright/test'
import { expectAchievementCookieContains, getUnlockedAchievementCount } from '../../fixtures/achievement-helpers'
import { abortNoise, clearState, gotoAndWaitForMain } from '../../fixtures/test-helpers'

test.describe('RECURSIVE_REWARD Achievement', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page)
    await abortNoise(page)
  })

  test('should unlock RECURSIVE_REWARD after unlocking 3 other achievements', async ({ page }) => {
    // First visit home to mount provider properly
    await gotoAndWaitForMain(page, '/')
    await page.waitForTimeout(500)

    const initialCount = await getUnlockedAchievementCount(page)
    expect(initialCount).toBe(0)

    // Visit About page - unlock first achievement
    await gotoAndWaitForMain(page, '/about')
    await page.waitForTimeout(500)

    const count1 = await getUnlockedAchievementCount(page)
    expect(count1).toBe(1)

    // Visit Experience page - unlock second achievement
    await gotoAndWaitForMain(page, '/experience')
    await page.waitForTimeout(500)

    const count2 = await getUnlockedAchievementCount(page)
    expect(count2).toBe(2)

    // Visit Projects page - unlock third achievement
    await gotoAndWaitForMain(page, '/projects')
    await page.waitForTimeout(1000) // Wait a bit longer for RECURSIVE_REWARD to trigger

    // Should now have 4 achievements (3 + RECURSIVE_REWARD)
    const finalCount = await getUnlockedAchievementCount(page)
    expect(finalCount).toBe(4)

    // Verify RECURSIVE_REWARD is unlocked
    await expectAchievementCookieContains(page, 'RECURSIVE_REWARD')
  })

  test('should make achievements nav link visible after RECURSIVE_REWARD', async ({ page }) => {
    // First visit home to mount provider
    await gotoAndWaitForMain(page, '/')
    await page.waitForTimeout(500)

    // Unlock 3 achievements to trigger RECURSIVE_REWARD
    await gotoAndWaitForMain(page, '/about')
    await page.waitForTimeout(500)

    await gotoAndWaitForMain(page, '/experience')
    await page.waitForTimeout(500)

    await gotoAndWaitForMain(page, '/projects')
    await page.waitForTimeout(1000)

    // Navigate to home to check for achievements link
    await gotoAndWaitForMain(page, '/')

    // Achievements link should now be visible
    const achievementsLink = page.locator('.js-achievements-nav')
    await expect(achievementsLink).toBeVisible()
  })

  test('should animate desktop nav layout when achievements link appears', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 0) < 920) {
      test.skip(true, 'Desktop topbar is hidden below the nav breakpoint')
    }

    type NavSample = {
      achievementsWidth: number
      achievementsVisible: boolean
      achievementsPointerEvents: string
      indicatorCenter: number
      projectsCenter: number
      projectsX: number
    }

    const readNavSample = async (): Promise<NavSample> => {
      return page.evaluate(() => {
        const rectOf = (selector: string) => {
          const element = document.querySelector(selector)
          if (!element) throw new Error(`Missing element: ${selector}`)
          return element.getBoundingClientRect()
        }
        const nav = document.querySelector('nav[aria-label="Primary"]')
        const indicator = nav?.querySelector('div > span:nth-child(2)')
        if (!indicator) throw new Error('Missing nav indicator')

        const achievements = rectOf('.js-achievements-nav')
        const projects = rectOf('nav[aria-label="Primary"] a[href="/projects"]')
        const indicatorRect = indicator.getBoundingClientRect()

        return {
          achievementsWidth: achievements.width,
          achievementsVisible: achievements.width > 0 && achievements.height > 0,
          achievementsPointerEvents: getComputedStyle(document.querySelector('.js-achievements-nav')!).pointerEvents,
          indicatorCenter: indicatorRect.left + indicatorRect.width / 2,
          projectsCenter: projects.left + projects.width / 2,
          projectsX: projects.left,
        }
      })
    }

    await gotoAndWaitForMain(page, '/')
    const initial = await readNavSample()
    expect(initial.achievementsVisible).toBe(false)

    await gotoAndWaitForMain(page, '/about')
    await gotoAndWaitForMain(page, '/experience')
    await page.goto('/projects', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible()

    const samples: NavSample[] = []
    for (let i = 0; i < 12; i += 1) {
      samples.push(await readNavSample())
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(600)
    const settled = await readNavSample()

    const linkExpandsThroughIntermediateWidths = samples.some(
      sample => sample.achievementsWidth > 8 && sample.achievementsWidth < settled.achievementsWidth - 8,
    )
    const siblingsMoveThroughIntermediatePositions = samples.some(
      sample => sample.projectsX < initial.projectsX - 8 && sample.projectsX > settled.projectsX + 8,
    )
    const pointerGuardActiveDuringReveal = samples.some(
      sample => sample.achievementsVisible && sample.achievementsPointerEvents === 'none',
    )
    const indicatorDistanceFromActiveProject = Math.abs(settled.indicatorCenter - settled.projectsCenter)

    expect(settled.achievementsVisible).toBe(true)
    expect(linkExpandsThroughIntermediateWidths).toBe(true)
    expect(siblingsMoveThroughIntermediatePositions).toBe(true)
    expect(pointerGuardActiveDuringReveal).toBe(true)
    expect(indicatorDistanceFromActiveProject).toBeLessThan(20)
  })
})
