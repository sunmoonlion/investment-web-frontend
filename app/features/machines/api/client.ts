// 我的机器：安装包、沙箱和代理身份。复用工作台的鉴权、CSRF 与无缓存请求。
import { z } from 'zod'
import {
  agentDownloadSchema,
  provisionedSandboxSchema,
  type ProvisionedSandbox,
} from '@/contracts/workbench-settings'
import { getJson, sendJson } from '@/lib/workbench/http'

type Fetch = typeof fetch

export function provisionSandbox(
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<ProvisionedSandbox> {
  return sendJson(
    provisionedSandboxSchema,
    '/api/workbench/sandboxes/provision',
    { csrfToken },
    fetchImpl,
  )
}
export function provisionedSandboxStatus(fetchImpl: Fetch = fetch): Promise<ProvisionedSandbox> {
  return getJson(provisionedSandboxSchema, '/api/workbench/sandboxes/provisioned', fetchImpl)
}
export async function deprovisionSandbox(
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  await sendJson(
    z.object({ status: z.string() }).loose(),
    '/api/workbench/sandboxes/provisioned',
    { csrfToken, method: 'DELETE' },
    fetchImpl,
  )
}
export function rotateRelayIdentity(
  csrfToken: string,
  expectedRevision: string,
  fetchImpl: Fetch = fetch,
): Promise<ProvisionedSandbox> {
  return sendJson(
    provisionedSandboxSchema,
    '/api/workbench/sandboxes/relay-identity/rotate',
    { csrfToken, body: { expected_revision: expectedRevision } },
    fetchImpl,
  )
}
export function fetchAgentDownload(fetchImpl: Fetch = fetch) {
  return getJson(agentDownloadSchema, '/api/workbench/agent/download', fetchImpl)
}
