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

// 这段对话里等着用户答复的事。能选什么、每一项怎么说，由后端给
export const waitingSchema = z
  .object({
    id: uuid,
    kind: z.string(),
    prompt: z
      .object({
        options: z.array(z.object({ id: z.string(), label: z.string() }).loose()).optional(),
      })
      .loose(),
  })
  .loose()
export type Waiting = z.infer<typeof waitingSchema>

export const conversationViewSchema = z
  .object({ session: conversationSchema, pending_interactions: z.array(waitingSchema) })
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

// ---------------- 专家：委托的步骤与进度 ----------------
const checkSchema = z
  .object({
    label: z.string(),
    pass: z.boolean().nullable().optional(),
    message: z.string().optional(),
  })
  .loose()

const afterRejectionSchema = z
  .object({
    reworks: z.number().int(),
    then: z.string(),
    back_to: z.number().int().nullable(),
    text: z.string(),
  })
  .loose()

const attemptSchema = z
  .object({
    attempt_id: z.string(),
    n: z.number().int(),
    outcome: z.string(),
    spent: z.string(),
    checks: z.array(checkSchema),
    tools: z.record(z.string(), z.number()),
    // 只有单取一步的时候才带：交回了什么、过程
    // 一次都还没交回的时候是空的
    returned: z
      .object({
        artifact: z.string().nullable(),
        content: z.unknown(),
        raw: z.string().nullable().optional(),
      })
      .loose()
      .nullable()
      .optional(),
    process: z
      .array(
        z
          .object({
            kind: z.string(),
            name: z.string(),
            dataset: z.string().nullable(),
            brief: z.string(),
            ok: z.boolean(),
          })
          .loose(),
      )
      .optional(),
  })
  .loose()
export type Attempt = z.infer<typeof attemptSchema>

export const stepStatusSchema = z.enum([
  'pending',
  'running',
  'accepted',
  'reworking',
  'went_back',
  'redo',
  'waiting',
  'failed',
  'cancelled',
  'not_reached',
])
export type StepStatus = z.infer<typeof stepStatusSchema>

export const runStepSchema = z
  .object({
    index: z.number().int(),
    title: z.string(),
    summary: z.string(),
    why: z.string(),
    uses: z.array(z.object({ step: z.number().int().nullable(), title: z.string() }).loose()),
    tools: z.array(z.string()),
    checks: z.array(checkSchema),
    after_rejection: afterRejectionSchema,
    status: stepStatusSchema,
    attempts: z.array(attemptSchema),
    times: z.number().int(),
    rejected: z.number().int(),
    spent: z.string(),
    data: z
      .object({
        dataset: z.string().nullable().optional(),
        data_version: z.string().nullable().optional(),
        as_of: z.string().nullable().optional(),
      })
      .loose()
      .nullable(),
  })
  .loose()
export type RunStep = z.infer<typeof runStepSchema>

const budgetSchema = z
  .object({
    currency: z.string(),
    used: z.string(),
    running: z.string(),
    spent: z.string(),
    estimated: z.boolean(),
  })
  .loose()

export const runSheetSchema = z
  .object({
    task_id: uuid,
    session_id: uuid,
    project_id: uuid.nullable(),
    expert: z.object({ id: z.string(), name: z.string() }).loose(),
    question: z.string(),
    state: z.string(),
    state_word: z.string().nullable(),
    waiting_reason: z.string().nullable(),
    reason_text: z.string(),
    budget: budgetSchema,
    data: z
      .object({
        dataset: z.string().nullable().optional(),
        data_version: z.string().nullable().optional(),
        as_of: z.string().nullable().optional(),
      })
      .loose()
      .nullable(),
    started_at: z.string().nullable(),
    ended_at: z.string().nullable(),
    active_interaction_id: uuid.nullable(),
  })
  .loose()
export type RunSheet = z.infer<typeof runSheetSchema>

// 现在在干什么、为什么、没有卡住。话是后端写的；页面只按两个时间算「做了多久」「多久没动静」
export const nowSchema = z
  .object({
    step: z
      .object({
        index: z.number().int(),
        of: z.number().int(),
        title: z.string(),
        summary: z.string(),
        why: z.string(),
      })
      .loose(),
    doing: z.object({ code: z.string(), text: z.string() }).loose(),
    redo: z.string().nullable(),
    since: z.string().nullable(),
    last_event_at: z.string().nullable(),
    held: z.boolean(),
  })
  .loose()
export type Now = z.infer<typeof nowSchema>

export const runSchema = z
  .object({
    task: runSheetSchema,
    now: nowSchema.nullable(),
    position: z
      .object({ step: z.number().int(), of: z.number().int(), title: z.string() })
      .loose()
      .nullable(),
    steps: z.array(runStepSchema),
  })
  .loose()
export type Run = z.infer<typeof runSchema>

export const runStepDetailSchema = z.object({ step: runStepSchema }).loose()

// ---------------- 审查面：专家停下来问我 ----------------
export const reviewSchema = z
  .object({
    interaction: z
      .object({
        interaction_id: uuid,
        kind: z.string(),
        status: z.string(),
        where: z
          .object({
            step: z.object({ index: z.number().int(), title: z.string() }).loose().nullable(),
            about: z.string().nullable(),
          })
          .loose(),
        why: z.string().nullable(),
        failed: z.array(z.object({ label: z.string(), message: z.string() }).loose()),
        missing_data: z
          .object({ security_code: z.string(), dataset: z.string().nullable() })
          .loose()
          .nullable(),
        pending: z
          .object({
            title: z.string(),
            question: z.string(),
            options: z.array(
              z.object({ id: z.string(), label: z.string(), consequence: z.string() }).loose(),
            ),
          })
          .loose(),
        validity: z.object({ expires_at: z.string().nullable(), after_expiry: z.string() }).loose(),
        decision: z.object({ decided: z.boolean(), chosen: z.string().nullable() }).loose(),
      })
      .loose(),
  })
  .loose()
export type Review = z.infer<typeof reviewSchema>['interaction']

export const tasksSchema = z
  .object({ tasks: z.array(z.object({ id: uuid, state: z.string() }).loose()) })
  .loose()
