'use client'

import { useTranslations } from 'next-intl'

import { Markdown } from '@/components/common/markdown'
import { ResultsPanel, type ResultsStatus } from '@/components/workbench/results-panel'
import { useAutoOpen } from '@/lib/workbench/use-auto-open'

import { lastAnswer, type TurnView } from '../model/thread'

// 聊天页右边的结果边栏：最后一次回答、这段对话查过的数据、没有数据的公司。答完那一刻自动展开。
export function ChatResults({ turns }: { turns: TurnView[] }) {
  const t = useTranslations('results')
  const tc = useTranslations('conversation')
  const live = turns.some((turn) => turn.status === 'queued' || turn.status === 'running')
  const tail = turns[turns.length - 1]
  const status: ResultsStatus = live
    ? 'running'
    : !tail
      ? 'idle'
      : tail.status === 'interrupted'
        ? 'stopped'
        : tail.status === 'failed'
          ? 'failed'
          : 'done'
  const answer = lastAnswer(turns)
  const [open, setOpen] = useAutoOpen(!live && answer !== null)
  const data = turns.flatMap((turn) =>
    turn.steps.flatMap((step) =>
      step.kind === 'data' && !step.failed
        ? [{ id: step.id, tool: step.tool, dataset: step.dataset, version: step.version }]
        : [],
    ),
  )
  const missing = [...new Set(turns.flatMap((turn) => turn.missing.map((each) => each.code)))]
  const firstLine =
    answer
      ?.split('\n')
      .find((line) => line.trim())
      ?.trim() ?? null
  return (
    <ResultsPanel summary={firstLine} status={status} open={open} onOpenChange={setOpen}>
      <section aria-label={t('chat.answer')}>
        <h3 className="mb-2 text-sm font-semibold">{t('chat.answer')}</h3>
        {answer ? (
          <Markdown>{answer}</Markdown>
        ) : (
          <p className="text-muted-foreground">{t('chat.none')}</p>
        )}
      </section>
      <section aria-label={t('chat.data')} className="mt-5 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold">{t('chat.data')}</h3>
        {data.length === 0 ? (
          <p className="text-muted-foreground">{t('chat.noData')}</p>
        ) : (
          <ul className="space-y-1">
            {data.map((each) => (
              <li key={each.id} className="flex flex-wrap gap-x-2">
                <span>{tc('step.data', { tool: each.tool })}</span>
                {each.dataset ? <span className="font-mono">{each.dataset}</span> : null}
                {each.version ? (
                  <span className="text-muted-foreground">
                    {tc('step.version', { version: each.version.slice(-8) })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {missing.length ? (
        <section aria-label={t('chat.missing')} className="mt-5 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold">{t('chat.missing')}</h3>
          <ul className="space-y-1">
            {missing.map((code) => (
              <li key={code} className="font-mono">
                {code}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ResultsPanel>
  )
}
