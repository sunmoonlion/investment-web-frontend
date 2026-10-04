'use client'

import { ChevronRightIcon, DownloadIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Markdown } from '@/components/common/markdown'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Dossier, DossierBlock } from '@/contracts/workbench-v2'
import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { dossierExportHref, useDossier, useSaveConclusion } from '../api/desk'
import { useRunStep } from '../api/run'
import {
  alsoLine,
  cell,
  listOf,
  ordinal,
  pivotOf,
  sourceLine,
  tablesOf,
  type Table,
} from '../model/dossier'
import { MARK } from '../model/run'
import { amountText, StepDetail } from './parts'

const QUESTION = 'workbench.question'

function LongTable({ table }: { table: Table }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="bg-muted/50 text-left">
          {table.columns.map((column) => (
            <th key={column.key} className="px-3 py-1.5 font-medium whitespace-nowrap">
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={index} className="border-t">
            {table.columns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  'px-3 py-1.5 align-top',
                  typeof row[column.key] === 'number' && 'text-right tabular-nums',
                )}
              >
                {cell(row[column.key], row, column.key)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 一张表。能摆成「名称 × 年度」的对照表就这样摆，明细收在下面
function OneTable({ table }: { table: Table }) {
  const t = useTranslations('dossier')
  const [detail, setDetail] = useState(false)
  const pivot = pivotOf(table)
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        {table.title ? (
          <p className="border-b px-3 py-1.5 text-[13px] font-medium">{table.title}</p>
        ) : null}
        {pivot ? (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-1.5 font-medium">{table.columns[0]?.title}</th>
                {pivot.years.map((year) => (
                  <th key={year} className="px-3 py-1.5 text-right font-medium">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pivot.rows.map((row) => (
                <tr key={row.name} className="border-t">
                  <td className="px-3 py-1.5">{row.name}</td>
                  {pivot.years.map((year) => {
                    const found = row.cells[year]
                    return (
                      <td key={year} className="px-3 py-1.5 text-right align-top tabular-nums">
                        {found ? found.text : '—'}
                        {found?.note ? (
                          <span className="text-muted-foreground block text-xs">{found.note}</span>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <LongTable table={table} />
        )}
      </div>
      {pivot ? (
        <div className="mt-1.5">
          <button
            type="button"
            aria-expanded={detail}
            onClick={() => setDetail(!detail)}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-3"
          >
            {detail ? t('hideDetail') : t('showDetail')}
          </button>
          {detail ? (
            <div className="mt-1.5 overflow-x-auto rounded-lg border">
              <LongTable table={table} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function BlockTables({ block }: { block: DossierBlock }) {
  const t = useTranslations('dossier')
  const tables = tablesOf(block)
  if (tables.every((table) => table.rows.length === 0)) {
    return <p className="text-muted-foreground text-[13px]">{t('empty')}</p>
  }
  return (
    <div className="space-y-3">
      {tables.map((table, at) => (
        <OneTable key={at} table={table} />
      ))}
    </div>
  )
}

// 底稿里的一块。折叠的默认收着；没做到的写明没做到，不留空白。
function Block({ block, alone }: { block: DossierBlock; alone: boolean }) {
  const t = useTranslations('dossier')
  const [open, setOpen] = useState(!block.folded)
  const reached = block.status === 'done'
  const source = sourceLine(block.source)
  const rows = tablesOf(block).reduce((sum, table) => sum + table.rows.length, 0)
  const also = Object.entries(block.also).filter(
    ([, value]) => Array.isArray(value) && value.length > 0,
  )
  const body = !reached ? (
    <p className="text-muted-foreground text-[13px]">{block.note ?? t('notReached')}</p>
  ) : block.kind === 'text' ? (
    typeof block.content === 'string' && block.content ? (
      <Markdown>{block.content}</Markdown>
    ) : (
      <p className="text-muted-foreground text-[13px]">{t('empty')}</p>
    )
  ) : block.kind === 'list' ? (
    listOf(block).length ? (
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {listOf(block).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground text-[13px]">{t('empty')}</p>
    )
  ) : block.kind === 'coverage' ? (
    <div className="space-y-1 text-sm">
      <p>{block.summary?.text}</p>
      {typeof block.summary?.coverage === 'string' ? (
        <p className="text-muted-foreground text-[13px]">{block.summary.coverage}</p>
      ) : null}
    </div>
  ) : (
    <div className="space-y-2">
      {block.summary?.text ? <p className="text-sm">{block.summary.text}</p> : null}
      <BlockTables block={block} />
      {also.map(([key, value]) => (
        <ul key={key} className="text-muted-foreground list-disc pl-5 text-[13px]">
          {(value as unknown[]).map((each, index) => (
            <li key={index}>{alsoLine(each)}</li>
          ))}
        </ul>
      ))}
      {source ? <p className="text-muted-foreground text-xs">{t('source', source)}</p> : null}
    </div>
  )
  // 一节里只有一块、又不折叠的：不重复写一遍标题
  if (alone && !block.folded) return body
  return (
    <div>
      {block.folded ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="hover:bg-muted/60 -mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium"
        >
          <ChevronRightIcon className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
          {block.title}
          {reached && rows > 0 ? (
            <span className="text-muted-foreground text-xs font-normal">
              {t('rows', { n: rows })}
            </span>
          ) : null}
        </button>
      ) : (
        <h3 className="mb-1.5 text-sm font-medium">{block.title}</h3>
      )}
      {open ? <div className={block.folded ? 'mt-2' : undefined}>{body}</div> : null}
    </div>
  )
}

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

// 我的结论：用户自己写的草稿。永远不预填专家的话。
function Conclusion({ task, saved }: { task: string; saved: Dossier['conclusion'] }) {
  const t = useTranslations('dossier.conclusion')
  const format = useFormatter()
  const save = useSaveConclusion(task)
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? saved.text
  const dirty = draft !== null && draft !== saved.text
  return (
    <div>
      <Textarea
        rows={5}
        value={text}
        aria-label={t('title')}
        placeholder={t('placeholder')}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-28"
      />
      <div className="mt-2 flex items-center gap-3">
        <p className="text-muted-foreground min-w-0 flex-1 text-[13px]">
          {save.isError
            ? null
            : dirty
              ? t('unsaved')
              : saved.saved_at && saved.version !== null
                ? t('saved', {
                    version: saved.version,
                    at: format.dateTime(new Date(saved.saved_at), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })
                : t('note')}
          {save.isError ? (
            <span role="alert" className="text-destructive">
              {t('failed')}
            </span>
          ) : null}
        </p>
        <Button
          size="sm"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(text, { onSuccess: () => setDraft(null) })}
        >
          {save.isPending ? t('saving') : t('save')}
        </Button>
      </div>
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
