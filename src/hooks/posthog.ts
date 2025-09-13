import type { Route } from 'next'
import posthog from 'posthog-js'

const isDev = process.env.NODE_ENV !== 'production'
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const canCapture = !isDev && posthogKey

export function captureSocialLinkClicked(platform: string, href: Route) {
  if (!canCapture) return
  posthog.capture('social_link_clicked', {
    platform: platform,
    href: href,
  })
}

export function captureThemeChanged(theme: string) {
  if (!canCapture) return
  posthog.capture('theme_changed', {
    theme: theme,
  })
}

export function captureProjectCardFlipped(projectId: string, flippedTo: string) {
  if (!canCapture) return
  posthog.capture('project_card_flipped', {
    projectId: projectId,
    flippedTo: flippedTo,
  })
}

export function captureProjectSourceClicked(projectId: string, source: Route) {
  if (!canCapture) return
  posthog.capture('project_source_clicked', {
    projectId: projectId,
    source: source,
  })
}

export function captureProjectVisitClicked(projectId: string, href: Route) {
  if (!canCapture) return
  posthog.capture('project_visit_clicked', {
    projectId: projectId,
    href: href,
  })
}

export function captureProfileImageClicked(interaction: string, newState: string, wasConfused: boolean) {
  if (!canCapture) return
  posthog.capture('profile_image_clicked', {
    interaction: interaction,
    newState: newState,
    wasConfused: wasConfused,
  })
}

export function captureDarkModeEasterEgg() {
  if (!canCapture) return
  posthog.capture('dark_mode_easter_egg')
}

export function capturePetCardFlipped(petId: string, flippedTo: string) {
  if (!canCapture) return
  posthog.capture('pet_card_flipped', {
    petId: petId,
    flippedTo: flippedTo,
  })
}

export function captureLadybirdDetected(userAgent: string) {
  if (!canCapture) return
  posthog.capture('ladybird_browser_detected', {
    userAgent: userAgent,
  })
}

export function captureWorkHighlightsToggled(companyId: string, expanded: boolean) {
  if (!canCapture) return
  posthog.capture('work_highlights_toggled', {
    companyId: companyId,
    expanded: expanded,
  })
}

export function captureCompanyLogoClicked(companyId: string, companyUrl: Route) {
  if (!canCapture) return
  posthog.capture('company_logo_clicked', {
    companyId: companyId,
    href: companyUrl,
  })
}
