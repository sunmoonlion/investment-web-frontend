'use client'

import {
  ArrowUpRightIcon,
  FolderIcon,
  MessageSquareIcon,
  PlusIcon,
  SettingsIcon,
  WrenchIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { LogoutButton } from '@/components/auth/logout-button'
import { CrossAppLink } from '@/components/common/cross-app-link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkbench } from '@/lib/workbench/context'
import {
  useConversations,
  useMachines,
  usePending,
  useProjects,
  useWorkspaces,
} from '@/lib/workbench/queries'
import { isBuilt, MODES, routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import {
  defaultWorkspace,
  FOOT,
  footHref,
  machineLight,
  modeOf,
  projectsIn,
  recent,
  workspaceKey,
} from '../model/nav'
import { useWorkspaceChoice } from '../model/workspace-choice'

const row = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] leading-5'
const rowLink = 'hover:bg-foreground/5'
const rowActive = 'bg-foreground/[0.07] font-medium'
const heading = 'text-muted-foreground px-2 pb-1 text-xs font-medium'

// 还没做的页：显示出来，但不是链接
function Destination({
  href,
  active = false,
  className,
  children,
}: {
  href: string | null
  active?: boolean
  className?: string
  children: React.ReactNode
}) {
  const t = useTranslations('shell')
  if (href === null) {
    return (
      <span
        aria-disabled="true"
        title={t('notBuilt')}
        className={cn(row, 'text-muted-foreground cursor-default', className)}
      >
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(row, rowLink, active && rowActive, className)}
    >
      {children}
    </Link>
  )
}

export function Sidebar() {
  const t = useTranslations('shell')
  const tAuth = useTranslations('auth')
  const { csrfToken, locale } = useWorkbench()
  const pathname = usePathname()
  const search = useSearchParams().toString()

  const workspaces = useWorkspaces()
  const projects = useProjects()
  const conversations = useConversations()
  const pending = usePending()
  const machines = useMachines()

  const { chosen, restore, choose } = useWorkspaceChoice()
  useEffect(restore, [restore])

  const allWorkspaces = workspaces.data ?? []
  const allProjects = projects.data ?? []
  const workspace =
    allWorkspaces.find((w) => workspaceKey(w) === chosen) ??
    defaultWorkspace(allWorkspaces, allProjects)
  const here = (conversations.data ?? []).find((c) => pathname.includes(c.id))
  const mode = modeOf(pathname, search, here)
  const light = machineLight(machines.data ?? [])
  const waiting = pending.data?.length ?? 0

  return (
    <aside
      aria-label={t('brand')}
      className="bg-muted/40 flex h-full w-60 shrink-0 flex-col gap-4 border-r p-3"
    >
      <Link href={routes.home(locale)} className="px-2 pt-1 text-sm font-semibold">
        {t('brand')}
      </Link>

      <nav
        aria-label={t('modes')}
        className="bg-muted grid grid-cols-3 gap-0.5 rounded-lg border p-0.5"
      >
        {MODES.map((each) => (
          <Link
            key={each}
            href={each === 'expert' ? routes.expert(locale) : routes.home(locale, each)}
            aria-current={mode === each ? 'true' : undefined}
            className={cn(
              'rounded-md py-1 text-center text-[13px]',
              mode === each
                ? 'bg-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`mode.${each}`)}
          </Link>
        ))}
      </nav>

      <Link
        href={routes.home(locale, mode)}
        className={cn(row, 'bg-background justify-center border font-medium', rowLink)}
      >
        <PlusIcon className="size-3.5" />
        {t('new')}
      </Link>

      {/* 中间这一段自己滚：项目和对话再多，底部的条目也一直看得见 */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
        <section aria-label={t('workspace')}>
          <h2 className={cn(heading, 'flex items-center')}>
            {t('workspace')}
            <Link
              href={routes.projects(locale)}
              className="hover:text-foreground ml-auto font-normal underline-offset-3 hover:underline"
            >
              {t('allProjects')}
            </Link>
          </h2>
          {allWorkspaces.length === 0 ? (
            <p className="text-muted-foreground px-2 text-xs">
              {workspaces.isPending ? t('loading') : t('noWorkspace')}
            </p>
          ) : (
            <>
              <Select
                value={workspace ? workspaceKey(workspace) : null}
                onValueChange={(key) => key && choose(String(key))}
              >
                <SelectTrigger
                  size="sm"
                  className="bg-background mb-1 w-full"
                  aria-label={t('workspace')}
                >
                  <SelectValue>
                    {workspace ? (
                      <span className="truncate">
                        {workspace.environment_name}
                        <span className="text-muted-foreground"> · {workspace.root}</span>
                      </span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allWorkspaces.map((each) => (
                    <SelectItem key={workspaceKey(each)} value={workspaceKey(each)}>
                      {each.environment_name} · {each.root}
                      {each.online ? '' : `（${t('offline')}）`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ul>
                {projectsIn(allProjects, workspace).map((project) => (
                  <li key={project.id}>
                    <Destination
                      href={isBuilt('project') ? routes.project(locale, project.id) : null}
                      active={pathname.includes(project.id)}
                    >
                      <FolderIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{project.title}</span>
                    </Destination>
                  </li>
                ))}
                {projects.data && projectsIn(allProjects, workspace).length === 0 ? (
                  <li className="text-muted-foreground px-2 py-1 text-xs">{t('noProjects')}</li>
                ) : null}
              </ul>
            </>
          )}
        </section>

        <section aria-label={t('recent')}>
          <h2 className={heading}>{t('recent')}</h2>
          <ul>
            {recent(conversations.data ?? [], allProjects, locale).map((item) => (
              <li key={item.id}>
                <Destination href={item.href} active={pathname.includes(item.id)}>
                  {item.kind === 'chat' ? (
                    <MessageSquareIcon className="size-3.5 shrink-0" aria-label={t('mode.chat')} />
                  ) : (
                    <WrenchIcon className="size-3.5 shrink-0" aria-label={t('mode.work')} />
                  )}
                  <span className="truncate">{item.title ?? t('untitled')}</span>
                  {item.busy ? (
                    <span
                      className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-500"
                      title={t('busy')}
                    />
                  ) : null}
                </Destination>
              </li>
            ))}
            {conversations.data?.length === 0 ? (
              <li className="text-muted-foreground px-2 py-1 text-xs">{t('noRecent')}</li>
            ) : null}
          </ul>
        </section>
      </div>

      <nav aria-label={t('more')} className="shrink-0 border-t pt-3">
        {FOOT.map((entry) => {
          if (entry.kind === 'elsewhere') {
            return (
              <CrossAppLink
                key={entry.key}
                to={entry.to}
                className={cn(row, rowLink)}
                fallback={
                  <span className={cn(row, 'text-muted-foreground')}>{t(`foot.${entry.key}`)}</span>
                }
              >
                {t(`foot.${entry.key}`)}
                <ArrowUpRightIcon className="text-muted-foreground ml-auto size-3.5" />
              </CrossAppLink>
            )
          }
          const href = footHref(entry, locale)
          return (
            <Destination
              key={entry.key}
              href={href}
              active={href === pathname && entry.key !== 'pending'}
            >
              {entry.key === 'machines' ? (
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    light === 'online' && 'bg-green-600',
                    light === 'offline' && 'bg-amber-500',
                    light === 'none' && 'bg-muted-foreground/40',
                  )}
                  title={t(`machine.${light}`)}
                />
              ) : null}
              {entry.key === 'settings' ? <SettingsIcon className="size-3.5 shrink-0" /> : null}
              {t(`foot.${entry.key}`)}
              {entry.key === 'pending' && waiting > 0 ? (
                <span className="bg-foreground text-background ml-auto rounded-full px-1.5 text-xs">
                  {waiting}
                </span>
              ) : null}
            </Destination>
          )
        })}
        <div className="mt-2 px-2">
          <LogoutButton
            csrfToken={csrfToken}
            locale={locale}
            label={tAuth('logout')}
            errorLabel={tAuth('logoutFailed')}
          />
        </div>
      </nav>
    </aside>
  )
}
