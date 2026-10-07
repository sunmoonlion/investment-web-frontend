import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'

describe('where investment takes people', () => {
  it('goes nowhere else: public data entries live in the admin consoles (owner 2026-10-07)', () => {
    expect(Object.keys(destinations)).toEqual([])
  })
})
