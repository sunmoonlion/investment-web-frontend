'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { createSession, listEnvironments, listSandboxes, listSessions } from '@/lib/workbench/client'

export function SessionList({ csrfToken, locale }: { csrfToken: string; locale: string }) {
  const t = useTranslations('workbench')
  const router = useRouter()
  const queryClient = useQueryClient()
  const envs = useQuery({ queryKey: ['wb-envs'], queryFn: () => listEnvironments() })
  const sandboxes = useQuery({ queryKey: ['wb-sandboxes'], queryFn: () => listSandboxes() })
  const sessions = useQuery({ queryKey: ['wb-sessions'], queryFn: () => listSessions() })
  const [environmentId, setEnvironmentId] = useState('')
  const [sandboxId, setSandboxId] = useState('')
  const [projectRoot, setProjectRoot] = useState('')
  const create = useMutation({
    mutationFn: () =>
      createSession({ environment_id: environmentId, sandbox_id: sandboxId, project_root: projectRoot.trim() }, csrfToken),
    onSuccess: (sessionId) => {
      void queryClient.invalidateQueries({ queryKey: ['wb-sessions'] })
      router.push(`/${locale}/workbench/${sessionId}`)
    },
  })
  const env = envs.data?.find((e) => e.id === environmentId)

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="new-session-title">
        <h2 id="new-session-title" className="text-xl font-semibold">
          {t('newSession')}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">{t('newSessionHint')}</p>
        <form
          className="mt-6 grid gap-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (environmentId && sandboxId && projectRoot.trim()) create.mutate()
          }}
        >
          <label className="block text-sm font-medium">
            {t('environment')}
            <select
              className="bg-background mt-2 w-full rounded-lg border px-3 py-2 font-normal"
              value={environmentId}
              onChange={(event) => setEnvironmentId(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {(envs.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.status} · codex {e.codex_version ?? '?'}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t('sandbox')}
            <select
              className="bg-background mt-2 w-full rounded-lg border px-3 py-2 font-normal"
              value={sandboxId}
              onChange={(event) => setSandboxId(event.target.value)}
            >
              <option value="">{t('choose')}</option>
              {(sandboxes.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.app_server_url} · codex {s.codex_version ?? '?'}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t('projectRoot')}
            <input
              className="bg-background mt-2 w-full rounded-lg border px-3 py-2 font-normal"
              list="wb-roots"
              value={projectRoot}
              onChange={(event) => setProjectRoot(event.target.value)}
              placeholder={env?.roots[0] ?? '/home/you/research/project'}
            />
            <datalist id="wb-roots">
              {(env?.roots ?? []).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <div className="md:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              disabled={create.isPending || !environmentId || !sandboxId || !projectRoot.trim()}
            >
              {create.isPending ? t('creating') : t('create')}
            </button>
            {create.error ? (
              <p role="alert" className="text-destructive text-sm">
                {t('error', { code: (create.error as Error).message })}
              </p>
            ) : null}
            {envs.data && !envs.data.some((e) => e.status === 'online') ? (
              <p className="text-muted-foreground text-sm" data-agent-guidance>
                {envs.data.length === 0 ? t('noEnvironments') : null} {t('agentOffline')}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="sessions-title">
        <h2 id="sessions-title" className="text-xl font-semibold">
          {t('sessions')}
        </h2>
        <ul className="mt-4 divide-y">
          {(sessions.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{s.project_root}</p>
                <p className="text-muted-foreground text-xs">
                  {t('wheel')}: {s.wheel === 'user' ? t('wheelUser') : t('wheelAdvisor')} · thread {s.thread_id ?? '—'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5"
                onClick={() => router.push(`/${locale}/workbench/${s.id}`)}
              >
                {t('open')}
              </button>
            </li>
          ))}
          {sessions.data && sessions.data.length === 0 ? (
            <li className="text-muted-foreground py-3 text-sm">{t('noSessions')}</li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}
