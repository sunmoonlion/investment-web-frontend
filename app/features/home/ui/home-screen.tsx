'use client'

import { ArrowUpIcon, FolderIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { ProjectPicker } from '@/components/workbench/project-picker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWorkbench } from '@/lib/workbench/context'
import { WorkbenchError } from '@/lib/workbench/http'
import {
  useConversations,
  useMachines,
  usePending,
  useProjects,
  useSandboxes,
} from '@/lib/workbench/queries'
import { conversationRoute, isBuilt, MODES, routes, type Mode } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import { useStart } from '../api/start'
import { blockerOf, projectIsRequired } from '../model/start'

export function HomeScreen() {
  const t = useTranslations('home')
  const router = useRouter()
  const { locale } = useWorkbench()
  const asked = useSearchParams().get('mode')
  const mode: Mode = asked === 'work' || asked === 'expert' ? asked : 'chat'

  const projects = useProjects()
  const machines = useMachines()
  const sandboxes = useSandboxes()
  const pending = usePending()
  const conversations = useConversations()
  const start = useStart()

  const [text, setText] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const project = (projects.data ?? []).find((each) => each.id === projectId)
  const blocker = blockerOf({
    mode,
    text,
    project,
    sandboxes: sandboxes.data?.length,
    machines: machines.data,
  })
  const names = new Map((projects.data ?? []).map((each) => [each.id, each.title]))
  const latest = [...(conversations.data ?? [])]
    .sort((a, b) =>
      (b.last_active_at ?? b.created_at).localeCompare(a.last_active_at ?? a.created_at),
    )
    .slice(0, 6)

  async function send() {
    if (blocker !== null || start.isPending) return
    if (mode === 'expert') {
      // 专家：带着问题去「请专家」那一页补全
      window.sessionStorage.setItem('workbench.question', text.trim())
      router.push(routes.askExpert(locale, projectId!))
      return
    }
    try {
      const made = await start.mutateAsync({ kind: mode, project: projectId, text: text.trim() })
      router.push(conversationRoute(locale, made))
    } catch {
      // 原因显示在输入框下面
    }
  }

  // 「还没写字」不用说出来：发送钮是灰的就够了
  const said = blocker && blocker !== 'empty' ? blocker : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pt-[12vh] pb-16">
        <h1 className="text-center text-2xl font-semibold tracking-tight">{t('title')}</h1>

        <section aria-label={t('title')}>
          <nav aria-label={t('modes')} className="mb-3 flex justify-center gap-2">
            {MODES.map((each) => (
              <Link
                key={each}
                href={routes.home(locale, each)}
                aria-current={mode === each ? 'true' : undefined}
                className={cn(
                  'rounded-full border px-4 py-1 text-sm',
                  mode === each
                    ? 'bg-foreground text-background border-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(`mode.${each}.name`)}
              </Link>
            ))}
          </nav>
          <p className="text-muted-foreground mb-3 text-center text-[13px]">
            {t(`mode.${mode}.what`)}
          </p>

          <div className="bg-background focus-within:border-ring rounded-2xl border p-2 shadow-xs">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void send()
                }
              }}
              rows={3}
              aria-label={t(`mode.${mode}.placeholder`)}
              placeholder={t(`mode.${mode}.placeholder`)}
              className="max-h-64 min-h-20 resize-none border-0 bg-transparent px-2 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <div className="flex items-center gap-2 px-1 pt-1">
              {/* 在哪个项目里：就在输入框的角上选，不另起一步 */}
              <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
                <FolderIcon />
                {project
                  ? project.title
                  : projectIsRequired(mode)
                    ? t('project.choose')
                    : t('project.none')}
              </Button>
              {project && !projectIsRequired(mode) ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setProjectId(null)}
                  aria-label={t('project.clear')}
                  title={t('project.clear')}
                >
                  <XIcon />
                </Button>
              ) : null}
              <div className="flex-1" />
              <Button
                size="icon"
                onClick={() => void send()}
                disabled={blocker !== null || start.isPending}
                aria-label={t(`mode.${mode}.send`)}
                title={t(`mode.${mode}.send`)}
              >
                <ArrowUpIcon />
              </Button>
            </div>
          </div>

          {said ? (
            <p className="text-muted-foreground mt-2 text-center text-[13px]">
              {t(`blocker.${said}`)}
              {said === 'noSandbox' && isBuilt('settings') ? (
                <>
                  {' '}
                  <Link href={routes.settings(locale)} className="underline underline-offset-3">
                    {t('toSettings')}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          {start.isError ? (
            <p role="alert" className="text-destructive mt-2 text-center text-[13px]">
              {t.has(`problem.${(start.error as WorkbenchError).code}`)
                ? t(`problem.${(start.error as WorkbenchError).code}`)
                : t('problem.other')}
            </p>
          ) : null}
        </section>

        {pending.data && pending.data.length > 0 ? (
          <section aria-label={t('pending.title')}>
            <h2 className="mb-2 text-sm font-medium">
              {t('pending.title')}
              <span className="bg-foreground text-background ml-2 rounded-full px-1.5 text-xs">
                {pending.data.length}
              </span>
            </h2>
            <ul className="divide-y rounded-xl border border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
              {pending.data.map((each) => {
                const inner = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {each.where.about ?? each.kind}
                      </span>
                      <span className="text-muted-foreground block truncate text-[13px]">
                        {[each.where.project?.title, each.where.conversation?.title, each.why]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {isBuilt('review') ? (
                      <span className="shrink-0 text-[13px] font-medium">{t('pending.open')}</span>
                    ) : null}
                  </>
                )
                return (
                  <li key={each.interaction_id}>
                    {isBuilt('review') ? (
                      <Link
                        href={routes.review(locale, each.interaction_id)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-100/60"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-2.5">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {latest.length > 0 ? (
          <section aria-label={t('recent.title')}>
            <h2 className="mb-2 text-sm font-medium">{t('recent.title')}</h2>
            <ul className="divide-y rounded-xl border">
              {latest.map((each) => {
                const built = isBuilt(each.project_id === null ? 'chat' : 'projectConversation')
                const inner = (
                  <>
                    <span className="text-muted-foreground w-10 shrink-0 text-xs">
                      {t(`kind.${each.kind}`)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {each.title ?? t('recent.untitled')}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[13px]">
                      {each.project_id ? names.get(each.project_id) : t('recent.noProject')}
                    </span>
                  </>
                )
                return (
                  <li key={each.id}>
                    {built ? (
                      <Link
                        href={conversationRoute(locale, each)}
                        className="hover:bg-muted/60 flex items-center gap-3 px-4 py-2.5"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div
                        className="flex items-center gap-3 px-4 py-2.5"
                        title={t('blocker.notBuilt')}
                      >
                        {inner}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <ProjectPicker
        open={picking}
        onOpenChange={setPicking}
        title={t('project.pickTitle')}
        description={t(`project.pick.${mode}`)}
        onPick={(picked) => {
          setProjectId(picked)
          setPicking(false)
        }}
      />
    </div>
  )
}
