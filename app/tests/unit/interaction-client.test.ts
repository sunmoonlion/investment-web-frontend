import { describe, expect, it, vi } from 'vitest'
import {
  cancelRun,
  createRun,
  fetchRunSnapshot,
  InteractionClientError,
  parseRunEventPayload,
  submitRunAction,
} from '@/lib/interaction/client'

const runId = '00000000-0000-5000-8000-000000000001'

describe('interaction client', () => {
  it('accepts an exact run snapshot and forwards no provider credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(snapshot()))
    await expect(fetchRunSnapshot(runId, fetchImpl)).resolves.toMatchObject({ run_id: runId })

    const [, init] = fetchImpl.mock.calls[0]
    expect(init).toMatchObject({ credentials: 'same-origin', cache: 'no-store' })
    expect(JSON.stringify(init)).not.toMatch(/access_token|refresh_token|provider_metadata/)
  })

  it('fails closed when the downstream snapshot adds a provider token', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...snapshot(), access_token: 'forbidden' }))
    await expect(fetchRunSnapshot(runId, fetchImpl)).rejects.toMatchObject({
      code: 'contract_invalid',
    })
  })

  it('preserves only stable error code and operation id', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'resource_forbidden',
            message: 'Denied',
            operation_id: 'operation-42',
          },
        },
        403,
      ),
    )
    await expect(fetchRunSnapshot(runId, fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<InteractionClientError>>({
        code: 'resource_forbidden',
        operationId: 'operation-42',
      }),
    )
  })

  it('binds an SSE payload to the transport event id', () => {
    const payload = event()
    expect(parseRunEventPayload(JSON.stringify(payload), payload.event_id)).toEqual(payload)
    expect(() => parseRunEventPayload(JSON.stringify(payload), crypto.randomUUID())).toThrow(
      InteractionClientError,
    )
  })

  it('submits HITL only with same-origin credentials and CSRF', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(snapshot()))
    await submitRunAction(
      runId,
      {
        contract_version: 1,
        action_id: '00000000-0000-5000-8000-000000000020',
        value: 'confirm',
      },
      'csrf-token',
      fetchImpl,
    )
    const [, init] = fetchImpl.mock.calls[0]
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
    })
  })

  it('creates and cancels runs with exact browser contracts and CSRF', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse(snapshot()))
    await createRun(
      {
        contract_version: 1,
        idempotency_key: crypto.randomUUID(),
        title: 'Pilot',
        input: { text: 'Use authorized evidence' },
      },
      'csrf-token',
      fetchImpl,
    )
    await cancelRun(
      runId,
      {
        contract_version: 1,
        idempotency_key: crypto.randomUUID(),
        reason: 'user request',
      },
      'csrf-token',
      fetchImpl,
    )

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/web/v1/runs')
    expect(fetchImpl.mock.calls[1][0]).toBe(`/api/web/v1/runs/${runId}/cancel`)
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
      })
      expect(JSON.stringify(init)).not.toMatch(/access_token|service_token/)
    }
  })
})

function snapshot() {
  return {
    contract_version: 1,
    run_id: runId,
    title: 'Reference run',
    status: 'running',
    summary: null,
    last_sequence_no: 1,
    last_event_id: '00000000-0000-5000-8000-000000000010',
    citations: [],
    required_action: null,
    updated_at: '2030-01-01T00:00:00.000Z',
  }
}

function event() {
  return {
    contract_version: 1,
    event_id: '00000000-0000-5000-8000-000000000011',
    run_id: runId,
    sequence_no: 2,
    occurred_at: '2030-01-01T00:00:01.000Z',
    type: 'delta',
    data: { text: 'fragment' },
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
