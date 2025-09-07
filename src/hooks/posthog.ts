import posthog from 'posthog-js'

export function captureSocialLinkClicked(platform: string, href: string) {
  posthog.capture('social_link_clicked', {
    platform: platform,
    href: href,
  })
}

export function captureThemeChanged(theme: string) {
  posthog.capture('theme_changed', {
    theme: theme,
  })
}

export function captureProjectCardFlipped(projectId: string, flippedTo: string) {
  posthog.capture('project_card_flipped', {
    projectId: projectId,
    flippedTo: flippedTo,
  })
}

export function captureProjectSourceClicked(projectId: string, source: string) {
  posthog.capture('project_source_clicked', {
    projectId: projectId,
    source: source,
  })
}

export function captureProjectVisitClicked(projectId: string, href: string) {
  posthog.capture('project_visit_clicked', {
    projectId: projectId,
    href: href,
  })
}

export function captureProfileImageClicked(interaction: string, newState: string, wasConfused: boolean) {
  posthog.capture('profile_image_clicked', {
    interaction: interaction,
    newState: newState,
    wasConfused: wasConfused,
  })
}

export function captureDarkModeEasterEgg() {
  posthog.capture('dark_mode_easter_egg')
}

export function capturePetCardFlipped(petId: string, flippedTo: string) {
  posthog.capture('pet_card_flipped', {
    petId: petId,
    flippedTo: flippedTo,
  })
}

export function captureLadybirdDetected(userAgent: string) {
  posthog.capture('ladybird_browser_detected', {
    userAgent: userAgent,
  })
}

export function captureWorkHighlightsToggled(companyId: string, expanded: boolean) {
  posthog.capture('work_highlights_toggled', {
    companyId: companyId,
    expanded: expanded,
  })
}

export function captureCompanyLogoClicked(companyId: string, companyUrl: string) {
  posthog.capture('company_logo_clicked', {
    companyId: companyId,
    href: companyUrl,
  })
}
