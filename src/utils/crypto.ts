export async function computeSha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(hashBuffer))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}
