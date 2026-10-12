'use client'

import { useQuery } from '@tanstack/react-query'

import {
  agentServiceSchema,
  conversationsSchema,
  directorySchema,
  fileContentSchema,
  machinesSchema,
  pendingListSchema,
  projectDetailSchema,
  projectsSchema,
  sandboxesSchema,
  workspacesSchema,
} from '@/contracts/workbench-v2'
import { getJson, seg } from './http'

// 好几个功能都要的清单：工作区、项目、对话、待办、机器、沙箱。
// 键都以 'workbench' 开头：哪个功能改了东西，按键让别处重取。
export const workbenchKeys = {
  workspaces: ['workbench', 'workspaces'] as const,
  projects: ['workbench', 'projects'] as const,
  conversations: ['workbench', 'conversations'] as const,
  pending: ['workbench', 'pending'] as const,
  machines: ['workbench', 'machines'] as const,
  sandboxes: ['workbench', 'sandboxes'] as const,
  // 代理服务流（0022）：按电脑、按路径
  agentService: (environment: string) => ['workbench', 'agent', environment, 'service'] as const,
  directory: (environment: string, path: string) =>
    ['workbench', 'agent', environment, 'dir', path] as const,
  file: (environment: string, path: string) =>
    ['workbench', 'agent', environment, 'file', path] as const,
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

export function useMachines(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: workbenchKeys.machines,
    refetchInterval,
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

// 一个项目：它的对话、底稿、有没有专家正在做
export function useProjectDetail(project: string) {
  return useQuery({
    queryKey: ['workbench', 'project', project],
    queryFn: () => getJson(projectDetailSchema, `/api/workbench/projects/${seg(project)}`),
  })
}

// 全部项目。归档的默认不取
export function useAllProjects(includeArchived: boolean) {
  return useQuery({
    queryKey: ['workbench', 'projects', 'all', includeArchived],
    queryFn: async () =>
      (
        await getJson(
          projectsSchema,
          `/api/workbench/projects${includeArchived ? '?include_archived=true' : ''}`,
        )
      ).projects,
  })
}

// ---------------- 代理服务流（0022）：那台电脑上的文件 ----------------
// 代理此刻的白名单与知识库目录。代理离线 / 版本旧 / 没配通道时抛 WorkbenchError，页面按 code 说明
export function useAgentService(environment: string | null) {
  return useQuery({
    queryKey: workbenchKeys.agentService(environment ?? ''),
    enabled: environment !== null,
    retry: false,
    staleTime: 30_000,
    queryFn: async () =>
      getJson(agentServiceSchema, `/api/workbench/environments/${seg(environment!)}/service`),
  })
}

export function useDirectory(environment: string | null, path: string | null) {
  return useQuery({
    queryKey: workbenchKeys.directory(environment ?? '', path ?? ''),
    enabled: environment !== null && path !== null,
    retry: false,
    staleTime: 5_000,
    queryFn: async () =>
      getJson(
        directorySchema,
        `/api/workbench/environments/${seg(environment!)}/fs/dir?path=${encodeURIComponent(path!)}`,
      ),
  })
}

export function useFileContent(environment: string | null, path: string | null) {
  return useQuery({
    queryKey: workbenchKeys.file(environment ?? '', path ?? ''),
    enabled: environment !== null && path !== null,
    retry: false,
    staleTime: 5_000,
    queryFn: async () =>
      getJson(
        fileContentSchema,
        `/api/workbench/environments/${seg(environment!)}/fs/file?path=${encodeURIComponent(path!)}`,
      ),
  })
}
