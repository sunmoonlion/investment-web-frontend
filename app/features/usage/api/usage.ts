'use client'

import { useQuery } from '@tanstack/react-query'

import { usageSchema } from '@/contracts/workbench-v2'
import { getJson, seg } from '@/lib/workbench/http'

// 一段对话花费的明细：按轮次、用的单价。点开花费钮才取；调用次数变了就重取。
export function useUsage(conversation: string, calls: number, enabled: boolean) {
  return useQuery({
    queryKey: ['workbench', 'usage', conversation, calls],
    queryFn: () => getJson(usageSchema, `/api/workbench/sessions/${seg(conversation)}/usage`),
    enabled,
  })
}
