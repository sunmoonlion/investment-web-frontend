import { z } from 'zod'

// 跨应用跳转的约定（后端 app/domain/cross_app.py）。两边的规则逐字相同。
export const crossAppNamePattern = /^[a-z][a-z0-9-]{0,31}$/
export const crossAppRefPattern = /^[A-Za-z0-9._:-]{1,128}$/

const appName = z.string().regex(crossAppNamePattern)

const webAddress = z
  .string()
  .max(1024)
  .refine((value) => isPlainWebAddress(value), 'must be an absolute http(s) URL')

export const crossAppLinksSchema = z
  .object({
    // 这个应用自己的名字：带人去别的应用时，链接里的 from 写它
    app: appName,
    targets: z.record(appName, z.object({ web_base_url: webAddress }).strict()),
  })
  .strict()

export const crossAppOriginSchema = z
  .object({
    app: appName,
    ref: z.string().regex(crossAppRefPattern).nullable(),
    // 回到原处的地址。只从目标应用自己的配置里来，从不从链接里来
    return_url: webAddress.nullable(),
  })
  .strict()
  .nullable()

export type CrossAppLinks = z.infer<typeof crossAppLinksSchema>
export type CrossAppOrigin = z.infer<typeof crossAppOriginSchema>

export function isPlainWebAddress(value: string): boolean {
  if (/[\s\\]/.test(value)) return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  return (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.hostname !== '' &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.hash === ''
  )
}
