'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilesIcon,
  GitCompareIcon,
  TerminalIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { FileChanges } from '@/lib/workbench/timeline'
import { ChangesPanel } from './changes-panel'
import { FileTree, ServiceProblem } from './file-tree'
import { FileView } from './file-view'
import { useLocalAgent } from '@/lib/workbench/queries'

export type SideTab = 'files' | 'changes' | 'terminal'

// 工作页与专家页同一个右边栏（0017 §五、0015 §3.2）：文件 / 改动 / 终端 三个钮，一次只开一个。
// 「改动」= 这段对话用补丁改的文件；本次打开页面后第一次出现改动时自动弹开一次，之后不抢焦点。
// 「文件」= 那台电脑上的文件树（0022，经代理服务流），当前项目默认展开，点文件看内容；没有电脑就说明。
// 「终端」要等本地代理开终端通道（账 83），先占位说明。
export function WorkSidePanel({
  files,
  directory,
  live,
  environment = null,
}: {
  files: FileChanges[]
  directory: string | null
  live: boolean
  // 这段对话在哪台电脑上（环境 id）；专家页暂不传
  environment?: string | null
}) {
  const t = useTranslations('work')
  const tr = useTranslations('results')
  const [tab, setTab] = useState<SideTab | null>(null)
  const [opened, setOpened] = useState<string | null>(null)
  // 页面刚打开时装进来的历史改动不算「出现」：接上实时流再过一会儿才开始数
  const [armed, setArmed] = useState(false)
  const [sawChanges, setSawChanges] = useState(false)
  useEffect(() => {
    if (!live) return
    const timer = setTimeout(() => setArmed(true), 1500)
    return () => clearTimeout(timer)
  }, [live])
  // 渲染中推导：数起来之后第一次从「没有改动」变成「有改动」，弹开「改动」；之后不再抢焦点
  if (armed && !sawChanges) {
    if (files.length > 0) {
      setSawChanges(true)
      if (tab === null) setTab('changes')
    }
  }
  const tabs: { key: SideTab; icon: React.ReactNode }[] = [
    { key: 'files', icon: <FilesIcon className="size-4" /> },
    { key: 'changes', icon: <GitCompareIcon className="size-4" /> },
    { key: 'terminal', icon: <TerminalIcon className="size-4" /> },
  ]
  if (tab === null) {
    return (
      <aside
        aria-label={tr('title')}
        data-state="collapsed"
        className="hidden w-10 shrink-0 flex-col items-center gap-1 border-l py-2 lg:flex"
      >
        <ChevronLeftIcon className="text-muted-foreground size-3.5" />
        {tabs.map((each) => (
          <button
            key={each.key}
            type="button"
            aria-label={t(`panel.${each.key}`)}
            title={
              each.key === 'changes' && files.length
                ? t('changes.files', { count: files.length })
                : t(`panel.${each.key}`)
            }
            onClick={() => setTab(each.key)}
            className="hover:bg-muted text-muted-foreground hover:text-foreground relative rounded-md p-2"
          >
            {each.icon}
            {each.key === 'changes' && files.length ? (
              <span className="bg-foreground text-background absolute -top-0.5 -right-0.5 rounded-full px-1 text-[10px] leading-4">
                {files.length}
              </span>
            ) : null}
          </button>
        ))}
      </aside>
    )
  }
  return (
    <aside
      aria-label={tr('title')}
      data-state="open"
      className="hidden w-96 shrink-0 flex-col border-l lg:flex"
    >
      <header className="flex h-10 shrink-0 items-center gap-1 border-b px-2">
        {tabs.map((each) => (
          <button
            key={each.key}
            type="button"
            aria-pressed={tab === each.key}
            onClick={() => setTab(each.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]',
              tab === each.key
                ? 'bg-muted font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {each.icon}
            {t(`panel.${each.key}`)}
            {each.key === 'changes' && files.length ? (
              <span className="text-muted-foreground text-xs">{files.length}</span>
            ) : null}
          </button>
        ))}
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={tr('close')}
          aria-expanded
          onClick={() => setTab(null)}
        >
          <ChevronRightIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[13px]">
        {tab === 'changes' ? (
          <ChangesPanel files={files} directory={directory} />
        ) : tab === 'files' ? (
          opened && environment ? (
            <OpenedFile environment={environment} path={opened} onBack={() => setOpened(null)} />
          ) : (
            <section aria-label={t('panel.files')}>
              <FileTree
                environment={environment}
                directory={directory}
                selected={opened}
                onSelect={setOpened}
              />
            </section>
          )
        ) : (
          <section aria-label={t(`panel.${tab}`)}>
            <h2 className="text-sm font-medium">{t(`panel.${tab}`)}</h2>
            <p className="text-muted-foreground mt-2 leading-6">{t(`panel.${tab}Soon`)}</p>
          </section>
        )}
      </div>
    </aside>
  )
}

// 看文件要先有那台电脑的连接（探口 + 票）；树已经连过，这里从缓存里拿同一份
function OpenedFile({
  environment,
  path,
  onBack,
}: {
  environment: string
  path: string
  onBack: () => void
}) {
  const link = useLocalAgent(environment)
  if (!link.data) return link.error ? <ServiceProblem error={link.error} /> : null
  return <FileView agent={link.data} path={path} onBack={onBack} />
}
