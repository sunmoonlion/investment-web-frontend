import { describe, expect, it, vi } from 'vitest'
import {
  createSession,
  fetchEvents,
  fetchTask,
  handover,
  parseStreamEvent,
  respondInteraction,
  rotateRelayIdentity,
  startTurn,
  WorkbenchClientError,
} from '@/lib/workbench/client'

const sid = '00000000-0000-5000-8000-000000000001'
const tid = '00000000-0000-5000-8000-000000000002'
const csrf = 'csrf-token-value-that-is-long-enough-1234'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function event(cursor: number, type = 'turn/requested') {
  return {
    id: `00000000-0000-5000-8000-0000000000${String(cursor).padStart(2, '0')}`,
    session_id: sid,
    cursor,
    kind: 'session',
    type,
    payload: { text: 'hi' },
  }
}

describe('workbench client', () => {
  it('sends mutations as same-origin POST with CSRF and correlation headers', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({ session_id: sid }))
    await expect(
      createSession({ environment_id: sid, sandbox_id: sid, project_root: '/r' }, csrf, fetchImpl),
    ).resolves.toBe(sid)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/workbench/sessions')
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    const headers = init?.headers as Record<string, string>
    expect(headers['X-CSRF-Token']).toBe(csrf)
    expect(headers['X-Correlation-Id']).toMatch(/[0-9a-f-]{36}/)
  })

  it('generates a request id per turn so retries are idempotent', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ request_id: 'x', command_id: sid, cursor: 3 }))
    await expect(startTurn(sid, 'do it', csrf, fetchImpl)).resolves.toMatchObject({ cursor: 3 })
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))
    expect(body.text).toBe('do it')
    expect(body.request_id).toMatch(/[0-9a-f-]{36}/)
  })

  it('surfaces the problem+json top-level code', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ code: 'wheel_not_held', status: 409, detail: 'advisor drives' }, 409),
      )
    await expect(startTurn(sid, 'x', csrf, fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<WorkbenchClientError>>({
        code: 'wheel_not_held',
        status: 409,
      }),
    )
  })

  it('fails closed on a page that breaks the contract', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ contract_version: 2, events: [], next_cursor: 0 }))
    await expect(fetchEvents(sid, 0, fetchImpl)).rejects.toMatchObject({ code: 'contract_invalid' })
  })

  it('reads an events page and forwards the cursor', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ contract_version: 1, events: [event(5), event(6)], next_cursor: 6 }),
      )
    const page = await fetchEvents(sid, 4, fetchImpl)
    expect(page.next_cursor).toBe(6)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('after=4')
  })

  it('normalises budget amounts to strings in a task view', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json({
        task: {
          id: tid,
          session_id: sid,
          profile_id: 'SMOKE',
          state: 'RUNNING',
          waiting_reason: null,
          current_step: 1,
          budget: { currency: 'CNY', limit: 5, reserved: '0', used: 1.32 },
        },
        attempts: [],
        artifacts: [],
      }),
    )
    const view = await fetchTask(tid, fetchImpl)
    expect(view.task.budget).toEqual({ currency: 'CNY', limit: '5', reserved: '0', used: '1.32' })
  })

  it('posts handover and interaction responses verbatim', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ task_id: tid, state: 'RECEIVED', created: true }))
      .mockResolvedValueOnce(json({ interaction_id: sid }))
    await handover(
      sid,
      {
        idempotency_key: 'k',
        profile_id: 'SMOKE',
        original_input: { text: 'q' },
        budget_limit: '5',
      },
      csrf,
      fetchImpl,
    )
    await respondInteraction(
      sid,
      { token: 'tok-1234567890123456', decision: 'allow' },
      csrf,
      fetchImpl,
    )
    expect(String(fetchImpl.mock.calls[0][0])).toBe(`/api/workbench/sessions/${sid}/handover`)
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({
      token: 'tok-1234567890123456',
      decision: 'allow',
    })
  })

  it('parses stream frames and rejects malformed ones', () => {
    expect(parseStreamEvent(JSON.stringify(event(9))).cursor).toBe(9)
    expect(() => parseStreamEvent('{')).toThrow(WorkbenchClientError)
    expect(() => parseStreamEvent(JSON.stringify({ cursor: 0 }))).toThrow(WorkbenchClientError)
  })

  it('rotates the relay identity with a CSRF POST and surfaces the one-time token', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({
          relay: { url: 'wss://edge.test/relay', user: 'u-1', agent_token: 'eyJ.new.token' },
          revoked: 2,
          sandbox_rolled: true,
        }),
      )
    const result = await rotateRelayIdentity(csrf, fetchImpl)
    expect(result.relay?.agent_token).toBe('eyJ.new.token')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/workbench/sandboxes/relay-identity/rotate')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf)
  })
})
