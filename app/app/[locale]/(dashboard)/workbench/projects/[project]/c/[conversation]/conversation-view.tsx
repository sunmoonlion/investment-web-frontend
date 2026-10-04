'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { ChatScreen } from '@/features/chat'
import { ExpertRunScreen } from '@/features/expert'
import { CostButton } from '@/features/usage'
import { WorkScreen } from '@/features/work'
import { useConversation } from '@/lib/workbench/conversation'
import { useConversationEvents } from '@/lib/workbench/conversation-events'

const TURNING = new Set(['wheel/handover', 'wheel/return', 'task/state'])

// 项目里的一段对话。专家正拿着的时候是专家处理中那一页；否则是聊天就用聊天页，是工作就用工作页。
export function ConversationView({ conversation }: { conversation: string }) {
  const found = useConversation(conversation)
  const { events } = useConversationEvents()
  const client = useQueryClient()
  // 交给专家、专家交回：谁在处理变了，重新取一次这段对话
  const turns = events.filter((event) => TURNING.has(event.type)).length
  useEffect(() => {
    if (turns > 0) void client.invalidateQueries({ queryKey: ['workbench', 'conversation'] })
  }, [turns, client])

  const actions = <CostButton conversation={conversation} />
  if (found.data?.active_task_id) return <ExpertRunScreen task={found.data.active_task_id} />
  if (found.data?.kind === 'chat') {
    return <ChatScreen conversation={conversation} actions={actions} />
  }
  // 还没取到是哪一种的时候先按工作页摆：项目里的对话多数是工作
  return <WorkScreen conversation={conversation} actions={actions} />
}
