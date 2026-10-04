'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { acceptedSchema, createdProjectSchema } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { seg, sendJson } from '@/lib/workbench/http'

// 项目上能做的动作：新建、改名、归档。做完让项目的各份清单重取。
export function useProjectActions() {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  const changed = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['workbench', 'projects'] }),
      client.invalidateQueries({ queryKey: ['workbench', 'project'] }),
    ])
  return {
    create: useMutation({
      mutationFn: (input: {
        environment_id: string
        workspace_root: string
        path: string
        title: string
      }) =>
        sendJson(createdProjectSchema, '/api/workbench/projects', {
          csrfToken,
          body: { ...input, title: input.title.trim() || undefined },
        }),
      onSuccess: changed,
    }),
    rename: useMutation({
      mutationFn: (input: { project: string; title: string }) =>
        sendJson(acceptedSchema, `/api/workbench/projects/${seg(input.project)}`, {
          csrfToken,
          method: 'PATCH',
          body: { title: input.title },
        }),
      onSuccess: changed,
    }),
    archive: useMutation({
      mutationFn: (input: { project: string; archived: boolean }) =>
        sendJson(acceptedSchema, `/api/workbench/projects/${seg(input.project)}`, {
          csrfToken,
          method: 'PATCH',
          body: { archived: input.archived },
        }),
      onSuccess: changed,
    }),
  }
}
