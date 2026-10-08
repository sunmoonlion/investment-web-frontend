import { describe, expect, it, vi } from 'vitest'

import {
  addCredential,
  fetchPrefs,
  listCredentials,
  savePrefs,
} from '@/features/settings/api/client'

import { WorkbenchError } from '@/lib/workbench/http'

const id = '00000000-0000-5000-8000-000000000001'
const csrf = 'csrf-token-value-that-is-long-enough-1234'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('设置页的接口', () => {
  it('改动类的请求：同源、带 CSRF、带一次一个的追踪号', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ model: 'kimi-k3', approval_policy: 'on-request' }))
    await savePrefs({ model: 'kimi-k3', approval_policy: 'on-request' }, csrf, fetchImpl)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/workbench/prefs')
    expect(init).toMatchObject({ credentials: 'same-origin', cache: 'no-store' })
    const headers = init?.headers as Record<string, string>
    expect(headers['X-CSRF-Token']).toBe(csrf)
    expect(headers['X-Correlation-Id']).toMatch(/[0-9a-f-]{36}/)
  })

  it('出错时带出后端给的错误码', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ code: 'credential_store_unavailable', status: 503 }, 503))
    await expect(
      addCredential({ provider: 'kimi', api_key: 'k'.repeat(20) }, csrf, fetchImpl),
    ).rejects.toEqual(
      expect.objectContaining<Partial<WorkbenchError>>({
        code: 'credential_store_unavailable',
        status: 503,
      }),
    )
  })

  it('答复不合契约就当失败，不往下用', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({ approval_policy: 'whatever' }))
    await expect(fetchPrefs(fetchImpl)).rejects.toMatchObject({ code: 'contract_invalid' })
  })

  it('key 的清单里多出密钥字段：当契约不符，密钥不进页面', async () => {
    const leaking = { id, provider: 'kimi', hint: '1234', status: 'active', api_key: 'sk-leak' }
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({ credentials: [leaking] }))
    await expect(listCredentials(fetchImpl)).rejects.toMatchObject({ code: 'contract_invalid' })
  })
})
