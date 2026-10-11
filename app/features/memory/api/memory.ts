'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { z } from 'zod'

import { memoriesSchema, memoryMadeSchema } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { getJson, seg, sendJson } from '@/lib/workbench/http'

const key = ['workbench', 'memories'] as const
const anything = z.object({}).loose()

// 长期记忆：关于这位用户的几条事实。每段对话开头带上；只有用户自己能看、能改、能删
export function useMemories() {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await getJson(memoriesSchema, '/api/workbench/memories')).memories,
  })
}

export function useMemoryActions() {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  const changed = () => client.invalidateQueries({ queryKey: key })
  return {
    add: useMutation({
      mutationFn: (text: string) =>
        sendJson(memoryMadeSchema, '/api/workbench/memories', { csrfToken, body: { text } }),
      onSuccess: changed,
    }),
    change: useMutation({
      mutationFn: (input: { id: string; text?: string; enabled?: boolean }) =>
        sendJson(memoryMadeSchema, `/api/workbench/memories/${seg(input.id)}`, {
          csrfToken,
          method: 'PATCH',
          body: {
            ...(input.text !== undefined ? { text: input.text } : {}),
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          },
        }),
      onSuccess: changed,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        sendJson(anything, `/api/workbench/memories/${seg(id)}`, { csrfToken, method: 'DELETE' }),
      onSuccess: changed,
    }),
    clear: useMutation({
      mutationFn: () =>
        sendJson(anything, '/api/workbench/memories', { csrfToken, method: 'DELETE' }),
      onSuccess: changed,
    }),
  }
}
