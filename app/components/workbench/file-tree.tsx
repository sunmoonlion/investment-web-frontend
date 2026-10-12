'use client'

import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  LoaderIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { DirectoryEntry } from '@/contracts/workbench-v2'
import { WorkbenchError } from '@/lib/workbench/http'
import {
  baseName,
  childPath,
  pathsToExpand,
  sortEntries,
  treeRoots,
  type TreeRoot,
} from '@/lib/workbench/file-tree'
import { useAgentService, useDirectory } from '@/lib/workbench/queries'
import { cn } from '@/lib/utils'

// 右边栏「文件」（0017 §五、0022）：根是那台电脑的白名单目录加本地知识库目录，当前项目默认展开，
// 目录点开才去读（经工作台 → 会合点 → 代理）。只读。代理离线 / 版本旧 / 通道没配时各说一句，不装作空。
export function FileTree({
  environment,
  directory,
  selected,
  onSelect,
}: {
  environment: string | null
  directory: string | null
  selected: string | null
  onSelect: (path: string) => void
}) {
  const t = useTranslations('work')
  const info = useAgentService(environment)
  if (environment === null) {
    return <p className="text-muted-foreground leading-6">{t('files.noComputer')}</p>
  }
  if (info.isPending) {
    return (
      <p className="text-muted-foreground flex items-center gap-2">
        <LoaderIcon className="size-3.5 animate-spin" />
        {t('files.loading')}
      </p>
    )
  }
  if (info.isError) {
    return <ServiceProblem error={info.error} />
  }
  const roots = treeRoots(info.data, directory)
  if (roots.length === 0) {
    return <p className="text-muted-foreground leading-6">{t('files.noRoots')}</p>
  }
  return (
    <ul className="space-y-1" role="tree" aria-label={t('panel.files')}>
      {roots.map((root) => (
        <RootNode
          key={root.path}
          environment={environment}
          root={root}
          expand={pathsToExpand(root.path, directory)}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

export function ServiceProblem({ error }: { error: unknown }) {
  const t = useTranslations('work')
  const code = error instanceof WorkbenchError ? error.code : 'other'
  const known = ['agent_offline', 'agent_outdated', 'agent_service_unconfigured', 'agent_busy']
  return (
    <p role="alert" className="text-muted-foreground leading-6">
      {t(`files.problem.${known.includes(code) ? code : 'other'}`)}
    </p>
  )
}

function RootNode({
  environment,
  root,
  expand,
  selected,
  onSelect,
}: {
  environment: string
  root: TreeRoot
  expand: string[]
  selected: string | null
  onSelect: (path: string) => void
}) {
  const t = useTranslations('work')
  return (
    <li>
      <DirNode
        environment={environment}
        path={root.path}
        label={
          <span className="flex min-w-0 items-center gap-1.5">
            {root.kind === 'library' ? (
              <BookOpenIcon className="size-3.5 shrink-0" />
            ) : (
              <FolderIcon className="size-3.5 shrink-0" />
            )}
            <span className="truncate font-medium" title={root.path}>
              {root.kind === 'library' ? t('files.library') : root.path}
            </span>
          </span>
        }
        initiallyOpen={root.kind === 'workspace'}
        expand={expand}
        selected={selected}
        onSelect={onSelect}
        depth={0}
      />
    </li>
  )
}

function DirNode({
  environment,
  path,
  label,
  initiallyOpen,
  expand,
  selected,
  onSelect,
  depth,
}: {
  environment: string
  path: string
  label: React.ReactNode
  initiallyOpen: boolean
  expand: string[]
  selected: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const t = useTranslations('work')
  const [open, setOpen] = useState(initiallyOpen)
  const listing = useDirectory(environment, open ? path : null)
  const entries = listing.data ? sortEntries(listing.data.entries) : []
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="hover:bg-muted/60 flex w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left"
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {open ? (
          <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0" />
        )}
        {label}
      </button>
      {open ? (
        listing.isPending ? (
          <p
            className="text-muted-foreground flex items-center gap-2 py-0.5"
            style={{ paddingLeft: depth * 12 + 24 }}
          >
            <LoaderIcon className="size-3 animate-spin" />
            {t('files.loading')}
          </p>
        ) : listing.isError ? (
          <div style={{ paddingLeft: depth * 12 + 24 }}>
            <ServiceProblem error={listing.error} />
          </div>
        ) : (
          <ul role="group">
            {entries.map((entry) => (
              <EntryNode
                key={entry.name}
                environment={environment}
                parent={path}
                entry={entry}
                expand={expand}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
            {listing.data.truncated ? (
              <li
                className="text-muted-foreground py-0.5 text-xs"
                style={{ paddingLeft: depth * 12 + 24 }}
              >
                {t('files.truncated')}
              </li>
            ) : null}
            {entries.length === 0 && !listing.data.truncated ? (
              <li
                className="text-muted-foreground py-0.5 text-xs"
                style={{ paddingLeft: depth * 12 + 24 }}
              >
                {t('files.empty')}
              </li>
            ) : null}
          </ul>
        )
      ) : null}
    </div>
  )
}

function EntryNode({
  environment,
  parent,
  entry,
  expand,
  selected,
  onSelect,
  depth,
}: {
  environment: string
  parent: string
  entry: DirectoryEntry
  expand: string[]
  selected: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const path = childPath(parent, entry.name)
  if (entry.type === 'dir') {
    return (
      <li>
        <DirNode
          environment={environment}
          path={path}
          label={
            <span className="flex min-w-0 items-center gap-1.5">
              <FolderIcon className="size-3.5 shrink-0" />
              <span className="truncate">{entry.name}</span>
            </span>
          }
          initiallyOpen={expand.some((each) => each.toLowerCase() === path.toLowerCase())}
          expand={expand}
          selected={selected}
          onSelect={onSelect}
          depth={depth}
        />
      </li>
    )
  }
  const active = selected !== null && selected.toLowerCase() === path.toLowerCase()
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        disabled={entry.type !== 'file'}
        onClick={() => onSelect(path)}
        className={cn(
          'hover:bg-muted/60 flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left disabled:opacity-60',
          active && 'bg-muted font-medium',
        )}
        style={{ paddingLeft: depth * 12 + 22 }}
        title={path}
      >
        <FileIcon className="size-3.5 shrink-0" />
        <span className="truncate">{entry.name || baseName(path)}</span>
      </button>
    </li>
  )
}
