// 设置页接口：模型 key 与新对话默认值；机器接入由 machines 管理。
import { z } from 'zod'
import {
  credentialSchema,
  prefsSchema,
  type Credential,
  type Prefs,
} from '@/contracts/workbench-settings'
import { getJson, sendJson } from '@/lib/workbench/http'

type Fetch = typeof fetch

export function fetchPrefs(fetchImpl: Fetch = fetch): Promise<Prefs> {
  return getJson(prefsSchema, '/api/workbench/prefs', fetchImpl)
}
export function savePrefs(
  prefs: Prefs,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<Prefs> {
  return sendJson(
    prefsSchema,
    '/api/workbench/prefs',
    { csrfToken, method: 'PUT', body: prefs },
    fetchImpl,
  )
}
export async function listCredentials(fetchImpl: Fetch = fetch): Promise<Credential[]> {
  return (
    await getJson(
      z.object({ credentials: z.array(credentialSchema) }),
      '/api/workbench/credentials',
      fetchImpl,
    )
  ).credentials
}
export function addCredential(
  input: { provider: string; api_key: string; sandbox_id?: string },
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<Credential> {
  return sendJson(
    credentialSchema,
    '/api/workbench/credentials',
    { csrfToken, body: input },
    fetchImpl,
  )
}
export async function revokeCredential(
  credentialId: string,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  await sendJson(
    z.object({ status: z.literal('revoked') }).loose(),
    `/api/workbench/credentials/${encodeURIComponent(credentialId)}/revoke`,
    { csrfToken },
    fetchImpl,
  )
}
