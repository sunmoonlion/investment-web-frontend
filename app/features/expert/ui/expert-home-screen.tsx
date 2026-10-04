'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { ProjectPicker } from '@/components/workbench/project-picker'
import { useWorkbench } from '@/lib/workbench/context'
import { useProjects } from '@/lib/workbench/queries'
import { isBuilt, routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { useOverview, usePacks } from '../api/desk'
import { amountText } from './parts'

const section = 'space-y-2'
const heading = 'text-sm font-medium'

// 专家首页：等我决定的在最上面；进行中的；有哪些专家；最近交回的。
export function ExpertHomeScreen() {
  const t = useTranslations('expertHome')
  const router = useRouter()
  const { locale } = useWorkbench()
  const overview = useOverview()
  const packs = usePacks()
  const projects = useProjects()
  const [asking, setAsking] = useState<string | null>(null)
  const names = new Map((projects.data ?? []).map((each) => [each.id, each.title]))
  const data = overview.data

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        </header>

        {data && data.waiting.length > 0 ? (
          <section className={section} aria-label={t('waiting')}>
            <h2 className={heading}>
              {t('waiting')}
              <span className="bg-foreground text-background ml-2 rounded-full px-1.5 text-xs">
                {data.waiting.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {data.waiting.map((each) => (
                <li
                  key={each.interaction_id}
                  className="flex items-center gap-4 rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {each.where.task?.question ?? each.where.conversation?.title}
                      {each.where.task ? (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          · {each.where.task.expert}
                          {each.where.step
                            ? ` · ${t('step', { index: each.where.step.index, title: each.where.step.title })}`
                            : ''}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground truncate text-[13px]">
                      {each.failed[0]?.message || each.why}
                    </p>
                  </div>
                  {/* 去别的页：是链接，不是按钮 */}
                  <Link
                    href={routes.review(locale, each.interaction_id)}
                    className={cn(buttonVariants({ size: 'sm' }))}
                  >
                    {t('handle')}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data && data.running.length > 0 ? (
          <section className={section} aria-label={t('running')}>
            <h2 className={heading}>{t('running')}</h2>
            <ul className="divide-y rounded-xl border">
              {data.running.map((each) => (
                <li key={each.task_id}>
                  <Link
                    href={
                      each.project_id
                        ? routes.projectConversation(locale, each.project_id, each.session_id)
                        : routes.home(locale)
                    }
                    className="hover:bg-muted/60 flex items-center gap-4 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{each.question}</span>
                    <span className="text-muted-foreground shrink-0">{each.expert}</span>
                    {each.position ? (
                      <span className="text-muted-foreground shrink-0">
                        {t('position', { step: each.position.step, of: each.position.of })}
                      </span>
                    ) : null}
                    <span className="shrink-0 tabular-nums">
                      {t('spent', {
                        amount: amountText(each.budget.spent, each.budget.currency),
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={section} aria-label={t('packs')}>
          <h2 className={heading}>{t('packs')}</h2>
          {packs.isPending ? (
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {(packs.data ?? []).map((pack) => (
                <li key={pack.id} className="flex flex-col rounded-xl border p-4">
                  <h3 className="text-base font-semibold">{pack.name}</h3>
                  <p className="text-muted-foreground text-sm">{pack.tagline}</p>
                  <dl className="mt-3 space-y-2 text-[13px]">
                    <div>
                      <dt className="text-muted-foreground inline">{t('solves')}：</dt>
                      <dd className="inline">{pack.solves}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline">{t('doesNot')}：</dt>
                      <dd className="inline">{pack.does_not_solve}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-muted-foreground text-[13px]">
                      {t('stepsCount', { n: pack.steps.length })} ·{' '}
                      {pack.uses_our_data ? t('usesData') : t('noData')}
                    </span>
                    <Button size="sm" onClick={() => setAsking(pack.id)}>
                      {t('ask')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={section} aria-label={t('returned')}>
          <h2 className={heading}>{t('returned')}</h2>
          {data && data.returned.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('none')}</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {(data?.returned ?? []).map((each) => (
                <li key={each.task_id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{each.question}</span>
                    <span className="text-muted-foreground block truncate text-[13px]">
                      {[
                        each.project_id ? names.get(each.project_id) : null,
                        each.expert || null,
                        each.reason_text || null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span
                    className={
                      each.state === 'SUCCEEDED'
                        ? 'shrink-0 text-green-700 dark:text-green-400'
                        : 'text-muted-foreground shrink-0'
                    }
                  >
                    {each.state_word}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums">
                    {amountText(each.budget.spent, each.budget.currency)}
                  </span>
                  {isBuilt('dossier') && each.project_id ? (
                    <Link
                      href={routes.dossier(locale, each.project_id, each.task_id)}
                      className="shrink-0 underline underline-offset-3"
                    >
                      {t('dossier')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ProjectPicker
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        title={t('pickTitle')}
        description={t('pickBody')}
        onPick={(project) =>
          router.push(`${routes.askExpert(locale, project)}?expert=${encodeURIComponent(asking!)}`)
        }
      />
    </div>
  )
}
