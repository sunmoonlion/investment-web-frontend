'use client'

import { SearchIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkbench } from '@/lib/workbench/context'
import { useAllProjects } from '@/lib/workbench/queries'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { useLibrary } from '../api/library'
import { byProject, KINDS, sizeText, type Kind } from '../model/library'

// 知识库：用户在我们这里的资料，每一份在服务端有一份只属于他的副本。
// 第一期：专家交回的底稿、各步交回的东西自动归入；上传以后做。
export function LibraryScreen() {
  const t = useTranslations('library')
  const format = useFormatter()
  const { locale } = useWorkbench()
  const [kind, setKind] = useState<Kind | null>(null)
  const [typed, setTyped] = useState('')
  const [q, setQ] = useState('')
  const items = useLibrary({ kind, q })
  const projects = useAllProjects(true)
  const names = new Map((projects.data ?? []).map((project) => [project.id, project.title]))
  const groups = byProject(items.data ?? [], names)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t('kind.label')} className="flex gap-1">
            {[null, ...KINDS].map((each) => (
              <Button
                key={each ?? 'all'}
                type="button"
                size="sm"
                variant={kind === each ? 'default' : 'outline'}
                aria-pressed={kind === each}
                onClick={() => setKind(each)}
              >
                {t(`kind.${each ?? 'all'}`)}
              </Button>
            ))}
          </div>
          <form
            role="search"
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setQ(typed.trim())
            }}
          >
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                maxLength={200}
                aria-label={t('searchLabel')}
                placeholder={t('searchPlaceholder')}
                className="h-8 pl-8"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              {t('search')}
            </Button>
          </form>
        </div>

        {items.isPending ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : items.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {t('failed')}
          </p>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center">
            <p className="text-base font-medium">{q || kind ? t('notFound') : t('empty')}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {q || kind ? t('notFoundHint') : t('emptyHint')}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.project ?? 'none'}
              aria-label={group.title ?? t('noProject')}
              className="space-y-2"
            >
              <h2 className="text-sm font-medium">{group.title ?? t('noProject')}</h2>
              <ul className="divide-y rounded-xl border">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={routes.libraryItem(locale, item.id)}
                      className="hover:bg-muted/60 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                    >
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-xs',
                          item.kind === 'dossier'
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t(`kind.${item.kind}`)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {[item.source.expert, item.source.question].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-right text-[13px]">
                        <span className="block">
                          {t('versions', { n: item.versions })}
                          {sizeText(item.size_bytes) ? ` · ${sizeText(item.size_bytes)}` : ''}
                        </span>
                        <span className="block">
                          {format.dateTime(new Date(item.updated_at), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="text-muted-foreground border-t pt-4 text-xs leading-5">{t('note')}</p>
      </div>
    </div>
  )
}
