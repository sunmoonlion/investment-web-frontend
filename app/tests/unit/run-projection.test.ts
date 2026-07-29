import { describe, expect, it } from 'vitest'
import type { RunEvent, RunSnapshot } from '@/contracts/interaction'
import { applyRunEvent, createRunProjection } from '@/lib/interaction/projection'

const runId = '00000000-0000-5000-8000-000000000001'

describe('run event projection', () => {
  it('applies an ordered delta exactly once', () => {
    const projection = createRunProjection(snapshot())
    const applied = applyRunEvent(projection, event(2, 'delta', { text: 'fragment' }))

    expect(applied.kind).toBe('applied')
    expect(applied.projection.snapshot.summary).toBe('fragment')
    expect(applyRunEvent(applied.projection, event(2, 'delta', { text: 'fragment' })).kind).toBe(
      'duplicate',
    )
  })

  it('requests reconciliation when a sequence is missing', () => {
    const result = applyRunEvent(
      createRunProjection(snapshot()),
      event(3, 'delta', { text: 'out of order' }),
    )

    expect(result).toMatchObject({ kind: 'gap', expected: 2, received: 3 })
    expect(result.projection.snapshot.last_sequence_no).toBe(1)
  })

  it('rejects events from a different run', () => {
    const candidate = { ...event(2, 'heartbeat', {}), run_id: crypto.randomUUID() }
    expect(applyRunEvent(createRunProjection(snapshot()), candidate).kind).toBe('foreign_run')
  })

  it('projects HITL and terminal completion without retaining stale action state', () => {
    const waiting = applyRunEvent(
      createRunProjection(snapshot()),
      event(2, 'input_required', {
        action: {
          action_id: '00000000-0000-5000-8000-000000000020',
          kind: 'confirmation',
          prompt: 'Confirm',
        },
      }),
    ).projection
    const completed = applyRunEvent(
      waiting,
      event(3, 'completed', { summary: 'Finished' }),
    ).projection.snapshot

    expect(waiting.snapshot.status).toBe('waiting_for_input')
    expect(completed).toMatchObject({ status: 'succeeded', summary: 'Finished' })
    expect(completed.required_action).toBeNull()
  })
})

function snapshot(): RunSnapshot {
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

function event<T extends RunEvent['type']>(
  sequenceNo: number,
  type: T,
  data: Extract<RunEvent, { type: T }>['data'],
): Extract<RunEvent, { type: T }> {
  return {
    contract_version: 1,
    event_id: `00000000-0000-5000-8000-${String(sequenceNo).padStart(12, '0')}`,
    run_id: runId,
    sequence_no: sequenceNo,
    occurred_at: `2030-01-01T00:00:0${sequenceNo}.000Z`,
    type,
    data,
  } as Extract<RunEvent, { type: T }>
}
