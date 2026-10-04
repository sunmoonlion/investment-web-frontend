'use client'

import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  DatabaseIcon,
  FileTextIcon,
  LoaderIcon,
  TerminalIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { Markdown } from '@/components/common/markdown'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Marker, MarkerContent } from '@/components/ui/marker'
import { Message, MessageContent } from '@/components/ui/message'
import { cn } from '@/lib/utils'

import { tally, type Step, type TurnView } from '../model/thread'

function StepLine({ step }: { step: Step }) {
  const t = useTranslations('chat')
  const [open, setOpen] = useState(false)
  if (step.kind === 'said') {
    return <p className="text-muted-foreground text-[13px] leading-6">{step.text}</p>
  }
  const Icon = step.kind === 'data' ? DatabaseIcon : step.reading ? FileTextIcon : TerminalIcon
  const detail = step.kind === 'data' ? [step.query, step.result] : [step.command, step.output]
  return (
    <div className="text-[13px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left"
      >
        {step.running ? (
          <LoaderIcon className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <Icon className="size-3.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">
          {step.kind === 'data' ? (
            <>
              {t('step.data', { tool: step.tool })}
              {step.dataset ? <span className="font-mono"> · {step.dataset}</span> : null}
              {step.version ? (
                <span className="text-muted-foreground font-mono">
                  {' '}
                  · {t('step.version', { version: step.version.slice(-8) })}
                </span>
              ) : null}
            </>
          ) : step.reading ? (
            t('step.read', { name: step.label })
          ) : (
            <span className="font-mono">{step.label}</span>
          )}
        </span>
        {step.failed ? <span className="text-destructive shrink-0">{t('step.failed')}</span> : null}
        <ChevronRightIcon
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open ? (
        <div className="mt-1 mb-2 ml-7 space-y-1.5">
          {detail.filter(Boolean).map((block, index) => (
            <pre
              key={index}
              className="bg-muted max-h-64 overflow-auto rounded-md p-2 font-mono text-xs leading-5 whitespace-pre-wrap"
            >
              {block}
            </pre>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// 过程：默认收成一行，点开才看细节。还在跑的时候这一行说的是它这会儿在干什么。
function Process({ turn }: { turn: TurnView }) {
  const t = useTranslations('chat')
  const [open, setOpen] = useState(false)
  const counted = tally(turn.steps)
  const parts = [
    counted.data ? t('tally.data', { count: counted.data }) : null,
    counted.files ? t('tally.files', { count: counted.files }) : null,
    counted.commands ? t('tally.commands', { count: counted.commands }) : null,
  ].filter(Boolean)
  const busy = turn.activity !== null
  if (!busy && turn.steps.length === 0) return null
  const expandable = turn.steps.length > 0
  return (
    <div className="w-full">
      <button
        type="button"
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        onClick={() => setOpen(!open)}
        className={cn(
          'text-muted-foreground flex items-center gap-2 rounded-md py-1 text-[13px]',
          expandable && 'hover:text-foreground',
        )}
      >
        {busy ? <LoaderIcon className="size-3.5 animate-spin" /> : null}
        <span>
          {busy ? t(`activity.${turn.activity}`) : parts.join(' · ') || t('tally.said')}
          {busy && parts.length ? ` · ${parts.join(' · ')}` : ''}
          {counted.failed ? ` · ${t('tally.failed', { count: counted.failed })}` : ''}
        </span>
        {expandable ? (
          <ChevronRightIcon className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        ) : null}
      </button>
      {open ? (
        <div className="mt-1 space-y-0.5 border-l pl-3">
          {turn.steps.map((step) => (
            <StepLine key={`${step.kind}:${step.id}`} step={step} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MissingDataCard({ code, dataset }: { code: string; dataset: string | null }) {
  const t = useTranslations('chat')
  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium">{t('missing.title', { code })}</p>
      <p className="text-muted-foreground mt-1 text-[13px]">
        {t('missing.body')}
        {dataset ? <span className="font-mono"> {dataset}</span> : null}
      </p>
      <CrossAppLink
        to="info.request"
        values={{ code }}
        className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-3"
        fallback={<p className="text-muted-foreground mt-2 text-[13px]">{t('missing.noLink')}</p>}
      >
        {t('missing.request')}
        <ArrowUpRightIcon className="size-3.5" />
      </CrossAppLink>
    </div>
  )
}

export function Turn({ turn }: { turn: TurnView }) {
  const t = useTranslations('chat')
  return (
    <div className="flex flex-col gap-3" data-turn-status={turn.status}>
      <Message align="end">
        <MessageContent>
          <Bubble variant="secondary" align="end">
            <BubbleContent className="whitespace-pre-wrap">{turn.text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent>
          <Process turn={turn} />
          {turn.missing.map((missing) => (
            <MissingDataCard key={missing.code} {...missing} />
          ))}
          {turn.answer ? <Markdown>{turn.answer.text}</Markdown> : null}
          {turn.status === 'interrupted' ? (
            <Marker>
              <MarkerContent>{t('stopped')}</MarkerContent>
            </Marker>
          ) : null}
          {turn.status === 'failed' ? (
            <Marker className="text-destructive">
              <MarkerContent>{t('failed')}</MarkerContent>
            </Marker>
          ) : null}
        </MessageContent>
      </Message>
    </div>
  )
}
