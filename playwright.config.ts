import { defineConfig, devices } from '@playwright/test'
import { getE2EBaseURL, getE2EPort } from './tests/e2e/fixtures/base-url'

const e2eBaseURL = getE2EBaseURL()
const e2ePort = getE2EPort()
const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : {
      command: `bun run prebuild && next build && next start -p ${e2ePort}`,
      url: e2eBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: process.env.CI ? 240000 : 120000,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        TMPDIR: process.env.TMPDIR ?? '/tmp',
        // Override specific values for test environment
        SKIP_ENV_VALIDATION: '1',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_POSTHOG_DISABLED: '1',
        PET_GALLERY_E2E: '1',
        PET_GALLERY_TEST_ADMIN: '1',
        VERCEL_ENV: 'development',
        WORKOS_API_KEY: 'sk_test_pet_gallery_e2e',
        WORKOS_CLIENT_ID: 'client_pet_gallery_e2e',
        WORKOS_COOKIE_PASSWORD: 'pet-gallery-e2e-cookie-password-value',
        NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${e2eBaseURL}/auth/callback`,
        WORKOS_ORG_ID: 'org_pet_gallery_e2e',
        ADMIN_EMAIL: 'admin@example.invalid',
        NEXT_PUBLIC_CONVEX_URL: 'https://pet-gallery-e2e.convex.cloud',
        UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
        // Ensure PostHog env vars are set (even if dummy values) to avoid validation errors
        NEXT_PUBLIC_POSTHOG_KEY: 'test-key',
        NEXT_PUBLIC_POSTHOG_HOST: 'test-host',
      },
    }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 15000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  reporter: process.env.CI ? 'blob' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    locale: 'en-US',
    colorScheme: 'dark',
  },
  webServer,
  projects: [
    { name: 'chromium-desktop', use: { ...devices.DesktopChrome } },
    {
      name: 'chromium-mobile',
      use: { ...devices.Pixel5, viewport: devices.Pixel5?.viewport },
      // Exclude snake game tests - not available on mobile
      testIgnore: ['**/flows/snake-leaderboard.spec.ts'],
    },
  ],
})
