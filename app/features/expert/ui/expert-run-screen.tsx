'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConversationEvents } from '@/lib/workbench/conversation-events'
import { useClock } from '@/lib/workbench/use-clock'

import { useDossier } from '../api/desk'
import { useReview, useRun, useRunActions, useRunStep } from '../api/run'
import { answerLine } from '../model/dossier'
import { shownStep, tokenOf } from '../model/run'
import { amountText, NowStrip, StepDetail, StepRail } from './parts'
import { ExpertResults } from './results'
import { ReviewPanel } from './review-panel'

// 专家处理中。三栏：步骤、这一步的细节、委托单。
// 顶上一直摆着：做到第几步、花了多少、现在在干什么、为什么、没有卡住；随时能停。
export function ExpertRunScreen({ task }: { task: string }) {
  const t = useTranslations('expert')
  const { events, state } = useConversationEvents()
  const clock = useClock()
  // 每来一条事件就重取一次：步骤的状态、花了多少、现在在干什么都跟着变
  const beat = events.length
  const run = useRun(task, beat)
  const act = useRunActions(task)
  const [picked, setPicked] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  const shown = shownStep(run.data, picked)
  const detail = useRunStep(task, shown, beat)
  // 做完了：把「回答」摘一行放在顶上，不用点进底稿才看到（所有者 2026-10-07）
  const ended = run.data?.task.ended_at != null
  const dossier = useDossier(task, ended ? beat : null)
  const answer = ended && dossier.data ? answerLine(dossier.data) : null
  const pending = run.data?.task.active_interaction_id ?? null
  const review = useReview(pending)

  if (!run.data) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        {run.isError ? t('failedToLoad') : t('loading')}
      </p>
    )
  }
  const { task: sheet, now, position, steps } = run.data
  const waiting = sheet.state === 'WAITING'
  // 操作权看任务状态。机器断开、实时快照暂缺时仍须能取消。
  const live = ['RECEIVED', 'VALIDATING', 'QUEUED', 'RUNNING', 'WAITING'].includes(sheet.state)
  const offline = now?.doing.code === 'offline'
  // 审查面摆在停住的那一步下面；看别的步骤时不摆
  const reviewHere = review.data && shown === (review.data.where.step?.index ?? position?.step)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm">
        <span className="w-full min-w-0 truncate font-medium sm:w-auto sm:flex-1">
          {offline
            ? t('band.offline')
            : waiting
              ? t('band.waiting')
              : live
                ? t('band.running', { name: sheet.expert.name })
                : (sheet.state_word ?? sheet.expert.name)}
        </span>
        {position ? (
          <span className="text-muted-foreground order-last w-full truncate sm:order-none sm:w-auto sm:max-w-64">
            {t('band.position', { step: position.step, of: position.of, title: position.title })}
          </span>
        ) : null}
        <span className="shrink-0 tabular-nums" data-testid="run-spent">
          {t('band.spent', { amount: amountText(sheet.budget.spent, sheet.budget.currency) })}
          <span className="text-muted-foreground ml-1 text-xs">{t('band.estimated')}</span>
        </span>
        {live ? (
          <Button
            className="shrink-0"
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            {t('stop.button')}
          </Button>
        ) : null}
      </header>

      {now ? <NowStrip now={now} clock={clock} /> : null}
      {answer ? (
        <p
          role="status"
          className="bg-muted/40 shrink-0 truncate border-b px-4 py-2 text-sm"
          title={answer}
        >
          <span className="text-muted-foreground mr-2">{t('answer')}</span>
          {answer}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <StepRail steps={steps} shown={shown} onPick={setPicked} />
        <div className="min-w-0 flex-1 overflow-y-auto">
          <StepDetail
            step={detail.data ?? steps.find((step) => step.index === shown)}
            loading={detail.isPending}
          />
          {reviewHere && review.data ? (
            <ReviewPanel
              review={review.data}
              token={pending ? tokenOf(events, pending) : null}
              answering={act.answer.isPending}
              failed={act.answer.isError}
              onAnswer={(decision) => {
                const token = pending ? tokenOf(events, pending) : null
                if (pending && token) act.answer.mutate({ pending, token, decision })
              }}
            />
          ) : null}
        </div>
        <ExpertResults
          task={task}
          run={run.data}
          clock={clock}
          beat={beat}
          live={state === 'live'}
        />
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stop.title')}</DialogTitle>
            <DialogDescription>{t('stop.body')}</DialogDescription>
          </DialogHeader>
          {act.stop.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {t('stop.failed')}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('stop.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={act.stop.isPending}
              onClick={() => act.stop.mutate(undefined, { onSuccess: () => setConfirming(false) })}
            >
              {t('stop.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
