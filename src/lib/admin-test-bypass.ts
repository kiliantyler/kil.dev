export const ADMIN_TEST_BYPASS_COOKIE = 'pet-gallery-test-admin'
export const ADMIN_TEST_BYPASS_COOKIE_VALUE = '1'

export function isAdminTestBypassEnvEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.PET_GALLERY_E2E === '1' && env.PET_GALLERY_TEST_ADMIN === '1' && env.VERCEL_ENV === 'development'
}

export function isPetGalleryPublicTestSnapshotEnvEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.PET_GALLERY_E2E === '1' &&
    env.PET_GALLERY_TEST_ADMIN === '1' &&
    env.NEXT_PUBLIC_CONVEX_URL === 'https://pet-gallery-e2e.convex.cloud'
  )
}
