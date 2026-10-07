'use client'

import { ChevronRightIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Markdown } from '@/components/common/markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Dossier, DossierBlock } from '@/contracts/workbench-v2'
import { cn } from '@/lib/utils'

import { useSaveConclusion } from '../api/desk'
import { alsoLine, cell, listOf, pivotOf, sourceLine, tablesOf, type Table } from '../model/dossier'

// 底稿的零件：表、块、我的结论。底稿页和专家页右边的结果边栏都用它们。

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
export function Block({ block, alone }: { block: DossierBlock; alone: boolean }) {
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

// 我的结论：用户自己写的草稿。永远不预填专家的话。
export function Conclusion({ task, saved }: { task: string; saved: Dossier['conclusion'] }) {
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
