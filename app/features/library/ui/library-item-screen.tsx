'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Markdown } from '@/components/common/markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { useLibraryActions, useLibraryContent, useLibraryItem } from '../api/library'
import { cleanTitle, sizeText } from '../model/library'

// 一份资料：来路、版本、内容；改名、拿掉。每一份在服务端都有一份只属于这个用户的副本。
export function LibraryItemScreen({ item: id }: { item: string }) {
  const t = useTranslations('library.item')
  const tl = useTranslations('library')
  const format = useFormatter()
  const router = useRouter()
  const { locale } = useWorkbench()
  const item = useLibraryItem(id)
  const [version, setVersion] = useState<number | null>(null)
  const shown = version ?? item.data?.versions ?? null
  const content = useLibraryContent(id, shown)
  const act = useLibraryActions(id)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const back = (
    <Link
      href={routes.library(locale)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3.5" />
      {t('back')}
    </Link>
  )
  if (!item.data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-6 py-10">
        {back}
        <p className={cn('text-sm', item.isError ? 'text-destructive' : 'text-muted-foreground')}>
          {item.isError ? t('notFound') : tl('loading')}
        </p>
      </div>
    )
  }
  const data = item.data
  const when = (at: string) =>
    format.dateTime(new Date(at), { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        {back}
        <header className="space-y-2">
          {editing === null ? (
            <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const title = cleanTitle(editing)
                if (title) act.rename.mutate(title, { onSuccess: () => setEditing(null) })
              }}
            >
              <Input
                value={editing}
                aria-label={t('rename')}
                maxLength={400}
                onChange={(event) => setEditing(event.target.value)}
                className="h-9 max-w-xl text-base"
              />
              <Button type="submit" size="sm" disabled={act.rename.isPending}>
                {t('save')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
            </form>
          )}
          <p className="text-muted-foreground text-sm">
            {[
              tl(`kind.${data.kind}`),
              data.source.expert,
              data.source.step_title,
              t('versions', { n: data.versions }),
              sizeText(data.size_bytes),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {data.source.question ? (
            <p className="text-muted-foreground text-sm">
              {t('from', { question: data.source.question })}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">{t('copy')}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {data.project_id ? (
              <Link
                href={routes.dossier(locale, data.project_id, data.task_id)}
                className="text-muted-foreground text-xs underline underline-offset-3"
              >
                {t('toDossier')}
              </Link>
            ) : null}
            <Link
              href={
                data.project_id
                  ? routes.projectConversation(locale, data.project_id, data.session_id)
                  : routes.chat(locale, data.session_id)
              }
              className="text-muted-foreground text-xs underline underline-offset-3"
            >
              {t('toConversation')}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {editing === null ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(data.title)}>
                {t('rename')}
              </Button>
            ) : null}
            {confirming ? (
              <span className="flex items-center gap-2 text-sm">
                {t('confirmRemove')}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={act.remove.isPending}
                  onClick={() =>
                    act.remove.mutate(undefined, {
                      onSuccess: () => router.push(routes.library(locale)),
                    })
                  }
                >
                  {t('remove')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  {t('cancel')}
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                {t('remove')}
              </Button>
            )}
          </div>
          {act.rename.isError || act.remove.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {t('failed')}
            </p>
          ) : null}
        </header>

        <section aria-label={t('versionsTitle')} className="space-y-2">
          <h2 className="text-sm font-medium">{t('versionsTitle')}</h2>
          <ul className="flex flex-wrap gap-2">
            {data.version_list.map((each) => (
              <li key={each.version}>
                <Button
                  size="sm"
                  variant={shown === each.version ? 'default' : 'outline'}
                  aria-pressed={shown === each.version}
                  onClick={() => setVersion(each.version)}
                  title={each.sha256 ? t('sha', { sha: each.sha256.slice(0, 12) }) : undefined}
                >
                  {t('version', { n: each.version })} · {when(each.created_at)}
                  {each.note ? ` · ${each.note}` : ''}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={t('content')} className="space-y-2">
          <h2 className="text-sm font-medium">{t('content')}</h2>
          {content.isPending ? (
            <p className="text-muted-foreground text-sm">{tl('loading')}</p>
          ) : content.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {tl('failed')}
            </p>
          ) : content.data.kind === 'dossier' ? (
            <article className="rounded-xl border px-5 py-4">
              <Markdown>{content.data.text}</Markdown>
            </article>
          ) : (
            <pre className="bg-muted/40 overflow-x-auto rounded-xl border px-4 py-3 text-[13px] leading-5 whitespace-pre-wrap">
              {content.data.text}
            </pre>
          )}
          {content.data ? (
            <p className="text-muted-foreground text-xs">
              {t('sha', { sha: content.data.sha256.slice(0, 12) })}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
