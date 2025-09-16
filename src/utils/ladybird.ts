export const isLadybirdUA = () => {
  if (typeof navigator === 'undefined') return false
  const l = (navigator.userAgent || '').toLowerCase()
  if (l.includes('ladybird')) return true
  if (l.includes('serenity') || l.includes('serenityos')) return true
  return false
}
