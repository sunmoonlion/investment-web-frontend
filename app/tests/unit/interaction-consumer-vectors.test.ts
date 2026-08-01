import fs from 'node:fs'

import { describe, expect, test } from 'vitest'

import {
  runActionSchema,
  runEventSchema,
  runSnapshotSchema,
} from '@/contracts/interaction'

type VectorGroup = {
  snapshots: unknown[]
  events: unknown[]
  actions: unknown[]
}

type ConsumerVectors = {
  contract: string
  contract_version: number
  valid: VectorGroup
  invalid: {
    snapshots: { case: string; value: unknown }[]
    events: { case: string; value: unknown }[]
    actions: { case: string; value: unknown }[]
  }
}

function loadVectors(): ConsumerVectors | undefined {
  const source = process.env.WEB_INTERACTION_CONSUMER_VECTORS
  if (!source) return undefined
  return JSON.parse(fs.readFileSync(source, 'utf8')) as ConsumerVectors
}

const vectors = loadVectors()
const contractTest = vectors ? test : test.skip

describe('shared Web interaction v1 consumer vectors', () => {
  contractTest('accepts every valid template-owned vector', () => {
    expect(vectors?.contract).toBe('sunmoonai.web-interaction')
    expect(vectors?.contract_version).toBe(1)
    for (const value of vectors?.valid.snapshots ?? []) {
      expect(runSnapshotSchema.safeParse(value).success).toBe(true)
    }
    for (const value of vectors?.valid.events ?? []) {
      expect(runEventSchema.safeParse(value).success).toBe(true)
    }
    for (const value of vectors?.valid.actions ?? []) {
      expect(runActionSchema.safeParse(value).success).toBe(true)
    }
  })

  contractTest('rejects every invalid template-owned vector', () => {
    for (const vector of vectors?.invalid.snapshots ?? []) {
      expect(runSnapshotSchema.safeParse(vector.value).success, vector.case).toBe(false)
    }
    for (const vector of vectors?.invalid.events ?? []) {
      expect(runEventSchema.safeParse(vector.value).success, vector.case).toBe(false)
    }
    for (const vector of vectors?.invalid.actions ?? []) {
      expect(runActionSchema.safeParse(vector.value).success, vector.case).toBe(false)
    }
  })
})
