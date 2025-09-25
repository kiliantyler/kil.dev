export const PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE = 'data-profile-image-variant'

export function buildProfileImageVariantScript(domains: readonly string[]): string {
  const serializedDomains = JSON.stringify(domains)
  const attr = PROFILE_IMAGE_VARIANT_DATA_ATTRIBUTE
  return `;(function(){
  try {
    var root = document && document.documentElement ? document.documentElement : null
    if (!root) return
    var hostname = window && window.location ? window.location.hostname : ''
    if (!hostname || typeof hostname !== 'string') return
    var domains = ${serializedDomains}
    if (!Array.isArray(domains)) return
    var isAltDomain = domains.indexOf(hostname) !== -1
    if (!isAltDomain) {
      return
    }
    root.setAttribute('${attr}', 'amongus')
  } catch (error) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to set profile image variant before hydration', error)
    }
  }
})()`
}
