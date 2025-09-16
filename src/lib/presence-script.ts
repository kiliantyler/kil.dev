// Presence detection runtime (browser)
// This file is compiled and minified at build-time into an IIFE that exposes
// a global object `PresenceRuntime` with a named export function `initPresence`.

export type PresenceScriptConfig = {
  cookieName: string
  key: string
  attribute: string
}

function validateConfig(config: PresenceScriptConfig): void {
  if (!config) throw new Error('Missing config')
  const { cookieName, key, attribute } = config
  if (typeof cookieName !== 'string' || cookieName.length === 0) {
    throw new Error('Invalid cookieName')
  }
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Invalid key')
  }
  if (typeof attribute !== 'string' || attribute.length === 0) {
    throw new Error('Invalid attribute')
  }
}

function getCookieValue(name: string): string | null {
  try {
    const re = new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, r => '\\' + r) + '=([^;]+)')
    const m = re.exec(document.cookie)
    return m ? m[1]! : null
  } catch {
    return null
  }
}

function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

function cookieContainsKey(rawCookie: string, key: string): boolean {
  const text = safeDecodeURIComponent(rawCookie)
  try {
    const parsed = JSON.parse(text) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      Object.prototype.hasOwnProperty.call(parsed as Record<string, unknown>, key)
    ) {
      return true
    }
  } catch {}
  return text.indexOf(key) > -1
}

export function initPresence(config: PresenceScriptConfig): void {
  validateConfig(config)

  const raw = getCookieValue(config.cookieName)
  if (!raw) return

  const has = cookieContainsKey(raw, config.key)
  if (!has) return

  try {
    document.documentElement.setAttribute(config.attribute, 'true')
  } catch {}
}

export default initPresence
