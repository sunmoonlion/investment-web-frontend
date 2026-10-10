import { describe, expect, it, vi } from 'vitest'
import { rotateRelayIdentity } from '@/features/settings/api/computer'
const csrf = 'csrf-fixture-value'
function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
}
describe('机器接口', () => {
  it('换代理令牌：带 CSRF 的 POST；新令牌只在这一次答复里', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json({
        relay: { url: 'wss://edge.test/relay', user: 'u-1', agent_token: 'eyJ.new.token' },
        revoked: 2,
        sandbox_rolled: true,
      }),
    )
    const result = await rotateRelayIdentity(csrf, 'a'.repeat(64), fetchImpl)
    expect(result.relay?.agent_token).toBe('eyJ.new.token')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/workbench/sandboxes/relay-identity/rotate')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ expected_revision: 'a'.repeat(64) })
    expect(init).toMatchObject({
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
    })
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(csrf)
  })
})
