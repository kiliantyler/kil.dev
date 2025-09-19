// Deterministic JSON serialization: recursively sort object keys
// - Objects: keys sorted lexicographically
// - Arrays: preserve order
// - Primitives: JSON.stringify default behavior

function serialize(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): string {
  // Primitives
  if (value === null) return 'null'

  const valueType = typeof value

  if (valueType === 'string' || valueType === 'boolean') {
    return JSON.stringify(value)
  }

  if (valueType === 'number') {
    return JSON.stringify(Number.isFinite(value as number) ? (value as number) : null)
  }

  if (valueType === 'bigint') {
    // JSON.stringify throws on BigInt; convert to string representation
    return JSON.stringify((value as bigint).toString())
  }

  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') {
    // Top-level unsupported primitives -> null to remain JSON-safe
    return 'null'
  }

  // Objects
  // value is not null and typeof === 'object' at this point
  const obj = value as object

  if (seen.has(obj)) {
    throw new TypeError('Converting circular structure to JSON')
  }

  // Dates -> ISO string
  if (obj instanceof Date) {
    return JSON.stringify(obj.toJSON())
  }

  // RegExp -> string representation
  if (obj instanceof RegExp) {
    return JSON.stringify(obj.toString())
  }

  // Map -> array of [keyJson,valueJson] pairs sorted for stability
  if (obj instanceof Map) {
    seen.add(obj)
    const pairStrings: string[] = []
    for (const [k, v] of obj.entries()) {
      const keyJson = serialize(k, seen)
      const valueJson = serialize(v, seen)
      pairStrings.push(`[${keyJson},${valueJson}]`)
    }
    pairStrings.sort()
    return `[${pairStrings.join(',')}]`
  }

  // Set -> sorted array of serialized entries for stability
  if (obj instanceof Set) {
    seen.add(obj)
    const items = Array.from(obj.values()).map(v => serialize(v, seen))
    items.sort()
    return `[${items.join(',')}]`
  }

  // Array -> preserve order, convert undefined/function/symbol to null
  if (Array.isArray(obj)) {
    seen.add(obj)
    const items = obj.map(item => {
      if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') {
        return 'null'
      }
      return serialize(item, seen)
    })
    return `[${items.join(',')}]`
  }

  // Any other object (including plain objects and class instances):
  // Use own enumerable properties only, with lexicographically sorted keys
  seen.add(obj)
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  const parts: string[] = []
  for (const key of keys) {
    const val = (obj as Record<string, unknown>)[key]
    // Omit undefined/function/symbol to match JSON.stringify behavior on objects
    if (typeof val === 'undefined' || typeof val === 'function' || typeof val === 'symbol') continue
    parts.push(`${JSON.stringify(key)}:${serialize(val, seen)}`)
  }
  return `{${parts.join(',')}}`
}

export function stableStringify(value: unknown): string {
  return serialize(value)
}

export default stableStringify
