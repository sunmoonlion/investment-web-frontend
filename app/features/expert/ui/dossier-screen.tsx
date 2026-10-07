'use client'

import { DownloadIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import type { Dossier } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { dossierExportHref, useDossier } from '../api/desk'
import { useRunStep } from '../api/run'
import { ordinal } from '../model/dossier'
import { MARK } from '../model/run'
import { Block, Conclusion } from './dossier-parts'
import { amountText, StepDetail } from './parts'

const QUESTION = 'workbench.question'

// 它是怎么做的：步骤轨的横排版。返工、退回如实显示。点一步看它交回了什么、验收的每一条。
function How({ task, how }: { task: string; how: Dossier['how'] }) {
  const t = useTranslations('dossier')
  const te = useTranslations('expert')
  const [picked, setPicked] = useState<number | null>(null)
  const detail = useRunStep(task, picked, 0)
  if (how.length === 0) return <p className="text-muted-foreground text-[13px]">{t('how.none')}</p>
  return (
    <div>
      <ol className="flex flex-wrap gap-2">
        {how.map((step) => (
          <li key={step.index}>
            <button
              type="button"
              aria-pressed={picked === step.index}
              title={te(`status.${step.status}`)}
              onClick={() => setPicked(picked === step.index ? null : step.index)}
              className={cn(
                'hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]',
                picked === step.index && 'border-foreground bg-muted',
                (step.status === 'not_reached' || step.status === 'pending') &&
                  'text-muted-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  step.status === 'accepted' && 'text-green-700 dark:text-green-400',
                  step.status === 'failed' && 'text-destructive',
                )}
              >
                {MARK[step.status]}
              </span>
              {step.index} {step.title}
              {step.rejected > 0 ? (
                <span className="text-muted-foreground text-xs">
                  {t('how.redone', { n: step.rejected })}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>
      {picked === null ? (
        <p className="text-muted-foreground mt-2 text-[13px]">{t('how.detail')}</p>
      ) : (
        <div className="mt-3 rounded-lg border">
          <StepDetail step={detail.data} loading={detail.isPending} />
        </div>
      )}
    </div>
  )
}

// 底稿：问了什么 → 答了什么 → 凭什么 → 哪些没做到 → 我怎么看。
// 不显示评级、目标价、买卖建议：后端拦了一道，这一页也没有放它们的地方。
export function DossierScreen({ project, task: id }: { project: string; task: string }) {
  const t = useTranslations('dossier')
  const format = useFormatter()
  const router = useRouter()
  const { locale } = useWorkbench()
  const dossier = useDossier(id)

  if (!dossier.data) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        {dossier.isError ? t('failed') : t('loading')}
      </p>
    )
  }
  const { task, head, sections, how, conclusion } = dossier.data
  const refused = head.kind === 'refused'
  const data = task.data?.dataset
    ? {
        dataset: task.data.dataset,
        version: (task.data.data_version ?? '').slice(-8),
        asOf: task.data.as_of ?? '',
      }
    : null
  const again = (expert: string | null) => {
    window.sessionStorage.setItem(QUESTION, task.question)
    router.push(
      `${routes.askExpert(locale, project)}${expert ? `?expert=${encodeURIComponent(expert)}` : ''}`,
    )
  }
  const notice =
    head.kind === 'running'
      ? t('head.running')
      : head.kind === 'no_data'
        ? t('head.noData')
        : head.kind === 'refused'
          ? t('head.refused')
          : head.kind === 'stopped'
            ? t('head.stopped')
            : null
  // 一、二、三……连着编号：后端给的各节，再加「它是怎么做的」「我的结论」
  const shown = refused ? [] : sections
  const howNumber = shown.length + 1
  const conclusionNumber = shown.length + (refused ? 1 : 2)

  return (
    <div className="h-full overflow-y-auto">
      <article className="mx-auto w-full max-w-4xl px-6 py-10">
        <header className="border-b pb-5">
          <h1 className="text-2xl font-semibold tracking-tight">{task.question}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {[
              task.expert.name || null,
              task.state_word ?? head.text,
              task.ended_at
                ? format.dateTime(new Date(task.ended_at), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : null,
              t('spent', { amount: amountText(task.budget.spent, task.budget.currency) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {data ? <p className="text-muted-foreground mt-0.5 text-sm">{t('data', data)}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={routes.projectConversation(locale, project, task.session_id)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('back')}
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => again(refused ? null : task.expert.id)}
            >
              {refused ? t('otherExpert') : t('again')}
            </Button>
            <a
              href={dossierExportHref(id)}
              download
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <DownloadIcon />
              {t('export')}
            </a>
          </div>
        </header>

        {notice ? (
          <div
            role="status"
            className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30"
          >
            <p className="font-medium">{head.text}</p>
            <p className="mt-1">{notice}</p>
            {task.reason_text ? <p className="mt-1">{task.reason_text}</p> : null}
          </div>
        ) : null}

        {shown.map((section, at) => {
          return (
            <section key={section.key} aria-label={section.title} className="border-b py-6">
              <h2 className="mb-3 text-base font-semibold">
                {ordinal(at + 1)}、{section.title}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((block) => (
                  <Block key={block.key} block={block} alone={section.blocks.length === 1} />
                ))}
              </div>
            </section>
          )
        })}

        {refused ? null : (
          <section aria-label={t('how.title')} className="border-b py-6">
            <h2 className="mb-3 text-base font-semibold">
              {ordinal(howNumber)}、{t('how.title')}
            </h2>
            <How task={id} how={how} />
          </section>
        )}

        <section aria-label={t('conclusion.title')} className="py-6">
          <h2 className="mb-3 flex items-baseline gap-2 text-base font-semibold">
            {ordinal(conclusionNumber)}、{t('conclusion.title')}
            <span className="text-muted-foreground rounded-full border px-2 text-xs font-normal">
              {t('conclusion.draft')}
            </span>
          </h2>
          <Conclusion task={id} saved={conclusion} />
        </section>
      </article>
    </div>
  )
}
