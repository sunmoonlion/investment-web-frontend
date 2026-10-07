'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { DiffBlock } from '@/components/workbench/step-line'
import { relativeTo } from '@/lib/workbench/items'

import type { FileChanges } from '../model/timeline'

// 结果边栏里的「改动」：这段对话改了哪些文件、改了什么。
export function ChangesPanel({
  files,
  directory,
}: {
  files: FileChanges[]
  directory: string | null
}) {
  const t = useTranslations('work')
  const tc = useTranslations('conversation')
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section aria-label={t('changes.title')}>
      <h2 className="flex items-baseline gap-2 text-sm font-medium">
        {t('changes.title')}
        {files.length > 0 ? (
          <span className="text-muted-foreground text-xs font-normal">
            {t('changes.files', { count: files.length })}
          </span>
        ) : null}
      </h2>
      {files.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-[13px]">{t('changes.none')}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={file.path} className="text-[13px]">
              <button
                type="button"
                aria-expanded={open === file.path}
                onClick={() => setOpen(open === file.path ? null : file.path)}
                title={open === file.path ? t('changes.hide') : t('changes.show')}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left"
              >
                <span className="text-muted-foreground shrink-0">
                  {tc(`step.change.${file.how}`)}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">
                  {relativeTo(directory, file.path)}
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  <span className="text-green-700 dark:text-green-400">+{file.added}</span>{' '}
                  <span className="text-red-700 dark:text-red-400">−{file.removed}</span>
                </span>
              </button>
              {open === file.path ? (
                <div className="mt-1 space-y-1.5">
                  {file.diffs.map((diff, index) => (
                    <DiffBlock key={index} diff={diff} />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground mt-4 border-t pt-3 text-xs leading-5">
        {t('changes.note')}
      </p>
    </section>
  )
}
