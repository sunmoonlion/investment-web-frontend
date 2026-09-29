'use client'

import {
  crossAppLinksSchema,
  crossAppOriginSchema,
  crossAppNamePattern,
  crossAppRefPattern,
  type CrossAppLinks,
  type CrossAppOrigin,
} from '@/contracts/cross-app'
import { requestJson } from '@/lib/common/api-client'

export class CrossAppContractError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('cross_app_contract_invalid')
    this.name = 'CrossAppContractError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

export async function fetchCrossAppLinks(): Promise<CrossAppLinks> {
  const parsed = crossAppLinksSchema.safeParse(await requestJson('/api/web/v1/cross-app/links'))
  if (!parsed.success) throw new CrossAppContractError({ cause: parsed.error })
  return parsed.data
}

// 链接带来的 from、ref 原样交给后端认：认不认得、回跳地址是什么，都由后端按配置定。
// 样子明显不对的不去问，直接当作没有来处。
export async function fetchCrossAppOrigin(
  from: string | null,
  ref: string | null,
): Promise<CrossAppOrigin> {
  if (from === null || !crossAppNamePattern.test(from)) return null
  const query = new URLSearchParams({ from })
  if (ref !== null && crossAppRefPattern.test(ref)) query.set('ref', ref)
  const parsed = crossAppOriginSchema.safeParse(
    await requestJson(`/api/web/v1/cross-app/origin?${query.toString()}`),
  )
  if (!parsed.success) throw new CrossAppContractError({ cause: parsed.error })
  return parsed.data
}
