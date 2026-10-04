// 工作台契约 v2：聊天、工作、专家三个功能的页面用的。字段以 investment-backend 的接口为真源。
// 这些写法由 `tests/unit/workbench-contract-samples.test.ts` 对着预览样例（真后端录下来的返回）逐份检查。
import { z } from 'zod'

export const WORKBENCH_CONTRACT_VERSION = 2 as const

const uuid = z.uuid()
const record = z.record(z.string(), z.unknown())

export const conversationKindSchema = z.enum(['chat', 'work'])
export type ConversationKind = z.infer<typeof conversationKindSchema>

export const conversationSchema = z
  .object({
    id: uuid,
    kind: conversationKindSchema,
    project_id: uuid.nullable(),
    title: z.string().nullable(),
    environment_id: uuid.nullable(),
    project_root: z.string().nullable(),
    thread_id: z.string().nullable(),
    wheel: z.enum(['user', 'advisor']),
    active_task_id: uuid.nullable(),
    created_at: z.string(),
    last_active_at: z.string().nullable(),
  })
  .loose()
export type Conversation = z.infer<typeof conversationSchema>

export const conversationsSchema = z.object({ sessions: z.array(conversationSchema) }).loose()

export const conversationViewSchema = z
  .object({ session: conversationSchema, pending_interactions: z.array(record) })
  .loose()

export const workspaceSchema = z
  .object({
    environment_id: uuid,
    environment_name: z.string(),
    online: z.boolean(),
    root: z.string(),
  })
  .loose()
export type Workspace = z.infer<typeof workspaceSchema>
export const workspacesSchema = z.object({ workspaces: z.array(workspaceSchema) }).loose()

export const projectSchema = z
  .object({
    id: uuid,
    environment_id: uuid,
    workspace_root: z.string(),
    path: z.string(),
    title: z.string(),
    directory: z.string(),
    archived: z.boolean(),
    conversations: z.number().int(),
    last_active_at: z.string().nullable(),
    environment_name: z.string(),
    online: z.boolean(),
  })
  .loose()
export type Project = z.infer<typeof projectSchema>
export const projectsSchema = z.object({ projects: z.array(projectSchema) }).loose()

const namedSchema = z.object({ id: uuid, title: z.string().nullable() }).loose()

export const pendingSchema = z
  .object({
    interaction_id: uuid,
    kind: z.string(),
    status: z.string(),
    where: z
      .object({
        project: namedSchema.nullable(),
        conversation: namedSchema.extend({ kind: conversationKindSchema }).loose().nullable(),
        about: z.string().nullable(),
      })
      .loose(),
    why: z.string().nullable(),
    created_at: z.string(),
  })
  .loose()
export type Pending = z.infer<typeof pendingSchema>
export const pendingListSchema = z.object({ interactions: z.array(pendingSchema) }).loose()

export const machineSchema = z
  .object({ id: uuid, name: z.string(), status: z.string(), roots: z.array(z.string()) })
  .loose()
export type Machine = z.infer<typeof machineSchema>
export const machinesSchema = z.object({ environments: z.array(machineSchema) }).loose()

export const sandboxesSchema = z
  .object({ sandboxes: z.array(z.object({ id: uuid, status: z.string() }).loose()) })
  .loose()

// ---------------- 事件 ----------------
export const conversationEventSchema = z
  .object({
    id: uuid,
    session_id: uuid,
    cursor: z.number().int(),
    kind: z.string(),
    type: z.string(),
    payload: record,
    task_id: uuid.nullable(),
    attempt_id: uuid.nullable(),
    created_at: z.string(),
  })
  .loose()
export type ConversationEvent = z.infer<typeof conversationEventSchema>

export const eventsPageSchema = z
  .object({ events: z.array(conversationEventSchema), next_cursor: z.number().int().nullable() })
  .loose()

// ---------------- 花费 ----------------
const tokensSchema = z.object({
  input: z.number().int(),
  cached_input: z.number().int(),
  cache_write: z.number().int(),
  output: z.number().int(),
  total: z.number().int(),
})
export type Tokens = z.infer<typeof tokensSchema>

// 每一条用量事件里带的金额。没有单价的模型：priced 为 false，金额是空的
export const callCostSchema = z
  .object({
    currency: z.string(),
    model: z.string().nullable(),
    priced: z.boolean(),
    call: z.string().nullable(),
    turn: z.string().nullable(),
    call_tokens: tokensSchema,
    turn_tokens: tokensSchema,
    estimated: z.boolean(),
  })
  .loose()
export type CallCost = z.infer<typeof callCostSchema>

export const usageSchema = z
  .object({
    price: z
      .object({
        model: z.string().nullable(),
        priced: z.boolean(),
        currency: z.string(),
        as_of: z.string(),
        per_million: z
          .object({
            input: z.string(),
            cached_input: z.string(),
            cache_write: z.string(),
            output: z.string(),
          })
          .nullable(),
        source: z.string(),
        estimated: z.boolean(),
      })
      .loose(),
    cost: z.string().nullable(),
    tokens: tokensSchema,
    calls: z.number().int(),
    turns: z.array(
      z
        .object({
          turn_id: z.string().nullable(),
          calls: z.number().int(),
          cost: z.string().nullable(),
          tokens: tokensSchema,
          at: z.string().nullable().optional(),
        })
        .loose(),
    ),
  })
  .loose()
export type Usage = z.infer<typeof usageSchema>

// ---------------- 改动类请求的答复 ----------------
export const createdConversationSchema = z.object({ session_id: uuid }).loose()
export const turnAcceptedSchema = z.object({ request_id: z.string() }).loose()
export const acceptedSchema = z.object({}).loose()

export const problemSchema = z.object({ code: z.string() }).loose()
