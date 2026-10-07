'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { ResultsPanel, type ResultsStatus } from '@/components/workbench/results-panel'
import type { Run } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { isBuilt, routes } from '@/lib/workbench/routes'
import { useAutoOpen } from '@/lib/workbench/use-auto-open'

import { useDossier } from '../api/desk'
import { answerLine } from '../model/dossier'
import { Block, Conclusion } from './dossier-parts'
import { amountText, useDuration } from './parts'

// 专家页右边的结果边栏：委托单的几行，加整份底稿（做完的部分）。做完那一刻自动展开。
export function ExpertResults({
  task,
  run,
  clock,
  beat,
}: {
  task: string
  run: Run
  clock: number
  beat: number
}) {
  const t = useTranslations('results')
  const te = useTranslations('expert')
  const td = useTranslations('dossier')
  const { locale } = useWorkbench()
  const duration = useDuration()
  const sheet = run.task
  const ended = sheet.ended_at !== null
  const status: ResultsStatus =
    sheet.state === 'SUCCEEDED'
      ? 'done'
      : sheet.state === 'CANCELLED' || sheet.state === 'REJECTED'
        ? 'stopped'
        : sheet.state === 'FAILED'
          ? 'failed'
          : 'running'
  const [open, setOpen] = useAutoOpen(ended)
  // 做完了才取底稿；开着边栏时每来一条事件也重取，做完的步骤随时进来
  const dossier = useDossier(task, open || ended ? beat : null)
  const answer = dossier.data ? answerLine(dossier.data) : null
  const until = sheet.ended_at ? Date.parse(sheet.ended_at) : clock
  const elapsed = sheet.started_at
    ? Math.max(0, Math.floor((until - Date.parse(sheet.started_at)) / 1000))
    : 0
  const label = 'text-muted-foreground text-xs font-medium'
  const projectId = run.task.project_id ?? null
  return (
    <ResultsPanel
      summary={answer ?? sheet.state_word ?? null}
      status={status}
      open={open}
      onOpenChange={setOpen}
      filed={
        ended && sheet.state === 'SUCCEEDED'
          ? { href: isBuilt('libraryItem') ? routes.libraryItem(locale, `dossier:${task}`) : null }
          : null
      }
    >
      <section aria-label={t('expert.sheet')} className="space-y-3 border-b pb-4">
        <div>
          <p className={label}>{te('sheet.question')}</p>
          <p className="mt-0.5 whitespace-pre-wrap">{sheet.question}</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className={label}>{te('sheet.spent')}</p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {amountText(sheet.budget.spent, sheet.budget.currency)}
            </p>
            <p className="text-muted-foreground tabular-nums">
              {te('sheet.parts', {
                used: amountText(sheet.budget.used, sheet.budget.currency),
                running: amountText(sheet.budget.running, sheet.budget.currency),
              })}
            </p>
          </div>
          <div>
            <p className={label}>{te('sheet.elapsed')}</p>
            <p className="mt-0.5 tabular-nums">{duration(elapsed)}</p>
          </div>
        </div>
        <div>
          <p className={label}>{te('sheet.data')}</p>
          {sheet.data?.dataset ? (
            <p className="mt-0.5">
              <span className="font-mono">{sheet.data.dataset}</span>
              {sheet.data.as_of ? (
                <span className="block">{te('sheet.dataAsOf', { asOf: sheet.data.as_of })}</span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5">{te('sheet.dataUnknown')}</p>
          )}
        </div>
      </section>

      <section aria-label={t('expert.dossier')} className="space-y-5 pt-4">
        {dossier.data ? (
          <>
            {dossier.data.head.kind !== 'done' ? (
              <p className="text-muted-foreground">{dossier.data.head.text}</p>
            ) : null}
            {dossier.data.sections.map((section) => (
              <div key={section.key}>
                <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
                <div className="space-y-3">
                  {section.blocks.map((block) => (
                    <Block key={block.key} block={block} alone={section.blocks.length === 1} />
                  ))}
                </div>
              </div>
            ))}
            {ended ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{td('conclusion.title')}</h3>
                <Conclusion task={task} saved={dossier.data.conclusion} />
              </div>
            ) : null}
            {projectId ? (
              <Link
                href={routes.dossier(locale, projectId, task)}
                className="text-muted-foreground block text-xs underline underline-offset-3"
              >
                {t('expert.full')}
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">
            {dossier.isError ? td('failed') : ended ? td('loading') : t('expert.noAnswer')}
          </p>
        )}
        {!ended ? <p className="text-muted-foreground text-xs">{t('expert.notFiled')}</p> : null}
      </section>
    </ResultsPanel>
  )
}
