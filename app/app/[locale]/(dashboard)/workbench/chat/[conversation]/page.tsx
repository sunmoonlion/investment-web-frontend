import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ChatScreen } from '@/features/chat'
import { CostButton } from '@/features/usage'
import { ConversationEventsProvider } from '@/lib/workbench/conversation-events'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell')
  return { title: t('mode.chat'), robots: { index: false, follow: false } }
}

// 不属于项目的聊天。页面只把功能拼起来：对话、花费各是各的。
export default async function ChatPage({ params }: { params: Promise<{ conversation: string }> }) {
  const { conversation } = await params
  return (
    <ConversationEventsProvider conversation={conversation}>
      <ChatScreen
        conversation={conversation}
        actions={<CostButton conversation={conversation} />}
      />
    </ConversationEventsProvider>
  )
}
