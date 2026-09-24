// 工作台接口客户端（通道①）。同源 /api/workbench，浏览器会话 cookie，非安全方法带 CSRF；响应一律过 zod。
import {
  artifactsPageSchema,
  credentialSchema,
  environmentSchema,
  eventsPageSchema,
  prefsSchema,
  provisionedSandboxSchema,
  handoverResultSchema,
  problemSchema,
  sandboxSchema,
  sessionEventSchema,
  sessionSchema,
  sessionViewSchema,
  taskViewSchema,
  type ArtifactWithContent,
  type Credential,
  type Environment,
  type HandoverInput,
  type Prefs,
  type ProvisionedSandbox,
  type InteractionResponse,
  type Sandbox,
  type Session,
  type SessionEvent,
  type SessionView,
  type TaskView,
} from '@/contracts/workbench'
import { z } from 'zod'

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

const listEnvsSchema = z.object({ environments: z.array(environmentSchema) })
const listSandboxesSchema = z.object({ sandboxes: z.array(sandboxSchema) })
const listSessionsSchema = z.object({ sessions: z.array(sessionSchema) })
const createdSessionSchema = z.object({ session_id: z.uuid() })
const turnAcceptedSchema = z.object({ request_id: z.string(), command_id: z.uuid(), cursor: z.number().int() })

export async function listEnvironments(fetchImpl: Fetch = fetch): Promise<Environment[]> {
  return (await request(listEnvsSchema, '/api/workbench/environments', { method: 'GET' }, fetchImpl)).environments
}

export async function listSandboxes(fetchImpl: Fetch = fetch): Promise<Sandbox[]> {
  return (await request(listSandboxesSchema, '/api/workbench/sandboxes', { method: 'GET' }, fetchImpl)).sandboxes
}

export async function listSessions(fetchImpl: Fetch = fetch): Promise<Session[]> {
  return (await request(listSessionsSchema, '/api/workbench/sessions', { method: 'GET' }, fetchImpl)).sessions
}

export async function createSession(
  input: { environment_id: string; sandbox_id: string; project_root: string },
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<string> {
  return (await request(createdSessionSchema, '/api/workbench/sessions', mutation(csrfToken, input), fetchImpl)).session_id
}

export async function fetchSessionView(sessionId: string, fetchImpl: Fetch = fetch): Promise<SessionView> {
  return request(sessionViewSchema, `/api/workbench/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET' }, fetchImpl)
}

export async function fetchEvents(
  sessionId: string,
  after = 0,
  fetchImpl: Fetch = fetch,
): Promise<{ events: SessionEvent[]; next_cursor: number }> {
  const page = await request(
    eventsPageSchema,
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/events?after=${after}&limit=1000`,
    { method: 'GET' },
    fetchImpl,
  )
  return { events: page.events, next_cursor: page.next_cursor }
}

export async function startTurn(
  sessionId: string,
  text: string,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<{ request_id: string; cursor: number }> {
  return request(
    turnAcceptedSchema,
    `/api/workbench/sessions/${encodeURIComponent(sessionId)}/turns`,
    mutation(csrfToken, { text, request_id: crypto.randomUUID() }),
    fetchImpl,
  )
}

export async function interruptTurn(sessionId: string, csrfToken: string, fetchImpl: Fetch = fetch): Promise<void> {
  await request(z.object({ command_id: z.uuid() }), `/api/workbench/sessions/${encodeURIComponent(sessionId)}/interrupt`, mutation(csrfToken, {}), fetchImpl)
}

export async function handover(
  sessionId: string,
  input: HandoverInput,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<{ task_id: string; state: string; created: boolean }> {
  return request(handoverResultSchema, `/api/workbench/sessions/${encodeURIComponent(sessionId)}/handover`, mutation(csrfToken, input), fetchImpl)
}

export async function fetchTask(taskId: string, fetchImpl: Fetch = fetch): Promise<TaskView> {
  return request(taskViewSchema, `/api/workbench/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' }, fetchImpl)
}

export async function cancelTask(taskId: string, csrfToken: string, fetchImpl: Fetch = fetch): Promise<void> {
  await request(z.object({ task_id: z.uuid() }).loose(), `/api/workbench/tasks/${encodeURIComponent(taskId)}/cancel`, mutation(csrfToken, {}), fetchImpl)
}

export async function respondInteraction(
  interactionId: string,
  body: InteractionResponse,
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  await request(z.object({ interaction_id: z.uuid() }).loose(), `/api/workbench/interactions/${encodeURIComponent(interactionId)}/respond`, mutation(csrfToken, body), fetchImpl)
}

export async function fetchArtifacts(taskId: string, fetchImpl: Fetch = fetch): Promise<ArtifactWithContent[]> {
  return (await request(artifactsPageSchema, `/api/workbench/tasks/${encodeURIComponent(taskId)}/artifacts`, { method: 'GET' }, fetchImpl)).artifacts
}

export async function saveConclusion(taskId: string, text: string, csrfToken: string, fetchImpl: Fetch = fetch): Promise<{ version: number }> {
  return request(
    z.object({ version: z.number().int() }).loose(),
    `/api/workbench/tasks/${encodeURIComponent(taskId)}/conclusion`,
    { ...mutation(csrfToken, { text }), method: 'PUT' },
    fetchImpl,
  )
}

export async function fetchPrefs(fetchImpl: Fetch = fetch): Promise<Prefs> {
  return request(prefsSchema, '/api/workbench/prefs', { method: 'GET' }, fetchImpl)
}

export async function savePrefs(prefs: Prefs, csrfToken: string, fetchImpl: Fetch = fetch): Promise<Prefs> {
  return request(prefsSchema, '/api/workbench/prefs', { ...mutation(csrfToken, prefs), method: 'PUT' }, fetchImpl)
}

export async function listCredentials(fetchImpl: Fetch = fetch): Promise<Credential[]> {
  return (await request(z.object({ credentials: z.array(credentialSchema) }), '/api/workbench/credentials', { method: 'GET' }, fetchImpl)).credentials
}

export async function addCredential(
  input: { provider: string; api_key: string; sandbox_id?: string },
  csrfToken: string,
  fetchImpl: Fetch = fetch,
): Promise<Credential> {
  return request(credentialSchema, '/api/workbench/credentials', mutation(csrfToken, input), fetchImpl)
}

export async function revokeCredential(credentialId: string, csrfToken: string, fetchImpl: Fetch = fetch): Promise<void> {
  await request(z.object({ status: z.literal('revoked') }).loose(), `/api/workbench/credentials/${encodeURIComponent(credentialId)}/revoke`, mutation(csrfToken, {}), fetchImpl)
}

export async function provisionSandbox(csrfToken: string, fetchImpl: Fetch = fetch): Promise<ProvisionedSandbox> {
  return request(provisionedSandboxSchema, '/api/workbench/sandboxes/provision', mutation(csrfToken, {}), fetchImpl)
}

export async function provisionedSandboxStatus(fetchImpl: Fetch = fetch): Promise<ProvisionedSandbox> {
  return request(provisionedSandboxSchema, '/api/workbench/sandboxes/provisioned', { method: 'GET' }, fetchImpl)
}

export async function deprovisionSandbox(csrfToken: string, fetchImpl: Fetch = fetch): Promise<void> {
  await request(z.object({ status: z.string() }).loose(), '/api/workbench/sandboxes/provisioned', { ...mutation(csrfToken, {}), method: 'DELETE', body: undefined }, fetchImpl)
}

export function parseStreamEvent(data: string): SessionEvent {
  let value: unknown
  try {
    value = JSON.parse(data)
  } catch (error) {
    throw new WorkbenchClientError('contract_invalid', undefined, { cause: error })
  }
  const parsed = sessionEventSchema.safeParse(value)
  if (!parsed.success) throw new WorkbenchClientError('contract_invalid', undefined, { cause: parsed.error })
  return parsed.data
}
