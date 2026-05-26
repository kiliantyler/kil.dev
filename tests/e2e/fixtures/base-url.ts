function portFromBaseURL(baseURL: string) {
  try {
    const url = new URL(baseURL)
    return url.port || (url.protocol === 'https:' ? '443' : '80')
  } catch {}
}

export function getE2EBaseURL(env: NodeJS.ProcessEnv = process.env) {
  const port = env.PLAYWRIGHT_PORT ?? (env.CI ? '3000' : '3100')
  return env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`
}

export function getE2EPort(env: NodeJS.ProcessEnv = process.env) {
  return env.PLAYWRIGHT_PORT ?? portFromBaseURL(getE2EBaseURL(env)) ?? (env.CI ? '3000' : '3100')
}
