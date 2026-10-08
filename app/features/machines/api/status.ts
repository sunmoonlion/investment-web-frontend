'use client'

import { useQuery } from '@tanstack/react-query'
import { provisionedSandboxStatus } from './client'

// 引导与令牌面板共享只读状态；页面刷新不会签发或轮换身份。
export function useAgentStatus() {
  return useQuery({
    queryKey: ['wb-provisioned'],
    queryFn: () => provisionedSandboxStatus(),
    refetchInterval: 5000,
  })
}
