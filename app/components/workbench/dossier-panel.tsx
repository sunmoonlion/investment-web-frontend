'use client'

import { FileTextIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { underDirectory } from '@/lib/workbench/file-tree'
import { useConversationTasks } from '@/lib/workbench/queries'

// 「工作底稿」栏：这段对话每请一次专家，底稿各存一格（所有者 2026-10-14），新的在前。
// 文件在那台电脑的项目目录里，是真源；这里只列位置，点开经本机回环口读，和「文件」栏同一个查看器。
// 没写成的（停下了、没做完）点开会是「找不到」，照实给。
export function DossierPanel({
  conversation,
  directory,
  onOpen,
}: {
  conversation: string | null
  directory: string | null
  onOpen: (path: string) => void
}) {
  const t = useTranslations('work')
  const tasks = useConversationTasks(conversation)
  const runs = (tasks.data ?? []).filter((task) => task.dossier)
  if (!conversation || !directory) {
    return <p className="text-muted-foreground leading-6">{t('dossier.noDirectory')}</p>
  }
  if (tasks.isPending) return <p className="text-muted-foreground">{t('files.loading')}</p>
  if (tasks.isError) return <p className="text-destructive">{t('dossier.failed')}</p>
  if (runs.length === 0) {
    return <p className="text-muted-foreground leading-6">{t('dossier.empty')}</p>
  }
  return (
    <section aria-label={t('panel.dossier')} className="space-y-4">
      <p className="text-muted-foreground text-xs leading-5">{t('dossier.lead')}</p>
      {runs.map((task) => {
        const dossier = task.dossier!
        return (
          <div key={task.id} className="space-y-1">
            <h3 className="flex items-baseline gap-2 font-medium">
              <span>{dossier.expert}</span>
              <span className="text-muted-foreground text-xs font-normal tabular-nums">
                {whenOf(dossier.folder)}
              </span>
              <span className="text-muted-foreground ml-auto text-xs font-normal">
                {t(`dossier.state.${stateOf(task.state)}`)}
              </span>
            </h3>
            <ul>
              {dossier.files.map((file) => (
                <li key={file}>
                  <button
                    type="button"
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1 text-left"
                    title={file}
                    onClick={() => onOpen(underDirectory(directory, file))}
                  >
                    <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">{file.split('/').pop()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

// 格子名里就有开始时间（北京时间）：…/2026-10-14-092623-专家名
export function whenOf(folder: string): string {
  const name = folder.split('/').pop() ?? ''
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(name)
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : ''
}

export function stateOf(state: string): 'done' | 'stopped' | 'failed' | 'running' {
  if (state === 'SUCCEEDED') return 'done'
  if (state === 'CANCELLED') return 'stopped'
  if (state === 'FAILED' || state === 'REJECTED') return 'failed'
  return 'running'
}
