import { shouldCapturePostHogEvents } from '@/lib/posthog-config'
import { isDev } from '@/utils/utils'
import type { Route } from 'next'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const canCapture = shouldCapturePostHogEvents({
  isDevRuntime: isDev(),
  posthogDisabled: process.env.NEXT_PUBLIC_POSTHOG_DISABLED,
  posthogKey,
})

// Centralized event property names for consistent usage across all PostHog events
enum PostHogEventProperties {
  PLATFORM = 'platform',
  HREF = 'href',
  THEME = 'theme',
  PROJECT_ID = 'projectId',
  FLIPPED_TO = 'flippedTo',
  SOURCE = 'source',
  INTERACTION = 'interaction',
  NEW_STATE = 'newState',
  WAS_CONFUSED = 'wasConfused',
  PET_ID = 'petId',
  USER_AGENT = 'userAgent',
  COMPANY_ID = 'companyId',
  EXPANDED = 'expanded',
  ACHIEVEMENT_ID = 'achievementId',
}

// Lazy load posthog to avoid blocking initial render
async function getPostHog() {
  if (!canCapture) return null
  try {
    const { default: posthog } = await import('posthog-js')
    return posthog
  } catch {
    return null
  }
}

export function captureSocialLinkClicked(platform: string, href: Route) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('social_link_clicked', {
      [PostHogEventProperties.PLATFORM]: platform,
      [PostHogEventProperties.HREF]: href,
    })
  })
}

export function captureThemeChanged(theme: string) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('theme_changed', {
      [PostHogEventProperties.THEME]: theme,
    })
  })
}

export function captureProjectCardFlipped(projectId: string, flippedTo: string) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('project_card_flipped', {
      [PostHogEventProperties.PROJECT_ID]: projectId,
      [PostHogEventProperties.FLIPPED_TO]: flippedTo,
    })
  })
}

export function captureProjectSourceClicked(projectId: string, source: Route) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('project_source_clicked', {
      [PostHogEventProperties.PROJECT_ID]: projectId,
      [PostHogEventProperties.SOURCE]: source,
    })
  })
}

export function captureProjectVisitClicked(projectId: string, href: Route) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('project_visit_clicked', {
      [PostHogEventProperties.PROJECT_ID]: projectId,
      [PostHogEventProperties.HREF]: href,
    })
  })
}

export function captureProfileImageClicked(interaction: string, newState: string, wasConfused: boolean) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('profile_image_clicked', {
      [PostHogEventProperties.INTERACTION]: interaction,
      [PostHogEventProperties.NEW_STATE]: newState,
      [PostHogEventProperties.WAS_CONFUSED]: wasConfused,
    })
  })
}

export function captureDarkModeEasterEgg() {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('dark_mode_easter_egg')
  })
}

export function capturePetCardFlipped(petId: string, flippedTo: string) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('pet_card_flipped', {
      [PostHogEventProperties.PET_ID]: petId,
      [PostHogEventProperties.FLIPPED_TO]: flippedTo,
    })
  })
}

export function captureLadybirdDetected(userAgent: string) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('ladybird_browser_detected', {
      [PostHogEventProperties.USER_AGENT]: userAgent,
    })
  })
}

export function captureWorkHighlightsToggled(companyId: string, expanded: boolean) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('work_highlights_toggled', {
      [PostHogEventProperties.COMPANY_ID]: companyId,
      [PostHogEventProperties.EXPANDED]: expanded,
    })
  })
}

export function captureCompanyLogoClicked(companyId: string, companyUrl: Route) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('company_logo_clicked', {
      [PostHogEventProperties.COMPANY_ID]: companyId,
      [PostHogEventProperties.HREF]: companyUrl,
    })
  })
}

export function captureAchievementUnlocked(achievementId: string) {
  if (!canCapture) return
  void getPostHog().then(posthog => {
    posthog?.capture('achievement_unlocked', {
      [PostHogEventProperties.ACHIEVEMENT_ID]: achievementId,
    })
  })
}
