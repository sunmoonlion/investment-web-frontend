'use client'

import {
  ChevronRightIcon,
  DatabaseIcon,
  FilePenIcon,
  FileTextIcon,
  LoaderIcon,
  TerminalIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { ChangedFile, CommandStep, DataStep } from '@/lib/workbench/items'
import { cn } from '@/lib/utils'

function Detail({ blocks }: { blocks: string[] }) {
  return (
    <div className="mt-1 mb-2 ml-7 space-y-1.5">
      {blocks.filter(Boolean).map((block, index) => (
        <pre
          key={index}
          className="bg-muted max-h-64 overflow-auto rounded-md p-2 font-mono text-xs leading-5 whitespace-pre-wrap"
        >
          {block}
        </pre>
      ))}
    </div>
  )
}

// 一次查数据、一条命令：折成一行，点开看细节
export function StepLine({ step }: { step: DataStep | CommandStep }) {
  const t = useTranslations('conversation')
  const [open, setOpen] = useState(false)
  const Icon = step.kind === 'data' ? DatabaseIcon : step.reading ? FileTextIcon : TerminalIcon
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
        {step.kind === 'file' && !step.reading && step.exitCode !== null ? (
          <span
            className={cn('shrink-0', step.failed ? 'text-destructive' : 'text-muted-foreground')}
          >
            {t('step.exit', { code: step.exitCode })}
          </span>
        ) : step.failed ? (
          <span className="text-destructive shrink-0">{t('step.failed')}</span>
        ) : null}
        <ChevronRightIcon
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open ? (
        <Detail
          blocks={step.kind === 'data' ? [step.query, step.result] : [step.command, step.output]}
        />
      ) : null}
    </div>
  )
}

export function DiffBlock({ diff }: { diff: string }) {
  return (
    <pre className="bg-muted max-h-72 overflow-auto rounded-md p-2 font-mono text-xs leading-5">
      {diff.split('\n').map((line, index) => (
        <span
          key={index}
          className={cn(
            'block whitespace-pre-wrap',
            line.startsWith('+') && 'text-green-700 dark:text-green-400',
            line.startsWith('-') && 'text-red-700 dark:text-red-400',
            line.startsWith('@@') && 'text-muted-foreground',
          )}
        >
          {line || ' '}
        </span>
      ))}
    </pre>
  )
}

// 改了一个文件：哪个文件、增删几行，点开看改了什么
export function ChangeLine({
  file,
  path,
  running = false,
  failed = false,
}: {
  file: ChangedFile
  path: string
  running?: boolean
  failed?: boolean
}) {
  const t = useTranslations('conversation')
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[13px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left"
      >
        {running ? (
          <LoaderIcon className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <FilePenIcon className="size-3.5 shrink-0" />
        )}
        <span className="text-muted-foreground shrink-0">{t(`step.change.${file.how}`)}</span>
        <span className="min-w-0 flex-1 truncate font-mono">{path}</span>
        {failed ? (
          <span className="text-destructive shrink-0">{t('step.change.failed')}</span>
        ) : (
          <span className="shrink-0 font-mono tabular-nums">
            <span className="text-green-700 dark:text-green-400">+{file.added}</span>{' '}
            <span className="text-red-700 dark:text-red-400">−{file.removed}</span>
          </span>
        )}
        <ChevronRightIcon
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open ? (
        <div className="mt-1 mb-2 ml-7">
          <DiffBlock diff={file.diff} />
        </div>
      ) : null}
    </div>
  )
}
