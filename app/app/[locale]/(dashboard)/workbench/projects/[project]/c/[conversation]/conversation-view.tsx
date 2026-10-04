'use client'

import { ChatScreen } from '@/features/chat'
import { CostButton } from '@/features/usage'
import { WorkScreen } from '@/features/work'
import { useConversation } from '@/lib/workbench/conversation'

// 项目里的一段对话：是聊天就用聊天页，是工作就用工作页。
export function ConversationView({ conversation }: { conversation: string }) {
  const found = useConversation(conversation)
  const actions = <CostButton conversation={conversation} />
  if (found.data?.kind === 'chat') {
    return <ChatScreen conversation={conversation} actions={actions} />
  }
  // 还没取到是哪一种的时候先按工作页摆：项目里的对话多数是工作
  return <WorkScreen conversation={conversation} actions={actions} />
}
