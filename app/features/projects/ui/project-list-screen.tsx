'use client'

import { FolderIcon, PlusIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConnectComputerLink } from '@/components/workbench/connect-computer'
import { useWorkbench } from '@/lib/workbench/context'
import { useAllProjects, useWorkspaces } from '@/lib/workbench/queries'
import { routes } from '@/lib/workbench/routes'

import { byWorkspace } from '../model/projects'
import { NewProjectDialog } from './new-project-dialog'

// 项目列表：按工作区分组。归档的默认不显示。
export function ProjectListScreen() {
  const t = useTranslations('projects.list')
  const format = useFormatter()
  const router = useRouter()
  const { locale } = useWorkbench()
  const [archived, setArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const workspaces = useWorkspaces()
  const projects = useAllProjects(archived)
  const groups = byWorkspace(workspaces.data ?? [], projects.data ?? [])
  const ready = workspaces.data !== undefined && projects.data !== undefined

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        <header className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t('new')}
          </Button>
        </header>

        {!ready ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : groups.length === 0 ? (
          <section className="rounded-xl border p-5">
            <h2 className="text-sm font-semibold">{t('noWorkspace.title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('noWorkspace.lead')}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>
                {t('noWorkspace.sandbox')}{' '}
                <Link href={routes.settings(locale)} className="underline underline-offset-3">
                  →
                </Link>
              </li>
              <li>{t('noWorkspace.agent')}</li>
              <li>{t('noWorkspace.account')}</li>
            </ol>
            <p className="text-muted-foreground mt-3 text-[13px]">{t('noWorkspace.note')}</p>
            <ConnectComputerLink className="mt-3" />
          </section>
        ) : (
          <>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={archived}
                onChange={(event) => setArchived(event.target.checked)}
              />
              {t('showArchived')}
            </label>
            {groups.map((group) => (
              <section
                key={`${group.workspace.environment_id}\n${group.workspace.root}`}
                aria-label={`${group.workspace.environment_name} ${group.workspace.root}`}
              >
                <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium">
                  {group.workspace.environment_name}
                  <span className="text-muted-foreground font-mono text-xs font-normal">
                    {group.workspace.root}
                  </span>
                  {group.workspace.online ? null : (
                    <span className="text-xs font-normal text-amber-600">{t('offline')}</span>
                  )}
                </h2>
                {group.projects.length === 0 ? (
                  <p className="text-muted-foreground rounded-xl border px-4 py-3 text-sm">
                    {t('none')}
                  </p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {group.projects.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={routes.project(locale, project.id)}
                          className="hover:bg-muted/60 flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                          <FolderIcon className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {project.title}
                              {project.archived ? (
                                <span className="text-muted-foreground ml-2 text-xs font-normal">
                                  {t('archived')}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-xs">
                              {project.directory}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-[13px]">
                            {t('conversations', { n: project.conversations })}
                          </span>
                          <span className="text-muted-foreground w-28 shrink-0 text-right text-[13px]">
                            {project.last_active_at
                              ? format.dateTime(new Date(project.last_active_at), {
                                  dateStyle: 'medium',
                                })
                              : t('never')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </>
        )}
      </div>

      <NewProjectDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(project) => router.push(routes.project(locale, project))}
      />
    </div>
  )
}
