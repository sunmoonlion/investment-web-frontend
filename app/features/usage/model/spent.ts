// 一段对话到现在花了多少：把每一条用量事件里记的那一次相加。纯函数。
// 金额用整数（百万分之一元）加，不用小数加：加出来的数才和后端的合计一分不差。
import { callCostSchema, type ConversationEvent } from '@/contracts/workbench-v2'
import { toMicros } from '@/lib/workbench/money'

export const USAGE_EVENT = 'thread/tokenUsage/updated'

export type Spent = {
  // 百万分之一元。null：有哪一次调用用的模型没有单价，给不出金额
  micros: number | null
  currency: string
  calls: number
  tokens: number
}

export function spent(events: readonly ConversationEvent[]): Spent {
  const total: Spent = { micros: 0, currency: 'CNY', calls: 0, tokens: 0 }
  for (const event of events) {
    if (event.type !== USAGE_EVENT) continue
    const cost = callCostSchema.safeParse(event.payload.cost)
    if (!cost.success) continue
    total.calls += 1
    total.tokens += cost.data.call_tokens.total
    total.currency = cost.data.currency
    const call = cost.data.priced && cost.data.call !== null ? toMicros(cost.data.call) : null
    total.micros = total.micros === null || call === null ? null : total.micros + call
  }
  return total
}
