'use client'

import { useQuery } from '@tanstack/react-query'

import {
  conversationsSchema,
  machinesSchema,
  pendingListSchema,
  projectsSchema,
  sandboxesSchema,
  workspacesSchema,
} from '@/contracts/workbench-v2'
import { getJson } from './http'

// 好几个功能都要的清单：工作区、项目、对话、待办、机器、沙箱。
// 键都以 'workbench' 开头：哪个功能改了东西，按键让别处重取。
export const workbenchKeys = {
  workspaces: ['workbench', 'workspaces'] as const,
  projects: ['workbench', 'projects'] as const,
  conversations: ['workbench', 'conversations'] as const,
  pending: ['workbench', 'pending'] as const,
  machines: ['workbench', 'machines'] as const,
  sandboxes: ['workbench', 'sandboxes'] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workbenchKeys.workspaces,
    queryFn: async () => (await getJson(workspacesSchema, '/api/workbench/workspaces')).workspaces,
  })
}

export function useProjects() {
  return useQuery({
    queryKey: workbenchKeys.projects,
    queryFn: async () => (await getJson(projectsSchema, '/api/workbench/projects')).projects,
  })
}

export function useConversations() {
  return useQuery({
    queryKey: workbenchKeys.conversations,
    queryFn: async () => (await getJson(conversationsSchema, '/api/workbench/sessions')).sessions,
  })
}

export function usePending() {
  return useQuery({
    queryKey: workbenchKeys.pending,
    queryFn: async () =>
      (await getJson(pendingListSchema, '/api/workbench/interactions')).interactions,
  })
}

export function useMachines() {
  return useQuery({
    queryKey: workbenchKeys.machines,
    queryFn: async () =>
      (await getJson(machinesSchema, '/api/workbench/environments')).environments,
  })
}

export function useSandboxes() {
  return useQuery({
    queryKey: workbenchKeys.sandboxes,
    queryFn: async () => (await getJson(sandboxesSchema, '/api/workbench/sandboxes')).sandboxes,
  })
}
