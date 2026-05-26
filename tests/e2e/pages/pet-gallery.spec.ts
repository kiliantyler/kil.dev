import { expect, test } from '@playwright/test'
import { abortNoise, clearState, disableAnimations, gotoAndWaitForMain } from '../fixtures/test-helpers'

test.describe('Pet Gallery Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page)
    await abortNoise(page)
    await disableAnimations(page)

    // Unlock PET_PARADE so we can access the pet gallery page
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem(
        'kil.dev/achievements/v1',
        JSON.stringify({
          PET_PARADE: new Date().toISOString(),
        }),
      )
      document.documentElement.dataset.hasPetGallery = 'true'
    })
  })

  test('should render without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter out expected environment variable validation errors in test environment
        if (!text.includes('Invalid environment variables')) {
          errors.push(text)
        }
      }
    })

    await gotoAndWaitForMain(page, '/pet-gallery')

    expect(errors).toHaveLength(0)
  })

  test('should have correct page title', async ({ page }) => {
    await page.goto('/pet-gallery', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/Pet Gallery.*Kilian Tyler/)
  })

  test('should have proper landmark structure', async ({ page }) => {
    await gotoAndWaitForMain(page, '/pet-gallery')

    const header = page.getByRole('banner')
    await expect(header).toBeVisible()

    const main = page.getByRole('main')
    await expect(main).toBeVisible()

    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
  })

  test('should display pet gallery heading', async ({ page }) => {
    await gotoAndWaitForMain(page, '/pet-gallery')

    // There are multiple matches (nav + heading); assert the heading text specifically
    await expect(page.locator('main').getByText('Pet gallery', { exact: true })).toBeVisible()
  })

  test('should display gallery images', async ({ page }) => {
    await gotoAndWaitForMain(page, '/pet-gallery')

    // Wait for images to load
    await page.waitForTimeout(1000)

    // Check for gallery images
    // Count gallery items in server or client album containers
    // Try react-photo-album rendered images (NextImage renders img tags)
    const albumImages = page.locator('main img[alt]')
    const count = await albumImages.count().catch(() => 0)
    expect(count).toBeGreaterThan(0)
    await expect(albumImages.first()).toHaveAttribute('src', /petGalleryMock=photo-|petGalleryMock%3Dphoto-/)
    await expect(albumImages.first()).not.toHaveAttribute('src', /\/_next\/image/)
    await expect(albumImages.first()).toHaveAttribute('srcset', /320w/)
    await expect(albumImages.first()).toHaveAttribute('sizes', /50vw/)
  })
})
