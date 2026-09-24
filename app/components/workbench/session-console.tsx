'use client'

// 会话台：对话（第一层）、求助（交出方向盘）、待办 Interaction（审批 / 澄清 / 预算）、任务卡。事件流是唯一的真源投影。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import type { Interaction, SessionEvent, SessionView, TaskView } from '@/contracts/workbench'
import {
  cancelTask,
  fetchSessionView,
  fetchTask,
  handover,
  respondInteraction,
  startTurn,
} from '@/lib/workbench/client'
import { useSessionStream } from '@/lib/workbench/use-session-stream'

const PROFILES = ['SMOKE', 'DATA_QUERY'] as const

type Props = { sessionId: string; csrfToken: string; locale: string }

export function SessionConsole({ sessionId, csrfToken, locale }: Props) {
  const queryClient = useQueryClient()
  const { events, state: streamState } = useSessionStream(sessionId)
  const view = useQuery({ queryKey: ['wb-session', sessionId], queryFn: () => fetchSessionView(sessionId), refetchInterval: 4000 })
  const activeTaskId = view.data?.session.active_task_id ?? lastTaskId(events)
  const task = useQuery({
    queryKey: ['wb-task', activeTaskId],
    queryFn: () => fetchTask(activeTaskId as string),
    enabled: Boolean(activeTaskId),
    refetchInterval: 4000,
  })
  const tokens = useMemo(() => interactionTokens(events), [events])
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['wb-session', sessionId] })
    if (activeTaskId) void queryClient.invalidateQueries({ queryKey: ['wb-task', activeTaskId] })
  }
  const wheel = view.data?.session.wheel ?? 'user'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Timeline events={events} streamState={streamState} />
        <Composer sessionId={sessionId} csrfToken={csrfToken} wheel={wheel} onSent={invalidate} />
      </div>
      <aside className="space-y-6">
        <Pending
          interactions={view.data?.pending_interactions ?? []}
          tokens={tokens}
          csrfToken={csrfToken}
          onDone={invalidate}
        />
        {task.data ? <TaskCard view={task.data} csrfToken={csrfToken} onDone={invalidate} dossierHref={`/${locale}/workbench/${sessionId}/tasks/${task.data.task.id}`} /> : null}
        <HelpPanel sessionId={sessionId} csrfToken={csrfToken} view={view.data} events={events} onDone={invalidate} />
      </aside>
    </div>
  )
}

// ---------------- 时间线 ----------------
export function Timeline({ events, streamState }: { events: SessionEvent[]; streamState: string }) {
  const t = useTranslations('workbench')
  return (
    <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="timeline-title">
      <div className="flex items-center justify-between">
        <h2 id="timeline-title" className="text-xl font-semibold">
          {t('timeline')}
        </h2>
        <span className="text-muted-foreground text-xs" data-stream-state={streamState}>
          {t(`stream.${streamState}` as 'stream.open')}
        </span>
      </div>
      <ol className="mt-4 space-y-3" aria-live="polite">
        {events.map((e) => {
          const line = describe(e, t)
          if (!line) return null
          return (
            <li key={e.id} className={`rounded-lg border px-3 py-2 text-sm ${line.tone}`} data-event-type={e.type}>
              <p className="text-muted-foreground text-xs">
                #{e.cursor} · {line.label}
              </p>
              {line.body ? <pre className="mt-1 font-sans whitespace-pre-wrap">{line.body}</pre> : null}
            </li>
          )
        })}
        {events.length === 0 ? <li className="text-muted-foreground text-sm">{t('noEvents')}</li> : null}
      </ol>
    </section>
  )
}

type Line = { label: string; body?: string; tone: string }

function describe(e: SessionEvent, t: ReturnType<typeof useTranslations>): Line | null {
  const p = e.payload as Record<string, unknown>
  const item = p.item as Record<string, unknown> | undefined
  switch (e.type) {
    case 'turn/requested':
      return { label: t('ev.you'), body: String(p.text ?? ''), tone: 'bg-primary/5' }
    case 'item/completed':
      if (item?.type === 'agentMessage') return { label: t('ev.codex'), body: String(item.text ?? ''), tone: '' }
      if (item?.type === 'commandExecution')
        return { label: t('ev.command'), body: `${String(item.command ?? '')}\n${String(item.aggregatedOutput ?? '')}`.trim(), tone: 'bg-muted/40' }
      if (item?.type === 'fileChange') return { label: t('ev.fileChange'), body: JSON.stringify(item.changes ?? []), tone: 'bg-muted/40' }
      return null
    case 'wheel/handover':
      return { label: t('ev.handover'), tone: 'bg-amber-50 dark:bg-amber-950/30' }
    case 'wheel/return':
      return { label: t('ev.return', { state: String(p.final_state ?? '') }), tone: 'bg-amber-50 dark:bg-amber-950/30' }
    case 'task/state':
      return { label: t('ev.taskState', { from: String(p.from), to: String(p.to) }), body: p.waiting_reason ? String(p.waiting_reason) : undefined, tone: '' }
    case 'step/started':
      return { label: t('ev.stepStarted', { step: String(p.title ?? p.step_id) }), tone: '' }
    case 'step/accepted':
      return { label: t('ev.stepAccepted', { step: String(p.step_id) }), tone: 'bg-emerald-50 dark:bg-emerald-950/30' }
    case 'step/rejected':
      return { label: t('ev.stepRejected', { step: String(p.step_id) }), body: (p.failures as string[] | undefined)?.join('\n'), tone: 'bg-rose-50 dark:bg-rose-950/30' }
    case 'interaction/opened':
      return { label: t('ev.interactionOpened', { kind: String(p.kind) }), tone: 'bg-amber-50 dark:bg-amber-950/30' }
    case 'interaction/consumed':
      return { label: t('ev.interactionConsumed'), body: JSON.stringify(p.response ?? {}), tone: '' }
    case 'command/failed':
      return { label: t('ev.commandFailed'), body: String(p.error ?? ''), tone: 'bg-rose-50 dark:bg-rose-950/30' }
    case 'thread/environment/disconnected':
      return { label: t('ev.envDown'), tone: 'bg-rose-50 dark:bg-rose-950/30' }
    case 'thread/environment/connected':
      return { label: t('ev.envUp'), tone: 'bg-emerald-50 dark:bg-emerald-950/30' }
    case 'session/thread_started':
      return { label: t('ev.threadStarted'), tone: '' }
    default:
      return null
  }
}

// ---------------- 对话框 ----------------
function Composer({ sessionId, csrfToken, wheel, onSent }: { sessionId: string; csrfToken: string; wheel: 'user' | 'advisor'; onSent: () => void }) {
  const t = useTranslations('workbench')
  const [text, setText] = useState('')
  const send = useMutation({
    mutationFn: () => startTurn(sessionId, text.trim(), csrfToken),
    onSuccess: () => {
      setText('')
      onSent()
    },
  })
  const locked = wheel === 'advisor'
  return (
    <form
      className="bg-card rounded-2xl border p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (text.trim() && !locked) send.mutate()
      }}
    >
      <textarea
        aria-label={t('composer')}
        className="bg-background w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
        rows={3}
        value={text}
        disabled={locked}
        onChange={(event) => setText(event.target.value)}
        placeholder={locked ? t('composerLocked') : t('composerPlaceholder')}
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={locked || send.isPending || !text.trim()}>
          {t('send')}
        </button>
        {locked ? <p className="text-muted-foreground text-xs">{t('composerLocked')}</p> : null}
        {send.error ? (
          <p role="alert" className="text-destructive text-xs">
            {t('error', { code: (send.error as Error).message })}
          </p>
        ) : null}
      </div>
    </form>
  )
}

// ---------------- 待办 ----------------
export function Pending({ interactions, tokens, csrfToken, onDone }: { interactions: Interaction[]; tokens: Record<string, string>; csrfToken: string; onDone: () => void }) {
  const t = useTranslations('workbench')
  const [amount, setAmount] = useState('5')
  const respond = useMutation({
    mutationFn: (args: { id: string; decision: string }) =>
      respondInteraction(args.id, { token: tokens[args.id], decision: args.decision, ...(args.decision === 'topup' ? { amount } : {}) }, csrfToken),
    onSuccess: onDone,
  })
  if (!interactions.length) return null
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:bg-amber-950/30" aria-labelledby="pending-title">
      <h2 id="pending-title" className="text-lg font-semibold">
        {t('pending')}
      </h2>
      <ul className="mt-3 space-y-4">
        {interactions.map((it) => (
          <li key={it.id} className="rounded-lg border bg-background p-3 text-sm" data-interaction-kind={it.kind}>
            <p className="font-medium">{it.prompt.title}</p>
            <p className="text-muted-foreground mt-1">{it.prompt.question}</p>
            {it.kind === 'tool_approval' && it.prompt.subject.command ? (
              <pre className="bg-muted/40 mt-2 rounded p-2 text-xs whitespace-pre-wrap">{String(it.prompt.subject.command)}</pre>
            ) : null}
            {it.prompt.unknowns.length ? (
              <ul className="text-muted-foreground mt-2 list-disc pl-5 text-xs">
                {it.prompt.unknowns.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : null}
            {it.kind === 'resource' ? (
              <label className="mt-2 block text-xs">
                {t('topupAmount')}
                <input className="bg-background ml-2 w-24 rounded border px-2 py-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {it.prompt.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  disabled={respond.isPending || !tokens[it.id]}
                  onClick={() => respond.mutate({ id: it.id, decision: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {!tokens[it.id] ? <p className="text-muted-foreground mt-2 text-xs">{t('tokenMissing')}</p> : null}
          </li>
        ))}
      </ul>
      {respond.error ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {t('error', { code: (respond.error as Error).message })}
        </p>
      ) : null}
    </section>
  )
}

// ---------------- 任务卡 ----------------
function TaskCard({ view, csrfToken, onDone, dossierHref }: { view: TaskView; csrfToken: string; onDone: () => void; dossierHref: string }) {
  const t = useTranslations('workbench')
  const cancel = useMutation({ mutationFn: () => cancelTask(view.task.id, csrfToken), onSuccess: onDone })
  const terminal = ['SUCCEEDED', 'REJECTED', 'FAILED', 'CANCELLED'].includes(view.task.state)
  const b = view.task.budget
  return (
    <section className="bg-card rounded-2xl border p-4 shadow-sm" aria-labelledby="task-title">
      <h2 id="task-title" className="text-lg font-semibold">
        {t('task')} · {view.task.profile_id}
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t('state')}</dt>
        <dd data-task-state={view.task.state}>
          {view.task.state}
          {view.task.waiting_reason ? ` (${view.task.waiting_reason})` : ''}
        </dd>
        <dt className="text-muted-foreground">{t('step')}</dt>
        <dd>{view.task.current_step}</dd>
        <dt className="text-muted-foreground">{t('budget')}</dt>
        <dd>
          {b.used} / {b.limit} {b.currency}
        </dd>
      </dl>
      {view.task.rejection ? <p className="text-destructive mt-2 text-sm">{String(view.task.rejection.message ?? '')}</p> : null}
      {view.artifacts.length ? (
        <ul className="mt-3 space-y-1 text-xs">
          {view.artifacts.map((a) => (
            <li key={a.id}>
              {a.name} v{a.version} · {a.digest.slice(0, 12)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex gap-2">
        <a href={dossierHref} className="rounded-lg border px-3 py-1.5 text-xs">
          {t('openDossier')}
        </a>
        {!terminal ? (
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {t('cancel')}
          </button>
        ) : null}
      </div>
    </section>
  )
}

// ---------------- 求助 ----------------
function HelpPanel({ sessionId, csrfToken, view, events, onDone }: { sessionId: string; csrfToken: string; view?: SessionView; events: SessionEvent[]; onDone: () => void }) {
  const t = useTranslations('workbench')
  const [profile, setProfile] = useState<(typeof PROFILES)[number]>('SMOKE')
  const [question, setQuestion] = useState('')
  const [budget, setBudget] = useState('5')
  const [key] = useState(() => crypto.randomUUID())
  const ask = useMutation({
    mutationFn: () =>
      handover(sessionId, { idempotency_key: key, profile_id: profile, original_input: { text: question.trim() || lastUserText(events) }, budget_limit: budget }, csrfToken),
    onSuccess: onDone,
  })
  const locked = view?.session.wheel === 'advisor'
  return (
    <section className="bg-card rounded-2xl border p-4 shadow-sm" aria-labelledby="help-title">
      <h2 id="help-title" className="text-lg font-semibold">
        {t('askExpert')}
      </h2>
      <p className="text-muted-foreground mt-1 text-xs">{t('askExpertHint')}</p>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!locked) ask.mutate()
        }}
      >
        <label className="block text-xs font-medium">
          {t('expertPack')}
          <select className="bg-background mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={profile} onChange={(e) => setProfile(e.target.value as (typeof PROFILES)[number])}>
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          {t('question')}
          <textarea className="bg-background mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={lastUserText(events) || t('questionPlaceholder')} />
        </label>
        <label className="block text-xs font-medium">
          {t('budgetLimit')}
          <input className="bg-background mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={locked || ask.isPending}>
          {locked ? t('advisorDriving') : t('handover')}
        </button>
        {ask.error ? (
          <p role="alert" className="text-destructive text-xs">
            {t('error', { code: (ask.error as Error).message })}
          </p>
        ) : null}
      </form>
    </section>
  )
}

// ---------------- 工具 ----------------
export function interactionTokens(events: SessionEvent[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of events) {
    if (e.type === 'interaction/opened') {
      const p = e.payload as { interaction_id?: string; token?: string }
      if (p.interaction_id && p.token) out[p.interaction_id] = p.token
    }
  }
  return out
}

function lastTaskId(events: SessionEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].task_id) return events[i].task_id as string
  }
  return null
}

function lastUserText(events: SessionEvent[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].type === 'turn/requested') return String((events[i].payload as { text?: string }).text ?? '')
  }
  return ''
}
