'use client'

import { ChevronRightIcon, LoaderIcon, ShieldAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Markdown } from '@/components/common/markdown'
import { Button } from '@/components/ui/button'
import { Marker, MarkerContent } from '@/components/ui/marker'
import { MissingDataCard } from '@/components/workbench/missing-data-card'
import { ChangeLine, StepLine } from '@/components/workbench/step-line'
import type { Waiting } from '@/contracts/workbench-v2'
import { relativeTo } from '@/lib/workbench/items'
import { cn } from '@/lib/utils'

import { phaseTally, type Approval, type Entry } from '../model/timeline'

// 一段过程：它说了一句要做什么，接着跑了几条命令。收成一行，点开才看细节。
function Phase({ entry }: { entry: Extract<Entry, { kind: 'phase' }> }) {
  const t = useTranslations('work')
  const [open, setOpen] = useState(false)
  const counted = phaseTally(entry.steps)
  const parts = [
    counted.commands ? t('phase.commands', { count: counted.commands }) : null,
    counted.data ? t('phase.data', { count: counted.data }) : null,
    counted.failed ? t('phase.failed', { count: counted.failed }) : null,
  ].filter(Boolean)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm"
      >
        {counted.running ? (
          <LoaderIcon className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronRightIcon
            className={cn(
              'text-muted-foreground size-3.5 shrink-0 transition-transform',
              open && 'rotate-90',
            )}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{entry.said ?? t('phase.untitled')}</span>
        <span className="text-muted-foreground shrink-0 text-[13px]">{parts.join(' · ')}</span>
      </button>
      {open ? (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l pl-3">
          {entry.steps.map((step) => (
            <StepLine key={`${step.kind}:${step.id}`} step={step} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// 等你批准：命令、在哪个目录、它的理由，都摆出来；能选什么由后端给。
function ApprovalCard({
  approval,
  waiting,
  answering,
  onAnswer,
}: {
  approval: Approval
  waiting: Waiting | undefined
  answering: boolean
  onAnswer: (approval: Approval, decision: string) => void
}) {
  const t = useTranslations('work')
  if (approval.state !== 'pending') {
    const known = ['accept', 'acceptForSession', 'decline'].includes(approval.decision ?? '')
    return (
      <Marker>
        <MarkerContent>
          {approval.state === 'expired'
            ? t('approval.expired')
            : t(`approval.answered.${known ? approval.decision : 'other'}`)}
          <span className="ml-2 font-mono text-xs">{approval.command}</span>
        </MarkerContent>
      </Marker>
    )
  }
  const options = waiting?.prompt.options ?? [
    { id: 'accept', label: t('approval.answered.accept') },
    { id: 'decline', label: t('approval.answered.decline') },
  ]
  return (
    <section
      aria-label={t('approval.title')}
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <p className="flex items-center gap-2 font-medium">
        <ShieldAlertIcon className="size-4 shrink-0" />
        {t('approval.title')}
      </p>
      <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">{t('approval.command')}</dt>
        <dd className="font-mono break-all">{approval.command}</dd>
        <dt className="text-muted-foreground">{t('approval.where')}</dt>
        <dd className="font-mono break-all">{approval.cwd}</dd>
        {approval.reason ? (
          <>
            <dt className="text-muted-foreground">{t('approval.reason')}</dt>
            <dd>{approval.reason}</dd>
          </>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={option.id === 'decline' ? 'outline' : 'default'}
            disabled={answering}
            onClick={() => onAnswer(approval, option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </section>
  )
}

export function TimelineEntry({
  entry,
  directory,
  waiting,
  answering,
  onAnswer,
}: {
  entry: Entry
  directory: string | null
  waiting: Waiting[]
  answering: boolean
  onAnswer: (approval: Approval, decision: string) => void
}) {
  const t = useTranslations('work')
  const tc = useTranslations('conversation')
  switch (entry.kind) {
    case 'user':
      return (
        <div className="bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
          {entry.text}
        </div>
      )
    case 'model':
      return <Markdown>{entry.text}</Markdown>
    case 'phase':
      return <Phase entry={entry} />
    case 'change':
      return (
        <div className="rounded-lg border px-1.5 py-1">
          {entry.step.files.map((file) => (
            <ChangeLine
              key={file.path}
              file={file}
              path={relativeTo(directory, file.path)}
              running={entry.step.running}
              failed={entry.step.failed}
            />
          ))}
        </div>
      )
    case 'approval':
      return (
        <ApprovalCard
          approval={entry.approval}
          waiting={waiting.find((each) => each.id === entry.approval.id)}
          answering={answering}
          onAnswer={onAnswer}
        />
      )
    case 'missing':
      return <MissingDataCard code={entry.code} dataset={entry.dataset} />
    case 'handover':
      return (
        <div className="space-y-2">
          <Marker variant="separator">
            <MarkerContent>{t(`handover.${entry.what}`)}</MarkerContent>
          </Marker>
          {entry.what === 'given' ? (
            <p className="text-muted-foreground text-center text-[13px]">{t('handover.inside')}</p>
          ) : null}
        </div>
      )
    case 'notice':
      return (
        <Marker className={entry.what === 'failed' ? 'text-destructive' : undefined}>
          <MarkerContent>{tc(entry.what === 'stopped' ? 'stopped' : 'failed')}</MarkerContent>
        </Marker>
      )
  }
}
