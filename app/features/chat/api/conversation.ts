'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptedSchema,
  conversationViewSchema,
  turnAcceptedSchema,
} from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { getJson, seg, sendJson } from '@/lib/workbench/http'
import { workbenchKeys } from '@/lib/workbench/queries'

const base = (conversation: string) => `/api/workbench/sessions/${seg(conversation)}`
const key = (conversation: string) => ['workbench', 'conversation', conversation] as const

export function useConversation(conversation: string) {
  return useQuery({
    queryKey: key(conversation),
    queryFn: async () => (await getJson(conversationViewSchema, base(conversation))).session,
  })
}

// 这段对话上能做的动作。做完让受影响的清单重取。
export function useConversationActions(conversation: string) {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  const changed = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: key(conversation) }),
      client.invalidateQueries({ queryKey: workbenchKeys.conversations }),
    ])
  }
  return {
    say: useMutation({
      mutationFn: (text: string) =>
        sendJson(turnAcceptedSchema, `${base(conversation)}/turns`, { csrfToken, body: { text } }),
      onSuccess: changed,
    }),
    // 不用说停哪一轮：停的是这段对话正在跑的那一轮
    stop: useMutation({
      mutationFn: () => sendJson(acceptedSchema, `${base(conversation)}/interrupt`, { csrfToken }),
    }),
    rename: useMutation({
      mutationFn: (title: string) =>
        sendJson(acceptedSchema, base(conversation), {
          csrfToken,
          method: 'PATCH',
          body: { title },
        }),
      onSuccess: changed,
    }),
    putInProject: useMutation({
      mutationFn: (project: string) =>
        sendJson(acceptedSchema, `${base(conversation)}/project`, {
          csrfToken,
          body: { project_id: project },
        }),
      onSuccess: changed,
    }),
    turnIntoWork: useMutation({
      mutationFn: () =>
        sendJson(acceptedSchema, `${base(conversation)}/kind`, {
          csrfToken,
          body: { kind: 'work' },
        }),
      onSuccess: changed,
    }),
  }
}
