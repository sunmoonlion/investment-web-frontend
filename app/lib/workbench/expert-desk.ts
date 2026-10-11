'use client'

// 请专家：专家清单与交给专家。放在 lib 里，首页的对话框和专家页都用它（功能之间不互相引用）。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { delegatedSchema, packsSchema } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { getJson, seg, sendJson } from '@/lib/workbench/http'
import { workbenchKeys } from '@/lib/workbench/queries'

export function usePacks() {
  return useQuery({
    queryKey: ['workbench', 'expert', 'packs'],
    queryFn: async () => (await getJson(packsSchema, '/api/workbench/packs')).packs,
  })
}

// 交给专家。从专家入口来：新建一段工作对话并立刻交出，一次提交；从对话里来：交出那段对话。
export function useAsk() {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      project: string
      from: string | null
      expert: string
      question: string
      // 同一次请求重发不会交出两次
      key: string
    }) => {
      if (input.from) {
        await sendJson(delegatedSchema, `/api/workbench/sessions/${seg(input.from)}/handover`, {
          csrfToken,
          body: {
            idempotency_key: input.key,
            profile_id: input.expert,
            original_input: { text: input.question },
          },
        })
        return { conversation: input.from }
      }
      const made = await sendJson(
        delegatedSchema,
        `/api/workbench/projects/${seg(input.project)}/delegations`,
        {
          csrfToken,
          body: { idempotency_key: input.key, expert: input.expert, question: input.question },
        },
      )
      return { conversation: made.session_id ?? null }
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: workbenchKeys.conversations }),
        client.invalidateQueries({ queryKey: ['workbench', 'expert'] }),
        client.invalidateQueries({ queryKey: ['workbench', 'conversation'] }),
      ]),
  })
}
