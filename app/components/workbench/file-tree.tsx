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
import {
  baseName,
  childPath,
  pathsToExpand,
  sortEntries,
  treeRoots,
  type TreeRoot,
} from '@/lib/workbench/file-tree'
import { localProblemCode, type LocalAgent } from '@/lib/workbench/local-agent'
import { useLocalAgent, useLocalDirectory } from '@/lib/workbench/queries'
import { cn } from '@/lib/utils'

// 右边栏「文件」（0017 §五、0022 乙案）：根是那台电脑的白名单目录加本地知识库目录，当前项目默认展开，
// 目录点开才去读——浏览器直接问本机 127.0.0.1 上的代理，文件不经云端。只读。
// 这台电脑上没代理 / 接的是别的账号 / 没配对 时各说一句，不装作空。
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
  const link = useLocalAgent(environment)
  if (environment === null) {
    return <p className="text-muted-foreground leading-6">{t('files.noComputer')}</p>
  }
  if (link.isPending) {
    return (
      <p className="text-muted-foreground flex items-center gap-2">
        <LoaderIcon className="size-3.5 animate-spin" />
        {t('files.loading')}
      </p>
    )
  }
  if (link.isError) {
    return <ServiceProblem error={link.error} />
  }
  const roots = treeRoots(link.data.info, directory)
  if (roots.length === 0) {
    return <p className="text-muted-foreground leading-6">{t('files.noRoots')}</p>
  }
  return (
    <ul className="space-y-1" role="tree" aria-label={t('panel.files')}>
      {roots.map((root) => (
        <RootNode
          key={root.path}
          agent={link.data}
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
  const code = localProblemCode(error)
  const known = [
    'no_agent_here',
    'other_account',
    'agent_offline',
    'agent_service_unconfigured',
    'ticket_invalid',
    'keys_unavailable',
    'rate_limited',
  ]
  return (
    <p role="alert" className="text-muted-foreground leading-6">
      {t(`files.problem.${known.includes(code) ? code : 'other'}`)}
    </p>
  )
}

function RootNode({
  agent,
  root,
  expand,
  selected,
  onSelect,
}: {
  agent: LocalAgent
  root: TreeRoot
  expand: string[]
  selected: string | null
  onSelect: (path: string) => void
}) {
  const t = useTranslations('work')
  return (
    <li>
      <DirNode
        agent={agent}
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
  agent,
  path,
  label,
  initiallyOpen,
  expand,
  selected,
  onSelect,
  depth,
}: {
  agent: LocalAgent
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
  const listing = useLocalDirectory(agent, open ? path : null)
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
                agent={agent}
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
  agent,
  parent,
  entry,
  expand,
  selected,
  onSelect,
  depth,
}: {
  agent: LocalAgent
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
          agent={agent}
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
