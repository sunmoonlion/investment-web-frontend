import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import messages from '@/messages/zh-CN.json'
import { stripForbidden, TaskDossier } from '@/components/workbench/task-dossier'
import { SettingsPanel } from '@/components/workbench/settings-panel'

const sid = '00000000-0000-5000-8000-000000000001'
const tid = '00000000-0000-5000-8000-000000000002'
const csrf = 'csrf-token-value-that-is-long-enough-1234'

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <NextIntlClientProvider locale="zh-CN" messages={messages}>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </NextIntlClientProvider>
  )
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const taskView = {
  task: {
    id: tid,
    session_id: sid,
    profile_id: 'DATA_QUERY',
    state: 'SUCCEEDED',
    waiting_reason: null,
    current_step: 5,
    budget: { currency: 'CNY', limit: '5', reserved: '0', used: '1.2' },
  },
  attempts: [],
  artifacts: [],
}
const artifacts = {
  contract_version: 1,
  artifacts: [
    {
      id: '00000000-0000-5000-8000-000000000010',
      name: 'note',
      version: 2,
      kind: 'note',
      digest: 'abcdef0123456789',
      content: {
        answer: '2025 年净营收高于 2024 年。',
        table: [{ order_year: 2024, net_revenue_cents: 100 }],
        citations: ['lesson23-analysis-b7ad59fddab30331'],
        rating: 'BUY',
        target_price: 99,
        conclusion: '',
      },
    },
    {
      id: '00000000-0000-5000-8000-000000000011',
      name: 'handback',
      version: 1,
      kind: 'handback',
      digest: '0123456789abcdef',
      content: { did: ['rewrite: COMPLETED'], workspace_restore: '没有改动' },
    },
  ],
}

describe('dossier', () => {
  it('strips rating and target price fields wherever they appear', () => {
    expect(
      stripForbidden({ a: 1, rating: 'BUY', nested: [{ target_price: 3, keep: true }] }),
    ).toEqual({ a: 1, nested: [{ keep: true }] })
  })

  it('renders result, evidence and a user-draft conclusion; never a rating', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/artifacts')) return json(artifacts)
      if (url.endsWith(`/tasks/${tid}`)) return json(taskView)
      if (url.endsWith('/conclusion'))
        return json({
          id: '00000000-0000-5000-8000-000000000012',
          name: 'conclusion',
          version: 1,
          kind: 'user_draft',
          digest: 'x',
        })
      throw new Error(`unexpected ${url}`)
    })
    render(wrap(<TaskDossier taskId={tid} csrfToken={csrf} />))
    await screen.findByText('2025 年净营收高于 2024 年。')
    expect(screen.getByText('lesson23-analysis-b7ad59fddab30331')).toBeInTheDocument()
    expect(screen.queryByText(/BUY/)).toBeNull()
    expect(screen.queryByText(/99/)).toBeNull()
    expect(screen.getByRole('heading', { name: '结论（用户草稿）' })).toBeInTheDocument()
    expect(screen.getByText('尚未保存')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: '结论（用户草稿）' }), {
      target: { value: '我的结论' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }))
    await waitFor(() => {
      const call = (
        globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }
      ).mock.calls.find(([u]) => String(u).endsWith('/conclusion'))
      expect(call).toBeDefined()
      expect(call?.[1].method).toBe('PUT')
      expect(JSON.parse(String(call?.[1].body))).toEqual({ text: '我的结论' })
    })
    vi.restoreAllMocks()
  })
})

describe('settings', () => {
  it('submits a key once and never shows it again', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/prefs')) return json({ model: null, approval_policy: 'on-request' })
      if (url.endsWith('/credentials') && init?.method === 'POST')
        return json(
          {
            id: '00000000-0000-5000-8000-000000000020',
            provider: 'kimi',
            hint: 'wxyz',
            status: 'active',
          },
          201,
        )
      if (url.endsWith('/credentials'))
        return json({
          credentials: [
            {
              id: '00000000-0000-5000-8000-000000000020',
              provider: 'kimi',
              hint: 'wxyz',
              status: 'active',
            },
          ],
        })
      throw new Error(`unexpected ${url}`)
    })
    render(wrap(<SettingsPanel csrfToken={csrf} />))
    const input = (await screen.findByLabelText('API key')) as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.change(input, { target: { value: 'sk-secret-key-wxyz' } })
    fireEvent.click(screen.getByRole('button', { name: '提交 key' }))
    await waitFor(() => expect(input.value).toBe(''))
    await screen.findByText(/\*\*\*\*wxyz/)
    expect(document.body.textContent).not.toContain('sk-secret-key')
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')
    expect((post?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf)
    vi.restoreAllMocks()
  })

  it('accepts the credential list exactly as the backend returns it (KIND: strict schema rejected created_at/revoked_at)', async () => {
    const { credentialSchema } = await import('@/contracts/workbench')
    // 字段与 investment-backend 的 list_credentials select 一致：id, sandbox_id, provider, hint, status, created_at, revoked_at
    const row = {
      id: '00000000-0000-5000-8000-000000000020',
      sandbox_id: null,
      provider: 'kimi',
      hint: 'utIN',
      status: 'active',
      created_at: '2026-09-25T14:03:28.123456+00:00',
      revoked_at: null,
    }
    expect(credentialSchema.safeParse(row).success).toBe(true)
    expect(
      credentialSchema.safeParse({
        ...row,
        status: 'revoked',
        revoked_at: '2026-09-25T15:00:00+00:00',
      }).success,
    ).toBe(true)
  })

  it('rejects a credential payload that carries the secret back', async () => {
    const { credentialSchema } = await import('@/contracts/workbench')
    expect(
      credentialSchema.safeParse({
        id: '00000000-0000-5000-8000-000000000020',
        provider: 'kimi',
        hint: 'wxyz',
        status: 'active',
        api_key: 'sk-x',
      }).success,
    ).toBe(false)
  })
})

describe('sandbox provisioning', () => {
  it('starts a sandbox and shows the agent command only when a token was issued', async () => {
    let provisioned = false
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/prefs')) return json({ model: null, approval_policy: 'on-request' })
      if (url.endsWith('/credentials')) return json({ credentials: [] })
      if (url.endsWith('/sandboxes/provisioned'))
        return json({ status: provisioned ? 'starting' : 'absent', ready: false })
      if (url.endsWith('/sandboxes/provision') && init?.method === 'POST') {
        provisioned = true
        return json({
          sandbox_id: '00000000-0000-5000-8000-000000000030',
          app_server_url: 'ws://sandbox-u-1.sandbox-pool.svc:47800',
          status: 'starting',
          ready: false,
          relay: {
            url: 'wss://edge.test/relay',
            user: 'u-1bcbd3538e76',
            agent_token: 'agent-token-once-1234567890',
          },
        })
      }
      throw new Error(`unexpected ${url}`)
    })
    render(wrap(<SettingsPanel csrfToken={csrf} />))
    fireEvent.click(await screen.findByRole('button', { name: '拉起沙箱' }))
    await screen.findByText('本地代理接入命令（只显示一次）')
    expect(document.body.textContent).toContain(
      '--user u-1bcbd3538e76 --token agent-token-once-1234567890',
    )
    const post = fetchMock.mock.calls.find(
      ([u, i]) => String(u).endsWith('/sandboxes/provision') && i?.method === 'POST',
    )
    expect((post?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf)
    vi.restoreAllMocks()
  })

  it('explains a full sandbox pool instead of showing the raw code', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/prefs')) return json({ model: null, approval_policy: 'on-request' })
      if (url.endsWith('/credentials')) return json({ credentials: [] })
      if (url.endsWith('/sandboxes/provisioned')) return json({ status: 'absent', ready: false })
      if (url.endsWith('/sandboxes/provision') && init?.method === 'POST') {
        return json({ code: 'sandbox_capacity_full', status: 503, detail: 'full' }, 503)
      }
      throw new Error(`unexpected ${url}`)
    })
    render(wrap(<SettingsPanel csrfToken={csrf} />))
    fireEvent.click(await screen.findByRole('button', { name: '拉起沙箱' }))
    await screen.findByText('云端沙箱暂时满了，请稍后再试。你已登记的 key 和设置都保留着。')
    expect(document.body.textContent).not.toContain('sandbox_capacity_full')
    vi.restoreAllMocks()
  })

  it('offers token rotation once an identity exists and shows the new command once', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/prefs')) return json({ model: null, approval_policy: 'on-request' })
      if (url.endsWith('/credentials')) return json({ credentials: [] })
      if (url.endsWith('/sandboxes/provisioned'))
        return json({ status: 'ready', ready: true, relay_user: 'u-1bcbd3538e76' })
      if (url.endsWith('/sandboxes/relay-identity/rotate') && init?.method === 'POST') {
        return json({
          relay: {
            url: 'wss://edge.test/relay',
            user: 'u-1bcbd3538e76',
            agent_token: 'rotated-token-0123456789',
          },
          revoked: 2,
          sandbox_rolled: true,
        })
      }
      throw new Error(`unexpected ${url}`)
    })
    render(wrap(<SettingsPanel csrfToken={csrf} />))
    fireEvent.click(await screen.findByRole('button', { name: '换代理令牌' }))
    await screen.findByText('本地代理接入命令（只显示一次）')
    expect(document.body.textContent).toContain('--token rotated-token-0123456789')
    vi.restoreAllMocks()
  })
})
