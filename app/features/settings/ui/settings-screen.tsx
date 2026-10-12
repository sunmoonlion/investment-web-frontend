'use client'

// 设置分三类（0021）：个人偏好 / 云端与模型 / 我的电脑。左边一列三项，右边一次只显示一类。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

import type { Prefs } from '@/contracts/workbench-settings'
import { useWorkbench } from '@/lib/workbench/context'
import { useMachines } from '@/lib/workbench/queries'
import { routes, SETTINGS_SECTIONS, type SettingsSection } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

import {
  addCredential,
  fetchPrefs,
  listCredentials,
  revokeCredential,
  savePrefs,
} from '../api/client'
import { AgentSetup } from './agent-setup'
import { MachinesScreen } from './machines-screen'
import { PreferencesSection } from './preferences-section'

const POLICIES: Prefs['approval_policy'][] = ['untrusted', 'on-request', 'on-failure', 'never']
const input = 'bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal'
const primaryButton =
  'bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50'

export function SettingsScreen({ section }: { section: SettingsSection }) {
  const t = useTranslations('settings')
  const { csrfToken, locale } = useWorkbench()
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl gap-8 px-6 py-10">
        <nav aria-label={t('title')} className="w-44 shrink-0">
          <h1 className="px-2 text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <ul className="mt-4 space-y-1">
            {SETTINGS_SECTIONS.map((each) => (
              <li key={each}>
                <Link
                  href={routes.settings(locale, each)}
                  aria-current={each === section ? 'page' : undefined}
                  className={cn(
                    'hover:bg-foreground/5 block rounded-md px-2 py-1.5 text-sm',
                    each === section && 'bg-foreground/[0.07] font-medium',
                  )}
                >
                  {t(`nav.${each}`)}
                  <span className="text-muted-foreground block text-xs font-normal">
                    {t(`navHint.${each}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 space-y-6">
          {section === 'preferences' ? <PreferencesSection /> : null}
          {section === 'cloud' ? <CloudSection csrfToken={csrfToken} /> : null}
          {section === 'computer' ? <ComputerSection /> : null}
        </div>
      </div>
    </div>
  )
}

// ---------------- 云端与模型 ----------------
function CloudSection({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('settings.cloud')
  const { locale } = useWorkbench()
  const prefs = useQuery({ queryKey: ['wb-prefs'], queryFn: () => fetchPrefs() })
  return (
    <>
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
      </header>
      <KeysSection csrfToken={csrfToken} />
      {prefs.data ? (
        <ThreadSection
          key={`${prefs.data.model ?? ''}|${prefs.data.approval_policy}`}
          csrfToken={csrfToken}
          initial={prefs.data}
        />
      ) : null}
      <AgentSetup csrfToken={csrfToken} />
      {prefs.data ? <McpSection csrfToken={csrfToken} prefs={prefs.data} /> : null}
      <section className="flex items-center justify-between rounded-xl border p-5">
        <div>
          <h3 className="text-base font-semibold">{t('memory')}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t('memoryHint')}</p>
        </div>
        <Link href={routes.memory(locale)} className="rounded-lg border px-3 py-1.5 text-sm">
          {t('memoryOpen')}
        </Link>
      </section>
    </>
  )
}

function ThreadSection({ csrfToken, initial }: { csrfToken: string; initial: Prefs }) {
  const t = useTranslations('workbench.settings')
  const queryClient = useQueryClient()
  const [model, setModel] = useState(initial.model ?? '')
  const [policy, setPolicy] = useState<Prefs['approval_policy']>(initial.approval_policy)
  const save = useMutation({
    mutationFn: () =>
      savePrefs({ model: model.trim() || null, approval_policy: policy }, csrfToken),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['wb-prefs'] }),
  })
  return (
    <section className="rounded-xl border p-5" aria-labelledby="settings-thread">
      <h3 id="settings-thread" className="text-base font-semibold">
        {t('thread')}
      </h3>
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
          <input
            className={input}
            value={model}
            placeholder="kimi-k3"
            onChange={(e) => setModel(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          {t('approvalPolicy')}
          <select
            className={input}
            value={policy}
            onChange={(e) => setPolicy(e.target.value as Prefs['approval_policy'])}
          >
            {POLICIES.map((p) => (
              <option key={p} value={p}>
                {t(`policy.${p}` as 'policy.never')}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={primaryButton} disabled={save.isPending}>
          {t('save')}
        </button>
        {save.isSuccess ? (
          <span className="text-muted-foreground ml-3 text-xs">{t('saved')}</span>
        ) : null}
      </form>
    </section>
  )
}

function KeysSection({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const s = useTranslations('settings')
  const queryClient = useQueryClient()
  const creds = useQuery({ queryKey: ['wb-credentials'], queryFn: () => listCredentials() })
  const [provider, setProvider] = useState('kimi')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const add = useMutation({
    mutationFn: () =>
      addCredential(
        { provider: provider.trim(), api_key: apiKey, base_url: baseUrl.trim() || null },
        csrfToken,
      ),
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
    <section className="rounded-xl border p-5" aria-labelledby="settings-keys">
      <h3 id="settings-keys" className="text-base font-semibold">
        {t('keys')}
      </h3>
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
          <input className={input} value={provider} onChange={(e) => setProvider(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          {t('apiKey')}
          <input
            className={input}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          {s('baseUrl')}
          <input
            className={input}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <span className="text-muted-foreground block text-xs font-normal">
            {s('baseUrlHint')}
          </span>
        </label>
        <button
          type="submit"
          className={primaryButton}
          disabled={add.isPending || apiKey.length < 8}
        >
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
          <li
            key={c.id}
            className="flex items-center justify-between py-2"
            data-credential-status={c.status}
          >
            <span className="min-w-0 truncate">
              {c.provider} · ****{c.hint} · {c.status === 'active' ? t('active') : t('revoked')}
              {c.base_url ? (
                <span className="text-muted-foreground font-mono text-xs"> · {c.base_url}</span>
              ) : null}
            </span>
            {c.status === 'active' ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-1 text-xs"
                onClick={() => revoke.mutate(c.id)}
                disabled={revoke.isPending}
              >
                {t('revoke')}
              </button>
            ) : null}
          </li>
        ))}
        {creds.data && creds.data.length === 0 ? (
          <li className="text-muted-foreground py-2">{t('noKeys')}</li>
        ) : null}
      </ul>
    </section>
  )
}

// Codex 在云端能用哪些数据源（0021 §二之 2）。改了要「更新沙箱」才带进去。
function McpSection({ csrfToken, prefs }: { csrfToken: string; prefs: Prefs }) {
  const t = useTranslations('settings.mcp')
  const queryClient = useQueryClient()
  const knowledge = prefs.mcp_sources?.knowledge ?? true
  const toggle = useMutation({
    mutationFn: (on: boolean) =>
      savePrefs(
        {
          model: prefs.model,
          approval_policy: prefs.approval_policy,
          mcp_sources: { ...(prefs.mcp_sources ?? {}), knowledge: on },
        },
        csrfToken,
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['wb-prefs'] }),
  })
  return (
    <section className="rounded-xl border p-5" aria-labelledby="settings-mcp">
      <h3 id="settings-mcp" className="text-base font-semibold">
        {t('title')}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
      <ul className="mt-4 divide-y text-sm">
        <li className="flex items-center justify-between gap-4 py-3">
          <span>
            <span className="block font-medium">{t('knowledge')}</span>
            <span className="text-muted-foreground block text-xs">{t('knowledgeHint')}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={knowledge}
            aria-label={t('knowledge')}
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(!knowledge)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              knowledge && 'bg-primary text-primary-foreground border-primary',
            )}
          >
            {knowledge ? t('on') : t('off')}
          </button>
        </li>
        <li className="flex items-center justify-between gap-4 py-3 opacity-60">
          <span>
            <span className="block font-medium">{t('advisor')}</span>
            <span className="text-muted-foreground block text-xs">{t('advisorHint')}</span>
          </span>
        </li>
      </ul>
    </section>
  )
}

// ---------------- 我的电脑 ----------------
function ComputerSection() {
  return (
    <>
      <MachinesScreen embedded />
      <LocalAgentSettings />
    </>
  )
}

// 存在电脑上的代理里的设置：现在只显示（hello 带来的白名单与上限），从网页改要等账 87 的通道。
function LocalAgentSettings() {
  const t = useTranslations('settings.computer')
  const machines = useMachines()
  return (
    <section className="rounded-xl border p-5" aria-labelledby="settings-local">
      <h3 id="settings-local" className="text-base font-semibold">
        {t('local')}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">{t('localLead')}</p>
      {machines.isSuccess && machines.data.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">{t('none')}</p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {(machines.data ?? []).map((machine) => (
          <li key={machine.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{machine.name}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">{t('roots')}</dt>
              <dd>
                {machine.roots.length === 0 ? (
                  <span className="text-muted-foreground">{t('noRoots')}</span>
                ) : (
                  <ul className="font-mono text-xs">
                    {machine.roots.map((root) => (
                      <li key={root}>{root}</li>
                    ))}
                  </ul>
                )}
              </dd>
              <dt className="text-muted-foreground">{t('sandboxMode')}</dt>
              <dd>{machine.ceiling?.sandbox ?? t('unknown')}</dd>
              <dt className="text-muted-foreground">{t('network')}</dt>
              <dd>
                {machine.ceiling?.network === undefined
                  ? t('unknown')
                  : machine.ceiling.network
                    ? t('allowed')
                    : t('blocked')}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}
