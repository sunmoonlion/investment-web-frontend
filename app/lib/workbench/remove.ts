'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { useWorkbench } from './context'
import { seg, sendJson } from './http'
import { workbenchKeys } from './queries'

const nothing = z.object({}).loose()

// 侧边栏的「删除」= 从工作台移除：项目归档、对话归档，清单里不再出现。
// 用户电脑上的文件夹不动（所有者 2026-10-12 定）；要动文件要等代理的文件通道（账 87）。
export function useRemove() {
  const { csrfToken } = useWorkbench()
  const client = useQueryClient()
  const changed = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: workbenchKeys.projects }),
      client.invalidateQueries({ queryKey: ['workbench', 'project'] }),
      client.invalidateQueries({ queryKey: workbenchKeys.conversations }),
      client.invalidateQueries({ queryKey: workbenchKeys.pending }),
    ])
  return {
    project: useMutation({
      mutationFn: (id: string) =>
        sendJson(nothing, `/api/workbench/projects/${seg(id)}`, { csrfToken, method: 'DELETE' }),
      onSuccess: changed,
    }),
    conversation: useMutation({
      mutationFn: (id: string) =>
        sendJson(nothing, `/api/workbench/sessions/${seg(id)}`, { csrfToken, method: 'DELETE' }),
      onSuccess: changed,
    }),
  }
}
