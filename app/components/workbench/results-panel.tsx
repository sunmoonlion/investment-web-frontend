'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ResultsStatus = 'idle' | 'running' | 'done' | 'stopped' | 'failed'

// 结果边栏（所有者 2026-10-07 定）：聊天、工作、专家三页右侧同一个。
// 平时折叠成竖着的一条：名字、状态点、一句摘要；点开是整份结果。做完那一刻由页面自动展开一次。
// 这里只管开合与外壳，里面放什么由各页决定；归入知识库的那一行也在这里。
export function ResultsPanel({
  summary,
  status,
  open,
  onOpenChange,
  filed,
  children,
}: {
  // 折叠时也看得见的一句话：回答的第一行、改了几个文件……
  summary: string | null
  status: ResultsStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  // 归入知识库了：给资料的地址；没有地址就只说一句
  filed?: { href: string | null } | null
  children: React.ReactNode
}) {
  const t = useTranslations('results')
  const dot = cn(
    'inline-block size-2 shrink-0 rounded-full',
    status === 'running' && 'animate-pulse bg-amber-500',
    status === 'done' && 'bg-green-600',
    status === 'stopped' && 'bg-amber-600',
    status === 'failed' && 'bg-destructive',
    status === 'idle' && 'bg-muted-foreground/40',
  )
  if (!open) {
    return (
      <aside
        aria-label={t('title')}
        data-state="collapsed"
        className="hidden w-10 shrink-0 flex-col items-center border-l py-2 lg:flex"
      >
        <button
          type="button"
          aria-expanded={false}
          onClick={() => onOpenChange(true)}
          title={summary ?? t('open')}
          className="hover:bg-muted flex flex-col items-center gap-2 rounded-md px-1 py-2"
        >
          <ChevronLeftIcon className="size-4" />
          <span className={dot} aria-label={t(`status.${status}`)} />
          <span className="text-muted-foreground text-xs [writing-mode:vertical-rl]">
            {t('title')}
          </span>
        </button>
      </aside>
    )
  }
  return (
    <aside
      aria-label={t('title')}
      data-state="open"
      className="hidden w-96 shrink-0 flex-col border-l lg:flex"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className={dot} aria-label={t(`status.${status}`)} />
        <h2 className="text-sm font-medium">{t('title')}</h2>
        {summary ? (
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
            {summary}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('close')}
          aria-expanded
          onClick={() => onOpenChange(false)}
        >
          <ChevronRightIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[13px]">{children}</div>
      {filed ? (
        <footer className="text-muted-foreground shrink-0 border-t px-4 py-2 text-xs">
          {filed.href ? (
            <Link href={filed.href} className="underline underline-offset-3">
              {t('filed')}
            </Link>
          ) : (
            t('filed')
          )}
        </footer>
      ) : null}
    </aside>
  )
}
