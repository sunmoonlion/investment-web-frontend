'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  ConversationEventsProvider,
  useConversationEvents,
} from '@/lib/workbench/conversation-events'
import { useWorkbench } from '@/lib/workbench/context'
import { conversationRoute } from '@/lib/workbench/routes'

import { useReviewPlace } from '../api/desk'
import { useReview, useRunActions } from '../api/run'
import { tokenOf } from '../model/run'
import { ReviewPanel } from './review-panel'

type Place = NonNullable<ReturnType<typeof useReviewPlace>['data']>

function Answer({ pending, place, back }: { pending: string; place: Place; back: string }) {
  const router = useRouter()
  const { events } = useConversationEvents()
  const review = useReview(pending)
  const act = useRunActions(place.where.task?.id ?? '')
  if (!review.data) return null
  const token = tokenOf(events, pending)
  return (
    <div className="-mx-6">
      <ReviewPanel
        review={review.data}
        token={token}
        answering={act.answer.isPending}
        failed={act.answer.isError}
        onAnswer={(decision) => {
          if (token) {
            act.answer.mutate({ pending, token, decision }, { onSuccess: () => router.push(back) })
          }
        }}
      />
    </div>
  )
}

// 单独的审查面：从首页、侧栏、专家首页的「待我决定」点进来。
// 先说清这件事在哪（哪个项目、哪段对话、哪件委托），再摆审查面。答完回到那段对话。
export function ReviewScreen({ pending }: { pending: string }) {
  const t = useTranslations('reviewPage')
  const { locale } = useWorkbench()
  const place = useReviewPlace(pending)
  if (!place.data) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        {place.isError ? t('failed') : t('loading')}
      </p>
    )
  }
  const where = place.data.where
  const conversation = where.conversation
  const back = conversation
    ? conversationRoute(locale, {
        id: conversation.id,
        project_id: where.project?.id ?? null,
        kind: conversation.kind,
      })
    : `/${locale}/workbench`
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-sm">
          {where.project ? (
            <>
              <dt className="text-muted-foreground">{t('project')}</dt>
              <dd>{where.project.title}</dd>
            </>
          ) : null}
          {conversation ? (
            <>
              <dt className="text-muted-foreground">{t('conversation')}</dt>
              <dd>
                <Link href={back} className="underline underline-offset-3">
                  {conversation.title ?? t('open')}
                </Link>
              </dd>
            </>
          ) : null}
          {where.task ? (
            <>
              <dt className="text-muted-foreground">{t('expertTask')}</dt>
              <dd>
                {where.task.expert} · {where.task.question}
              </dd>
            </>
          ) : null}
          {place.data.subject.command ? (
            <>
              <dt className="text-muted-foreground">{t('command')}</dt>
              <dd className="font-mono text-[13px] break-all">{place.data.subject.command}</dd>
              <dt className="text-muted-foreground">{t('cwd')}</dt>
              <dd className="font-mono text-[13px] break-all">{place.data.subject.cwd}</dd>
            </>
          ) : null}
        </dl>
        {conversation ? (
          // 答复要带的凭证在这段对话的事件里
          <ConversationEventsProvider conversation={conversation.id}>
            <Answer pending={pending} place={place.data} back={back} />
          </ConversationEventsProvider>
        ) : null}
      </div>
    </div>
  )
}
