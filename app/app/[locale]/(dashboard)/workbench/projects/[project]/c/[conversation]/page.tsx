import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ConversationEventsProvider } from '@/lib/workbench/conversation-events'

import { ConversationView } from './conversation-view'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell')
  return { title: t('mode.work'), robots: { index: false, follow: false } }
}

// 项目里的对话：聊天或工作。
export default async function ProjectConversationPage({
  params,
}: {
  params: Promise<{ conversation: string }>
}) {
  const { conversation } = await params
  return (
    <ConversationEventsProvider conversation={conversation}>
      <ConversationView conversation={conversation} />
    </ConversationEventsProvider>
  )
}
