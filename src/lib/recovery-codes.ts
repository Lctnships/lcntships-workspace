import { randomBytes, createHash, timingSafeEqual } from 'crypto'

const CODE_COUNT = 10
const CODE_BYTES = 6 // 6 bytes → 12 hex chars → group as XXXX-XXXX-XXXX

export function generateRecoveryCodes(): { plaintext: string[]; hashes: string[] } {
  const plaintext: string[] = []
  const hashes: string[] = []
  for (let i = 0; i < CODE_COUNT; i++) {
    const hex = randomBytes(CODE_BYTES).toString('hex').toUpperCase()
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`
    plaintext.push(formatted)
    hashes.push(hashCode(formatted))
  }
  return { plaintext, hashes }
}

export function hashCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
  return createHash('sha256').update(normalized).digest('hex')
}

export function codesMatch(candidate: string, storedHash: string): boolean {
  const candidateHash = hashCode(candidate)
  if (candidateHash.length !== storedHash.length) return false
  return timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash))
}
