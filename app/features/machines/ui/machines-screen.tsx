'use client'

import { CheckIcon, CircleIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'

import { useWorkbench } from '@/lib/workbench/context'
import { useMachines, useSandboxes } from '@/lib/workbench/queries'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { isOnline, progress } from '../model/guide'
import { AgentSetup } from './agent-setup'
import { AgentDownloadPanel } from './agent-download'

// 我的机器：接入了哪些、各自在不在线、白名单里有哪些目录、它自己定的上限；怎么接入一台。
// 白名单与上限只能在那台机器上改：这一页只显示。
export function MachinesScreen() {
  const t = useTranslations('machines')
  const format = useFormatter()
  const { locale, csrfToken } = useWorkbench()
  const machines = useMachines()
  const sandboxes = useSandboxes()
  const done = progress({ sandboxes: sandboxes.data?.length, machines: machines.data })
  const steps = [
    { key: 'step1', done: done.sandbox },
    { key: 'step2', done: done.agent },
    { key: 'step3', done: done.roots },
  ] as const
  const label = 'text-muted-foreground'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        </header>

        <section aria-label={t('list')} className="space-y-3">
          <h2 className="text-sm font-medium">{t('list')}</h2>
          {machines.isPending ? (
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          ) : (machines.data ?? []).length === 0 ? (
            <p className="text-muted-foreground rounded-xl border px-4 py-3 text-sm">{t('none')}</p>
          ) : (
            (machines.data ?? []).map((machine) => {
              const online = isOnline(machine)
              const mode = machine.ceiling?.sandbox
              return (
                <article key={machine.id} className="space-y-3 rounded-xl border p-5">
                  <header className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        online ? 'bg-green-600' : 'bg-amber-500',
                      )}
                    />
                    <h3 className="text-base font-semibold">{machine.name}</h3>
                    <span className={cn('text-sm', online ? label : 'text-amber-700')}>
                      {online ? t('online') : t('offline')}
                    </span>
                  </header>
                  {online ? null : <p className="text-sm text-amber-700">{t('offlineNote')}</p>}
                  <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className={label}>{t('agent')}</dt>
                    <dd>{machine.agent_version ?? t('unknown')}</dd>
                    <dt className={label}>{t('codex')}</dt>
                    <dd>{machine.codex_version ?? t('unknown')}</dd>
                    <dt className={label}>{t('lastSeen')}</dt>
                    <dd>
                      {machine.last_seen_at
                        ? format.dateTime(new Date(machine.last_seen_at), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : t('unknown')}
                    </dd>
                    <dt className={label}>{t('roots')}</dt>
                    <dd>
                      {machine.roots.length === 0 ? (
                        <span className="text-amber-700">{t('noRoots')}</span>
                      ) : (
                        <ul className="font-mono text-[13px]">
                          {machine.roots.map((root) => (
                            <li key={root}>{root}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                    <dt className={label}>{t('ceiling.title')}</dt>
                    <dd>
                      {mode && t.has(`ceiling.sandbox.${mode}`)
                        ? t(`ceiling.sandbox.${mode}`)
                        : (mode ?? t('unknown'))}
                      {'；'}
                      {machine.ceiling?.network ? t('ceiling.networkOn') : t('ceiling.networkOff')}
                    </dd>
                  </dl>
                </article>
              )
            })
          )}
          <p className="text-muted-foreground text-[13px]">{t('ceiling.note')}</p>
        </section>

        <AgentDownloadPanel />
        <AgentSetup csrfToken={csrfToken} />

        <section aria-label={t('guide.title')} className="space-y-3">
          <h2 className="text-sm font-medium">{t('guide.title')}</h2>
          <ol className="divide-y rounded-xl border">
            {steps.map((step, index) => (
              <li key={step.key} className="flex items-start gap-3 px-4 py-3 text-sm">
                {step.done ? (
                  <CheckIcon
                    className="mt-0.5 size-4 shrink-0 text-green-700"
                    aria-label={t('guide.done')}
                  />
                ) : (
                  <CircleIcon
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-label={t('guide.todo')}
                  />
                )}
                <span className="min-w-0 flex-1">
                  {index + 1}. {t(`guide.${step.key}`)}
                  {step.key === 'step1' && !step.done ? (
                    <>
                      {' '}
                      <Link href={routes.settings(locale)} className="underline underline-offset-3">
                        {t('guide.toSettings')}
                      </Link>
                    </>
                  ) : null}
                  {step.key === 'step2' ? (
                    <span className="text-muted-foreground block text-[13px]">
                      {t('guide.download')}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
