import { COOKIE_KEYS, LOCAL_STORAGE_KEYS } from '@/lib/storage-keys'
import { expect, type Locator, type Page } from '@playwright/test'
import { getE2EBaseURL } from './base-url'

export const E2E_BASE_URL = getE2EBaseURL()

/**
 * Clear all state (localStorage, sessionStorage, cookies) to ensure test isolation
 * Note: This should be called after navigating to a page, or it will navigate to base URL first
 */
export async function clearState(page: Page) {
  await page.context().clearCookies()

  // Navigate to base URL if not already on a page (to access localStorage)
  const currentUrl = page.url()
  if (!currentUrl || currentUrl === 'about:blank' || currentUrl === '') {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
    } catch {
      // If server isn't ready, wait for it with a proper check
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 2000 })
      } catch {
        // If still not ready, try navigation again
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 })
      }
    }
  }

  // Now clear storage (wrapping in try-catch for safety)
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // Ignore if localStorage is not accessible
    }
  })
}

/**
 * Disable animations and transitions for more stable and faster tests
 */
export async function disableAnimations(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  })
}

/**
 * Block analytics and external noise to keep tests hermetic
 */
export async function abortNoise(page: Page) {
  // Instead of aborting (which logs console errors), fulfill with 204 to keep console clean
  const fulfillNoContent = async (route: {
    fulfill: (opts: { status: number; body: string; headers: Record<string, string> }) => Promise<void>
    abort: () => Promise<void>
  }) => {
    try {
      await route.fulfill({ status: 204, body: '', headers: { 'content-type': 'text/plain' } })
    } catch {
      try {
        await route.abort()
      } catch {}
    }
  }
  await page.route('https://app.posthog.com/**', fulfillNoContent)
  await page.route('**/vibecheck/**', fulfillNoContent)
  await page.route('https://cdn.**', fulfillNoContent)
}

/**
 * Disable seasonal overlays before the app's pre-theme script runs
 * Must be called BEFORE the first navigation/load on the page
 */
export async function disableSeasonalOverlays(page: Page) {
  // Ensure SSR and early scripts see the cookie before any navigation
  try {
    await page.context().addCookies([
      {
        name: COOKIE_KEYS.SEASONAL_OVERLAYS_ENABLED,
        value: '0',
        url: E2E_BASE_URL,
        path: '/',
        sameSite: 'Lax',
      },
    ])
  } catch {}

  // Also set cookie/localStorage as early as possible in the page context
  await page.addInitScript(
    (keys: { cookieName: string; lsKey: string }) => {
      try {
        // eslint-disable-next-line unicorn/no-document-cookie
        document.cookie = `${keys.cookieName}=0; path=/; samesite=lax`
      } catch {}
      try {
        localStorage.setItem(keys.lsKey, '0')
      } catch {}
      try {
        document.documentElement.dataset.seasonalOverlaysEnabled = '0'
      } catch {}
    },
    { cookieName: COOKIE_KEYS.SEASONAL_OVERLAYS_ENABLED, lsKey: LOCAL_STORAGE_KEYS.SEASONAL_OVERLAYS_ENABLED },
  )
}

/**
 * Wait for React hydration to complete by checking for page readiness.
 * Uses proper waiting strategies instead of arbitrary timeouts.
 * This waits for DOMContentLoaded and main content visibility, then gives React
 * a brief moment to hydrate and attach event listeners.
 */
export async function waitForHydration(page: Page, timeout = 2000) {
  // Wait for DOM to be ready (should already be done, but ensure it)
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 1000) })
  } catch {
    // If already loaded, continue
  }

  // Wait for main content to be visible (ensures SSR content is rendered)
  const main = page.getByRole('main')
  await expect(main).toBeVisible({ timeout })

  // Give React a moment to hydrate and attach event listeners
  // This is a balance: too short and listeners aren't attached, too long and tests are slow
  // 400ms is typically enough for React hydration after DOMContentLoaded
  // Reduced from 800ms to improve test speed while maintaining stability
  await page.waitForTimeout(400)
}

/**
 * Wait for the primary content landmark to be visible.
 * Prefer element-based readiness checks over network idleness.
 */
export async function waitForMain(page: Page) {
  const main = page.getByRole('main')
  await expect(main).toBeVisible()
}

/**
 * Navigate and wait for DOMContentLoaded + main landmark visibility + hydration.
 * Optimized to use proper waiting strategies instead of arbitrary timeouts.
 */
export async function gotoAndWaitForMain(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForMain(page)
  // Wait for React hydration - give it time to attach event listeners
  // Reduced from 800ms to 400ms to improve test speed
  await page.waitForTimeout(400)
}

/**
 * Click an element that triggers navigation, wait for URL change, DOM readiness, and main landmark.
 */
export async function clickAndWaitForURLThenMain(page: Page, element: Locator, url: string | RegExp) {
  await expect(element).toBeVisible()
  await element.click()
  await expect(page).toHaveURL(url)
  await page.waitForLoadState('domcontentloaded')
  await waitForMain(page)
  // Use a shorter timeout for hydration since we've already waited for main
  await waitForHydration(page, 1000)
}

/**
 * Wait for DOMContentLoaded and main landmark, useful after browser history navigation.
 */
export async function waitForDomContentAndMain(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await waitForMain(page)
  // Use a shorter timeout for hydration since we've already waited for main
  await waitForHydration(page, 1000)
}

/**
 * Open the theme menu
 */
export async function openThemeMenu(page: Page) {
  // Select by aria-controls as the button has no accessible name
  const themeButton = page.locator('button[aria-controls="theme-options"]').first()
  // Wait for button to be visible and enabled before clicking
  await expect(themeButton).toBeVisible({ timeout: 5000 })
  await themeButton.click()
  await page.waitForSelector('#theme-options[aria-hidden="false"]', { state: 'attached', timeout: 2000 })
}

/**
 * Close the theme menu if it's open
 */
export async function closeThemeMenu(page: Page) {
  // Prefer closing via the trigger button to ensure the app's toggle-close logic runs
  // This increments the internal open/close counter used for THEME_TAPDANCE
  const menuOpen = await page
    .locator('#theme-options[aria-hidden="false"]')
    .isVisible()
    .catch(() => false)

  if (!menuOpen) return

  const trigger = page.locator('button[aria-controls="theme-options"]').first()
  await trigger.click()
  // Wait for menu to close instead of arbitrary timeout
  await page.waitForSelector('#theme-options[aria-hidden="true"]', { state: 'attached', timeout: 1000 })
}

/**
 * Toggle to a specific theme
 */
export async function toggleTheme(page: Page, themeName: string) {
  await openThemeMenu(page)
  const themeOption = page.getByRole('menuitem', { name: themeName })
  await themeOption.click()
  // Wait for theme to be applied by checking localStorage or DOM attribute
  await page
    .waitForFunction(
      (name: string) => {
        const stored = localStorage.getItem('theme')
        return stored === name || document.documentElement.dataset.themePref === name
      },
      themeName,
      { timeout: 2000 },
    )
    .catch(() => {
      // Fallback: wait for menu to close
      return page.waitForSelector('#theme-options[aria-hidden="true"]', { state: 'attached', timeout: 1000 })
    })
}

/**
 * Get current theme from HTML class
 */
export async function getCurrentTheme(page: Page): Promise<string> {
  return page.evaluate(() => {
    const html = document.documentElement
    // Prefer explicit applied theme reported by runtime
    const applied = html.dataset.appliedTheme
    if (applied && applied !== 'light' && applied !== 'dark') return applied
    const pref = html.dataset.themePref
    if (pref && pref !== 'system') return pref
    if (html.classList.contains('dark')) return 'dark'
    if (html.classList.contains('light')) return 'light'
    return 'light'
  })
}

/**
 * Reliably navigate via a primary nav anchor, avoiding overlay/hover races
 */
export async function navigateViaAnchor(page: Page, href: string, timeoutMs = 2500) {
  const selector = `nav[aria-label="Primary"] a[href="${href}"]`
  const anchor = page.locator(selector).first()
  await anchor.scrollIntoViewIfNeeded()
  await expect(anchor).toBeVisible()

  const urlRegex = new RegExp(href.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + String.raw`(?:/?|(\?.*)?)$`)

  // Attempt 1: keyboard activation
  await anchor.focus()
  try {
    await page.keyboard.press('Enter')
    await page.waitForURL(urlRegex, { timeout: timeoutMs })
    return
  } catch {}

  // Attempt 2: direct JS click
  try {
    await anchor.evaluate(node => (node as HTMLAnchorElement).click())
    await page.waitForURL(urlRegex, { timeout: timeoutMs })
    return
  } catch {}

  // Attempt 3: dispatch MouseEvent as a last resort
  await anchor.evaluate(node => {
    const el = node as HTMLAnchorElement
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
  })
  await page.waitForURL(urlRegex, { timeout: timeoutMs })
}
