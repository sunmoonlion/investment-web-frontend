'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createdConversationSchema,
  turnAcceptedSchema,
  type ConversationKind,
} from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { seg, sendJson } from '@/lib/workbench/http'
import { workbenchKeys } from '@/lib/workbench/queries'

// 开始一段对话：建对话，再把第一句话发出去。
export function useStart() {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: { kind: ConversationKind; project: string | null; text: string }) => {
      const made = await sendJson(createdConversationSchema, '/api/workbench/sessions', {
        csrfToken,
        body: { kind: input.kind, ...(input.project ? { project_id: input.project } : {}) },
      })
      await sendJson(turnAcceptedSchema, `/api/workbench/sessions/${seg(made.session_id)}/turns`, {
        csrfToken,
        body: { text: input.text },
      })
      return { id: made.session_id, project_id: input.project, kind: input.kind }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: workbenchKeys.conversations }),
  })
}
