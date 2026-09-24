// 工作台契约 v1（通道①）。字段以 investment-backend `interfaces/endpoints/workbench_routes.py` 为真源；改字段两端一起改（C-C4）。
import { z } from 'zod'

export const WORKBENCH_CONTRACT_VERSION = 1 as const

const uuid = z.uuid()
const jsonRecord = z.record(z.string(), z.unknown())
// 金额：后端以字符串化 Decimal 存 JSON，但容忍数字；前端统一成字符串。
const money = z.union([z.string(), z.number()]).transform((v) => String(v))

export const wheelSchema = z.enum(['user', 'advisor'])
export const taskStateSchema = z.enum([
  'RECEIVED',
  'VALIDATING',
  'QUEUED',
  'RUNNING',
  'WAITING',
  'SUCCEEDED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
])
export const waitingReasonSchema = z.enum(['INPUT', 'APPROVAL', 'RESOURCE', 'ENVIRONMENT'])

export const environmentSchema = z
  .object({
    id: uuid,
    name: z.string(),
    agent_version: z.string().nullable(),
    codex_version: z.string().nullable(),
    roots: z.array(z.string()),
    ceiling: jsonRecord,
    status: z.string(),
  })
  .loose()

export const sandboxSchema = z
  .object({
    id: uuid,
    app_server_url: z.string(),
    codex_version: z.string().nullable(),
    status: z.string(),
  })
  .loose()

export const sessionSchema = z
  .object({
    id: uuid,
    environment_id: uuid,
    sandbox_id: uuid,
    project_root: z.string(),
    thread_id: z.string().nullable(),
    wheel: wheelSchema,
    state_version: z.number().int(),
    active_task_id: uuid.nullable(),
  })
  .loose()

export const sessionEventSchema = z
  .object({
    id: uuid,
    session_id: uuid,
    cursor: z.number().int().positive(),
    kind: z.string(),
    type: z.string(),
    payload: jsonRecord,
    task_id: uuid.nullable().optional(),
    attempt_id: uuid.nullable().optional(),
  })
  .loose()

export const interactionSchema = z
  .object({
    id: uuid,
    session_id: uuid,
    task_id: uuid.nullable(),
    kind: z.enum(['tool_approval', 'input', 'approval', 'resource']),
    prompt: z
      .object({
        title: z.string(),
        question: z.string(),
        options: z.array(z.object({ id: z.string(), label: z.string() }).loose()).default([]),
        subject: jsonRecord.default({}),
        unknowns: z.array(z.string()).default([]),
      })
      .loose(),
    status: z.enum(['pending', 'consumed', 'expired', 'cancelled']),
  })
  .loose()

export const budgetSchema = z
  .object({
    currency: z.string(),
    limit: money,
    reserved: money,
    used: money,
  })
  .loose()

export const taskSchema = z
  .object({
    id: uuid,
    session_id: uuid,
    profile_id: z.string(),
    state: taskStateSchema,
    waiting_reason: waitingReasonSchema.nullable(),
    current_step: z.number().int(),
    budget: budgetSchema,
    rejection: jsonRecord.nullable().optional(),
  })
  .loose()

export const artifactSchema = z
  .object({ id: uuid, name: z.string(), version: z.number().int(), kind: z.string(), digest: z.string() })
  .loose()

export const sessionViewSchema = z.object({
  session: sessionSchema,
  pending_interactions: z.array(interactionSchema),
})

export const eventsPageSchema = z.object({
  contract_version: z.literal(WORKBENCH_CONTRACT_VERSION),
  events: z.array(sessionEventSchema),
  next_cursor: z.number().int().nonnegative(),
})

export const taskViewSchema = z.object({
  task: taskSchema,
  attempts: z.array(jsonRecord),
  artifacts: z.array(artifactSchema),
})

export const handoverResultSchema = z.object({
  task_id: uuid,
  state: taskStateSchema,
  created: z.boolean(),
})

export const artifactWithContentSchema = artifactSchema.extend({ content: z.unknown() })
export const artifactsPageSchema = z.object({
  contract_version: z.literal(WORKBENCH_CONTRACT_VERSION),
  artifacts: z.array(artifactWithContentSchema),
})

export const prefsSchema = z
  .object({
    model: z.string().nullable(),
    approval_policy: z.enum(['untrusted', 'on-request', 'on-failure', 'never']),
  })
  .loose()

export const credentialSchema = z
  .object({
    id: uuid,
    provider: z.string(),
    hint: z.string(),
    status: z.enum(['active', 'revoked']),
    sandbox_id: uuid.nullable().optional(),
  })
  .strict()
  .refine((c) => !('api_key' in c) && !('ciphertext' in c), { message: 'credential must not carry secrets' })

export const problemSchema = z
  .object({
    code: z.string(),
    status: z.number().int().optional(),
    detail: z.string().optional(),
  })
  .loose()

export type Environment = z.infer<typeof environmentSchema>
export type Sandbox = z.infer<typeof sandboxSchema>
export type Session = z.infer<typeof sessionSchema>
export type SessionEvent = z.infer<typeof sessionEventSchema>
export type Interaction = z.infer<typeof interactionSchema>
export type Task = z.infer<typeof taskSchema>
export type Artifact = z.infer<typeof artifactSchema>
export type SessionView = z.infer<typeof sessionViewSchema>
export type TaskView = z.infer<typeof taskViewSchema>

export type ArtifactWithContent = z.infer<typeof artifactWithContentSchema>
export type Prefs = z.infer<typeof prefsSchema>
export type Credential = z.infer<typeof credentialSchema>

export type HandoverInput = {
  idempotency_key: string
  profile_id: string
  original_input: Record<string, unknown>
  budget_limit: string
  budget_currency?: string
}

export type InteractionResponse = {
  token: string
  decision?: string
  answer?: Record<string, unknown>
  amount?: string
}
