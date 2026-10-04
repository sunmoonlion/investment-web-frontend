// 设置页用的契约：模型 key、新对话的默认、我的沙箱。字段以 investment-backend 的接口为真源。
// 带密钥的字段一律不认：多出来就当契约不符（宁可页面报错，也不让密钥进页面）。
import { z } from 'zod'

const uuid = z.uuid()

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
    // 列表接口还带这两个时间（后端 list_credentials 的 select）；strict 仍然挡住任何多出来的字段，尤其是密钥
    created_at: z.string().nullable().optional(),
    revoked_at: z.string().nullable().optional(),
  })
  .strict()
  .refine((c) => !('api_key' in c) && !('ciphertext' in c), {
    message: 'credential must not carry secrets',
  })

export const provisionedSandboxSchema = z
  .object({
    sandbox_id: uuid.nullable().optional(),
    app_server_url: z.string().optional(),
    status: z.string().nullable().optional(),
    ready: z.boolean().optional(),
    relay: z
      .object({ url: z.string(), user: z.string(), agent_token: z.string().nullable() })
      .optional(),
    relay_user: z.string().optional(),
    credential_hint: z.string().optional(),
  })
  .loose()
  .refine((s) => !('app_server_token' in s) && !('model_key' in s), {
    message: 'sandbox must not carry secrets',
  })

export const problemSchema = z
  .object({
    code: z.string(),
    status: z.number().int().optional(),
    detail: z.string().optional(),
  })
  .loose()

export type Prefs = z.infer<typeof prefsSchema>
export type Credential = z.infer<typeof credentialSchema>
export type ProvisionedSandbox = z.infer<typeof provisionedSandboxSchema>
