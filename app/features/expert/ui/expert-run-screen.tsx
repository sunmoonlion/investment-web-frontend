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

import { useReview, useRun, useRunActions, useRunStep } from '../api/run'
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
  const live = now !== null
  const offline = now?.doing.code === 'offline'
  // 审查面摆在停住的那一步下面；看别的步骤时不摆
  const reviewHere = review.data && shown === (review.data.where.step?.index ?? position?.step)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b px-4 text-sm">
        <span className="font-medium">
          {offline
            ? t('band.offline')
            : waiting
              ? t('band.waiting')
              : live
                ? t('band.running', { name: sheet.expert.name })
                : (sheet.state_word ?? sheet.expert.name)}
        </span>
        {position ? (
          <span className="text-muted-foreground min-w-0 truncate">
            {t('band.position', { step: position.step, of: position.of, title: position.title })}
          </span>
        ) : null}
        <div className="flex-1" />
        <span className="shrink-0 tabular-nums" data-testid="run-spent">
          {t('band.spent', { amount: amountText(sheet.budget.spent, sheet.budget.currency) })}
          <span className="text-muted-foreground ml-1 text-xs">{t('band.estimated')}</span>
        </span>
        {live ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
            {t('stop.button')}
          </Button>
        ) : null}
      </header>

      {now ? <NowStrip now={now} clock={clock} /> : null}

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
