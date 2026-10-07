'use client'

import { useTranslations } from 'next-intl'

import { ResultsPanel, type ResultsStatus } from '@/components/workbench/results-panel'
import { useAutoOpen } from '@/lib/workbench/use-auto-open'

import { byFile, type Timeline } from '../model/timeline'

// 工作页右边的结果边栏：改了哪些文件。做完那一刻自动展开。
export function WorkResults({
  line,
  live: stream,
  children,
}: {
  line: Timeline
  live: boolean
  children: React.ReactNode
}) {
  const t = useTranslations('results')
  const files = byFile(line.changes)
  const status: ResultsStatus =
    line.live !== null
      ? 'running'
      : line.last === 'completed'
        ? 'done'
        : line.last === 'stopped'
          ? 'stopped'
          : line.last === 'failed'
            ? 'failed'
            : 'idle'
  const [open, setOpen] = useAutoOpen(line.live === null && line.last === 'completed', stream)
  return (
    <ResultsPanel
      summary={files.length ? t('work.summary', { count: files.length }) : null}
      status={status}
      open={open}
      onOpenChange={setOpen}
    >
      {children}
    </ResultsPanel>
  )
}
