export type PostHogRuntimeConfig = {
  isDevRuntime: boolean
  posthogDisabled?: string
  posthogHost?: string
  posthogKey?: string
}

function isPostHogDisabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true'
}

export function shouldInitializePostHog({
  isDevRuntime,
  posthogDisabled,
  posthogHost,
  posthogKey,
}: PostHogRuntimeConfig) {
  return !isDevRuntime && !isPostHogDisabled(posthogDisabled) && !!posthogKey && !!posthogHost
}

export function shouldCapturePostHogEvents({
  isDevRuntime,
  posthogDisabled,
  posthogKey,
}: Omit<PostHogRuntimeConfig, 'posthogHost'>) {
  return !isDevRuntime && !isPostHogDisabled(posthogDisabled) && !!posthogKey
}
