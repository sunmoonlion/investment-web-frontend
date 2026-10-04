'use client'

import { FolderIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Marker, MarkerContent } from '@/components/ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Composer } from '@/components/workbench/composer'
import { ConversationTitle } from '@/components/workbench/conversation-title'
import { useWorkbench } from '@/lib/workbench/context'
import { useConversation, useConversationActions, useWaiting } from '@/lib/workbench/conversation'
import { useConversationEvents } from '@/lib/workbench/conversation-events'
import { WorkbenchError } from '@/lib/workbench/http'
import { useProjects } from '@/lib/workbench/queries'
import { isBuilt, routes } from '@/lib/workbench/routes'

import { byFile, timeline } from '../model/timeline'
import { ChangesPanel } from './changes-panel'
import { TimelineEntry } from './entries'

// 工作页：看它干活，随时插话，要紧的事由你点头。
// 过程时间线在中间，右边是这段对话改了哪些文件。`actions` 是页面放进顶部右边的东西（花费钮）。
export function WorkScreen({
  conversation: id,
  actions,
}: {
  conversation: string
  actions?: React.ReactNode
}) {
  const t = useTranslations('work')
  const tc = useTranslations('conversation')
  const router = useRouter()
  const { locale } = useWorkbench()
  const { events, state } = useConversationEvents()
  const conversation = useConversation(id)
  const waiting = useWaiting(id)
  const projects = useProjects()
  const act = useConversationActions(id)

  const line = timeline(events)
  const session = conversation.data
  const project = session?.project_id
    ? (projects.data ?? []).find((each) => each.id === session.project_id)
    : undefined
  const directory = project?.directory ?? session?.project_root ?? null
  const expert = session?.wheel === 'advisor'
  const failed = [act.say, act.stop, act.rename, act.answer].find((each) => each.isError)?.error
  const problem = failed
    ? act.answer.isError
      ? t('approval.failed')
      : tc.has(`problem.${(failed as WorkbenchError).code}`)
        ? tc(`problem.${(failed as WorkbenchError).code}`)
        : tc('problem.other')
    : null
  const status =
    line.live === 'approval'
      ? t('band.waiting')
      : line.live !== null
        ? `${t('band.running')} · ${tc(`activity.${line.live}`)}`
        : line.last === 'stopped'
          ? t('band.stopped')
          : line.last === 'failed'
            ? t('band.failed')
            : t('band.idle')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <ConversationTitle title={session?.title} onRename={(title) => act.rename.mutate(title)} />
        {project ? (
          <span className="text-muted-foreground flex min-w-0 shrink items-center gap-1 text-[13px]">
            <FolderIcon className="size-3.5 shrink-0" />
            <span className="shrink-0">{project.title}</span>
            <span className="truncate font-mono text-xs" title={t('directory')}>
              {directory}
            </span>
          </span>
        ) : null}
        <div className="flex-1" />
        {state === 'offline' ? (
          <span className="shrink-0 text-[13px] text-amber-600">{tc('stream.offline')}</span>
        ) : null}
        {actions}
      </header>

      {/* 状态带：谁在处理、这会儿怎么样 */}
      <div
        role="status"
        className="bg-muted/40 flex h-9 shrink-0 items-center gap-3 border-b px-4 text-[13px]"
      >
        <span className="font-medium">{expert ? t('band.expert') : t('band.you')}</span>
        {expert ? null : <span className="text-muted-foreground">{status}</span>}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-3 px-4 py-6">
                  {line.entries.length === 0 ? (
                    <Marker className="justify-center">
                      <MarkerContent>
                        {state === 'connecting' ? tc('stream.connecting') : t('empty')}
                      </MarkerContent>
                    </Marker>
                  ) : null}
                  {line.entries.map((entry) => (
                    <MessageScrollerItem key={entry.key}>
                      <TimelineEntry
                        entry={entry}
                        directory={directory}
                        waiting={waiting.data ?? []}
                        answering={act.answer.isPending}
                        onAnswer={(approval, decision) =>
                          act.answer.mutate({
                            pending: approval.id,
                            token: approval.token,
                            decision,
                          })
                        }
                      />
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton aria-label={t('toEnd')} />
            </MessageScroller>
          </MessageScrollerProvider>

          <Composer
            busy={line.live !== null}
            sending={act.say.isPending}
            stopping={act.stop.isPending}
            problem={problem}
            onSend={(text) => act.say.mutateAsync(text)}
            onStop={() => act.stop.mutate()}
            placeholder={t('placeholder')}
            disabledReason={expert ? t('expertBusy') : null}
          >
            <Button
              variant="outline"
              size="sm"
              disabled={
                line.live !== null || expert || !session?.project_id || !isBuilt('askExpert')
              }
              title={isBuilt('askExpert') ? undefined : tc('notBuilt')}
              onClick={() =>
                session?.project_id && router.push(routes.askExpert(locale, session.project_id, id))
              }
            >
              {tc('askExpert')}
            </Button>
          </Composer>
        </div>
        <ChangesPanel files={byFile(line.changes)} directory={directory} />
      </div>
    </div>
  )
}
