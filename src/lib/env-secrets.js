/**
 * @param {string | undefined} value
 */
export function isPlaceholderSecret(value) {
  const normalizedValue = value?.trim().toLowerCase()
  return (
    normalizedValue?.includes('placeholder') ||
    normalizedValue?.startsWith('replace-with-') ||
    normalizedValue === 'your-api-key-here'
  )
}
