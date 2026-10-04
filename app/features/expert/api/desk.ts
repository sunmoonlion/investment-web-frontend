'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptedSchema,
  delegatedSchema,
  dossierSchema,
  eventsPageSchema,
  overviewSchema,
  packsSchema,
  reviewPlaceSchema,
} from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { getJson, seg, sendJson } from '@/lib/workbench/http'
import { text } from '@/lib/workbench/items'
import { workbenchKeys } from '@/lib/workbench/queries'

// 专家首页：等我决定的、进行中的、最近交回的
export function useOverview() {
  return useQuery({
    queryKey: ['workbench', 'expert', 'overview'],
    queryFn: () => getJson(overviewSchema, '/api/workbench/expert/overview'),
  })
}

// 有哪些专家。给的是名字、白话、每一步的名字与不过时怎么办；没有方法的原文
export function usePacks() {
  return useQuery({
    queryKey: ['workbench', 'expert', 'packs'],
    queryFn: async () => (await getJson(packsSchema, '/api/workbench/packs')).packs,
  })
}

// 从一段对话里请专家：带入那段对话里用户最近说的一句，并数一数说了几轮
export function useSaid(conversation: string | null) {
  return useQuery({
    queryKey: ['workbench', 'said', conversation],
    enabled: conversation !== null,
    queryFn: async () => {
      const page = await getJson(
        eventsPageSchema,
        `/api/workbench/sessions/${seg(conversation!)}/events?limit=1000`,
      )
      const said = page.events.filter((event) => event.type === 'turn/requested')
      return { turns: said.length, last: text(said[said.length - 1]?.payload.text) }
    },
  })
}

// 这件待办在哪：哪个项目、哪段对话（单独的审查面要用）
export function useReviewPlace(pending: string) {
  return useQuery({
    queryKey: ['workbench', 'review-place', pending],
    queryFn: async () =>
      (await getJson(reviewPlaceSchema, `/api/workbench/interactions/${seg(pending)}`)).interaction,
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

// 底稿：问了什么、答了什么、凭什么、哪些没做到、我怎么看
export function useDossier(task: string) {
  return useQuery({
    queryKey: ['workbench', 'dossier', task],
    queryFn: () => getJson(dossierSchema, `/api/workbench/tasks/${seg(task)}/dossier`),
  })
}

// 「我的结论」是用户自己写的草稿。存一次是一个新版本
export function useSaveConclusion(task: string) {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      sendJson(acceptedSchema, `/api/workbench/tasks/${seg(task)}/conclusion`, {
        csrfToken,
        method: 'PUT',
        body: { text },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['workbench', 'dossier', task] }),
  })
}

// 导出是一份 Markdown，由浏览器下载
export function dossierExportHref(task: string) {
  return `/api/workbench/tasks/${seg(task)}/dossier/export`
}
