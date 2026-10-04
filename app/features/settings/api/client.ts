// 设置页的接口：模型 key、新对话的默认、我的沙箱。同源 /api/workbench；改动类的请求带 CSRF；答复一律过 zod。
import { z } from 'zod'

import {
  credentialSchema,
  prefsSchema,
  problemSchema,
  provisionedSandboxSchema,
  type Credential,
  type Prefs,
  type ProvisionedSandbox,
} from '@/contracts/workbench-settings'

export class WorkbenchClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(code)
    this.name = 'WorkbenchClientError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

type Fetch = typeof fetch

async function request<T>(
  schema: z.ZodType<T>,
  url: string,
  init: RequestInit,
  fetchImpl: Fetch,
): Promise<T> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      headers: {
        Accept: 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
        ...init.headers,
      },
    })
  } catch (error) {
    throw new WorkbenchClientError('backend_unavailable', undefined, { cause: error })
  }
  if (!response.ok || response.type === 'opaqueredirect') {
    const body = await response.json().catch(() => null)
    const problem = problemSchema.safeParse(body)
    throw new WorkbenchClientError(
      problem.success ? problem.data.code : 'backend_unavailable',
      response.status,
    )
  }
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new WorkbenchClientError('contract_invalid', response.status, { cause: parsed.error })
  }
  return parsed.data
}

function mutation(csrfToken: string, body?: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(body ?? {}),
  }
}

export async function fetchPrefs(fetchImpl: Fetch = fetch): Promise<Prefs> {
  return request(prefsSchema, '/api/workbench/prefs', { method: 'GET' }, fetchImpl)
}

export async function savePrefs(
  prefs: Prefs,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<Prefs> {
  return request(
    prefsSchema,
    '/api/workbench/prefs',
    { ...mutation(csrfToken, prefs), method: 'PUT' },
    fetchImpl,
  )
}

export async function listCredentials(fetchImpl: Fetch = fetch): Promise<Credential[]> {
  return (
    await request(
      z.object({ credentials: z.array(credentialSchema) }),
      '/api/workbench/credentials',
      { method: 'GET' },
      fetchImpl,
    )
  ).credentials
}

export async function addCredential(
  input: { provider: string; api_key: string; sandbox_id?: string },
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<Credential> {
  return request(
    credentialSchema,
    '/api/workbench/credentials',
    mutation(csrfToken, input),
    fetchImpl,
  )
}

export async function revokeCredential(
  credentialId: string,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  await request(
    z.object({ status: z.literal('revoked') }).loose(),
    `/api/workbench/credentials/${encodeURIComponent(credentialId)}/revoke`,
    mutation(csrfToken, {}),
    fetchImpl,
  )
}

export async function provisionSandbox(
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<ProvisionedSandbox> {
  return request(
    provisionedSandboxSchema,
    '/api/workbench/sandboxes/provision',
    mutation(csrfToken, {}),
    fetchImpl,
  )
}

export async function provisionedSandboxStatus(
  fetchImpl: Fetch = fetch,
): Promise<ProvisionedSandbox> {
  return request(
    provisionedSandboxSchema,
    '/api/workbench/sandboxes/provisioned',
    { method: 'GET' },
    fetchImpl,
  )
}

export async function deprovisionSandbox(
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  await request(
    z.object({ status: z.string() }).loose(),
    '/api/workbench/sandboxes/provisioned',
    { ...mutation(csrfToken, {}), method: 'DELETE', body: undefined },
    fetchImpl,
  )
}

export async function rotateRelayIdentity(
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<ProvisionedSandbox> {
  // D10：撤换会合点令牌；新代理令牌只在这次响应里
  return request(
    provisionedSandboxSchema,
    '/api/workbench/sandboxes/relay-identity/rotate',
    mutation(csrfToken, {}),
    fetchImpl,
  )
}
