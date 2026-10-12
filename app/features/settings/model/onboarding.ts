export const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Keep only the pairing alphabet, uppercase it, and insert the hyphen after four characters. */
export function formatPairingCode(raw: string): string {
  const chars = [...raw.toUpperCase()]
    .filter((character) => PAIRING_ALPHABET.includes(character))
    .slice(0, 8)
  if (chars.length <= 4) return chars.join('')
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export function pairingCodeComplete(value: string): boolean {
  return new RegExp(`^[${PAIRING_ALPHABET}]{4}-[${PAIRING_ALPHABET}]{4}$`).test(value)
}

export function minutesRemaining(expiresAt: string, now = Date.now()): number {
  const ms = Date.parse(expiresAt) - now
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.ceil(ms / 60_000))
}

// Only validated backend fields reach these commands. Quote even those fields;
// the credential is entered later in the native terminal and never interpolated.
const ps = (value: string) => `'${value.replaceAll("'", "''")}'`

export function initCommand(relay: string, user: string) {
  return String.raw`& "$env:LOCALAPPDATA\Programs\sunmoon-agent\sunmoon-agent.cmd" init --relay ${ps(relay)} --user ${ps(user)} --token-prompt`
}

