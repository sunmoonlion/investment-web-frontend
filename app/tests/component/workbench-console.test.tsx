import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import messages from '@/messages/zh-CN.json'
import type { Interaction, SessionEvent } from '@/contracts/workbench'
import { interactionTokens, Pending, Timeline } from '@/components/workbench/session-console'

const sid = '00000000-0000-5000-8000-000000000001'
const iid = '00000000-0000-5000-8000-000000000003'
const csrf = 'csrf-token-value-that-is-long-enough-1234'

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <NextIntlClientProvider locale="zh-CN" messages={messages}>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </NextIntlClientProvider>
  )
}

function ev(cursor: number, type: string, payload: Record<string, unknown>): SessionEvent {
  return { id: `00000000-0000-5000-8000-0000000000${String(cursor).padStart(2, '0')}`, session_id: sid, cursor, kind: 'x', type, payload }
}

describe('workbench console', () => {
  it('projects the timeline from the event log and hides deltas', () => {
    const events = [
      ev(1, 'turn/requested', { text: '查一下今天的成交量' }),
      ev(2, 'item/agentMessage/delta', { delta: 'partial' }),
      ev(3, 'item/completed', { item: { type: 'agentMessage', text: '成交量是 1.2 万亿' } }),
      ev(4, 'wheel/handover', {}),
      ev(5, 'step/rejected', { step_id: 'plan', failures: ['json_object'] }),
    ]
    render(wrap(<Timeline events={events} streamState="open" />))
    expect(screen.getByText('查一下今天的成交量')).toBeInTheDocument()
    expect(screen.getByText('成交量是 1.2 万亿')).toBeInTheDocument()
    expect(screen.queryByText('partial')).toBeNull()
    expect(screen.getByText(/交给专家/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('方向盘')
    expect(screen.getByText('json_object')).toBeInTheDocument()
    expect(screen.getByText('实时')).toBeInTheDocument()
  })

  it('collects one-time tokens from interaction/opened events', () => {
    const tokens = interactionTokens([ev(1, 'interaction/opened', { interaction_id: iid, token: 'tok-1' }), ev(2, 'interaction/consumed', {})])
    expect(tokens).toEqual({ [iid]: 'tok-1' })
  })

  it('answers a pending approval with the token and chosen option', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ interaction_id: iid }), { status: 200 }))
    const onDone = vi.fn()
    const it1: Interaction = {
      id: iid,
      session_id: sid,
      task_id: null,
      kind: 'tool_approval',
      prompt: { title: '执行命令', question: 'Codex 想运行命令', options: [{ id: 'allow', label: '允许' }, { id: 'decline', label: '拒绝' }], subject: { command: 'ls -la' }, unknowns: [] },
      status: 'pending',
    }
    render(wrap(<Pending interactions={[it1]} tokens={{ [iid]: 'tok-1234567890123456' }} csrfToken={csrf} onDone={onDone} />))
    expect(screen.getByText('ls -la')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '允许' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`/api/workbench/interactions/${iid}/respond`)
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'tok-1234567890123456', decision: 'allow' })
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf)
    fetchMock.mockRestore()
  })

  it('disables answering when the token was not seen in the stream', () => {
    const it1: Interaction = { id: iid, session_id: sid, task_id: null, kind: 'approval', prompt: { title: 't', question: 'q', options: [{ id: 'ok', label: '好' }], subject: {}, unknowns: [] }, status: 'pending' }
    render(wrap(<Pending interactions={[it1]} tokens={{}} csrfToken={csrf} onDone={vi.fn()} />))
    expect(screen.getByRole('button', { name: '好' })).toBeDisabled()
    expect(screen.getByText(/缺少令牌/)).toBeInTheDocument()
  })
})
