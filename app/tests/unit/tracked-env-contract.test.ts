import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const trackedEnvironmentFiles = ['.env.example', '.env.k8s'] as const

describe('tracked runtime environment contract', () => {
  for (const name of trackedEnvironmentFiles) {
    it(`${name} uses the canonical Backend variable`, () => {
      const content = readFileSync(resolve(process.cwd(), name), 'utf8')

      expect(content).toMatch(/^BACKEND_INTERNAL_URL=/m)
      expect(content).not.toMatch(/^(?:ADMIN|WEB)_BACKEND_INTERNAL_URL=/m)
    })
  }
})
