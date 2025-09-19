// Deterministic JSON serialization: recursively sort object keys
// - Objects: keys sorted lexicographically
// - Arrays: preserve order
// - Primitives: JSON.stringify default behavior

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function serialize(value: unknown): string {
  // Handle primitives and non-plain objects via JSON.stringify directly
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value as JsonPrimitive)
  }

  // Date, RegExp, Map, Set, etc. fall back to JSON.stringify's behavior
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return JSON.stringify(value as unknown as JsonValue)
  }

  if (Array.isArray(value)) {
    const items = value.map(v => serialize(v))
    return `[${items.join(',')}]`
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const parts: string[] = []
  for (const key of keys) {
    const val = obj[key]
    // Omit undefined to match JSON.stringify behavior
    if (typeof val === 'undefined') continue
    parts.push(`${JSON.stringify(key)}:${serialize(val)}`)
  }
  return `{${parts.join(',')}}`
}

export function stableStringify(value: unknown): string {
  return serialize(value)
}

export default stableStringify
