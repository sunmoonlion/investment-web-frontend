'use client'

// 设置（F-WEB-01）：key 只提交一次，页面不留、不回显；模型与审批策略进新会话的 thread 设置。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { Prefs } from '@/contracts/workbench'
import { addCredential, fetchPrefs, listCredentials, revokeCredential, savePrefs } from '@/lib/workbench/client'

const POLICIES: Prefs['approval_policy'][] = ['untrusted', 'on-request', 'on-failure', 'never']

export function SettingsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const prefs = useQuery({ queryKey: ['wb-prefs'], queryFn: () => fetchPrefs() })
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <KeysSection csrfToken={csrfToken} />
      {prefs.data ? (
        <ThreadSection key={`${prefs.data.model ?? ''}|${prefs.data.approval_policy}`} csrfToken={csrfToken} initial={prefs.data} />
      ) : (
        <section className="bg-card rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{t('thread')}</h2>
        </section>
      )}
    </div>
  )
}

function ThreadSection({ csrfToken, initial }: { csrfToken: string; initial: Prefs }) {
  const t = useTranslations('workbench.settings')
  const queryClient = useQueryClient()
  const [model, setModel] = useState(initial.model ?? '')
  const [policy, setPolicy] = useState<Prefs['approval_policy']>(initial.approval_policy)
  const save = useMutation({
    mutationFn: () => savePrefs({ model: model.trim() || null, approval_policy: policy }, csrfToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['wb-prefs'] }),
  })
  return (
    <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="settings-thread">
      <h2 id="settings-thread" className="text-xl font-semibold">
        {t('thread')}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('threadHint')}</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <label className="block text-sm font-medium">
          {t('model')}
          <input className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal" value={model} placeholder="kimi-k3" onChange={(e) => setModel(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          {t('approvalPolicy')}
          <select className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal" value={policy} onChange={(e) => setPolicy(e.target.value as Prefs['approval_policy'])}>
            {POLICIES.map((p) => (
              <option key={p} value={p}>
                {t(`policy.${p}` as 'policy.never')}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={save.isPending}>
          {t('save')}
        </button>
        {save.isSuccess ? <span className="text-muted-foreground ml-3 text-xs">{t('saved')}</span> : null}
      </form>
    </section>
  )
}

function KeysSection({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const queryClient = useQueryClient()
  const creds = useQuery({ queryKey: ['wb-credentials'], queryFn: () => listCredentials() })
  const [provider, setProvider] = useState('kimi')
  const [apiKey, setApiKey] = useState('')
  const add = useMutation({
    mutationFn: () => addCredential({ provider: provider.trim(), api_key: apiKey }, csrfToken),
    onSuccess: () => {
      setApiKey('')
      void queryClient.invalidateQueries({ queryKey: ['wb-credentials'] })
    },
  })
  const revoke = useMutation({
    mutationFn: (id: string) => revokeCredential(id, csrfToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['wb-credentials'] }),
  })

  return (
      <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="settings-keys">
        <h2 id="settings-keys" className="text-xl font-semibold">
          {t('keys')}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('keysHint')}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (apiKey.length >= 8) add.mutate()
          }}
        >
          <label className="block text-sm font-medium">
            {t('provider')}
            <input className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            {t('apiKey')}
            <input
              className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={add.isPending || apiKey.length < 8}>
            {t('submitKey')}
          </button>
          {add.error ? (
            <p role="alert" className="text-destructive text-xs">
              {t('error', { code: (add.error as Error).message })}
            </p>
          ) : null}
        </form>
        <ul className="mt-4 divide-y text-sm">
          {(creds.data ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2" data-credential-status={c.status}>
              <span>
                {c.provider} · ****{c.hint} · {c.status === 'active' ? t('active') : t('revoked')}
              </span>
              {c.status === 'active' ? (
                <button type="button" className="rounded-lg border px-3 py-1 text-xs" onClick={() => revoke.mutate(c.id)} disabled={revoke.isPending}>
                  {t('revoke')}
                </button>
              ) : null}
            </li>
          ))}
          {creds.data && creds.data.length === 0 ? <li className="text-muted-foreground py-2">{t('noKeys')}</li> : null}
        </ul>
      </section>

  )
}
