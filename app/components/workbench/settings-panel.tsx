'use client'

// 设置（F-WEB-01）：key 只提交一次，页面不留、不回显；模型与审批策略进新会话的 thread 设置。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import type { Prefs } from '@/contracts/workbench'
import {
  addCredential,
  deprovisionSandbox,
  fetchPrefs,
  listCredentials,
  provisionSandbox,
  provisionedSandboxStatus,
  revokeCredential,
  savePrefs,
  rotateRelayIdentity,
} from '@/lib/workbench/client'

const POLICIES: Prefs['approval_policy'][] = ['untrusted', 'on-request', 'on-failure', 'never']

export function SettingsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const prefs = useQuery({ queryKey: ['wb-prefs'], queryFn: () => fetchPrefs() })
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <KeysSection csrfToken={csrfToken} />
      <SandboxSection csrfToken={csrfToken} />
      {prefs.data ? (
        <ThreadSection
          key={`${prefs.data.model ?? ''}|${prefs.data.approval_policy}`}
          csrfToken={csrfToken}
          initial={prefs.data}
        />
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
    mutationFn: () =>
      savePrefs({ model: model.trim() || null, approval_policy: policy }, csrfToken),
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
          <input
            className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal"
            value={model}
            placeholder="kimi-k3"
            onChange={(e) => setModel(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          {t('approvalPolicy')}
          <select
            className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal"
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
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={save.isPending}
        >
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
          <input
            className="bg-background mt-1 w-full rounded-lg border px-3 py-2 font-normal"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
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
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
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
            <span>
              {c.provider} · ****{c.hint} · {c.status === 'active' ? t('active') : t('revoked')}
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

function SandboxSection({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['wb-provisioned'],
    queryFn: () => provisionedSandboxStatus(),
    refetchInterval: 5000,
  })
  const [issued, setIssued] = useState<{ url: string; user: string; token: string } | null>(null)
  // 每个动作做完都给一句人话（做了什么、接下来会看到什么）；失败也在这里说（KIND 09：点了没反应，用户不知道成没成）
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirming, setConfirming] = useState<'rotate' | 'delete' | null>(null)
  const errorText = (error: unknown) => {
    const code = (error as Error).message
    return code === 'sandbox_capacity_full' ? t('sandboxCapacityFull') : t('error', { code })
  }
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['wb-provisioned'] })
    void queryClient.invalidateQueries({ queryKey: ['wb-sandboxes'] })
  }
  const state = status.data?.status ?? 'absent'
  const live = state === 'ready' || state === 'starting'
  const provision = useMutation({
    mutationFn: () => provisionSandbox(csrfToken),
    onMutate: () => setNotice(null),
    onSuccess: (result) => {
      const fresh = Boolean(result.relay?.agent_token)
      if (result.relay?.agent_token)
        setIssued({
          url: result.relay.url,
          user: result.relay.user,
          token: result.relay.agent_token,
        })
      setNotice({
        tone: 'ok',
        text: fresh ? t('noticeProvisioned') : live ? t('noticeUpdated') : t('noticeRestored'),
      })
      refresh()
    },
    onError: (error) => setNotice({ tone: 'error', text: errorText(error) }),
  })
  const remove = useMutation({
    mutationFn: () => deprovisionSandbox(csrfToken),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setIssued(null)
      setNotice({ tone: 'ok', text: t('noticeDeleted') })
      refresh()
    },
    onError: (error) => setNotice({ tone: 'error', text: errorText(error) }),
  })
  const rotate = useMutation({
    mutationFn: () => rotateRelayIdentity(csrfToken),
    onMutate: () => setNotice(null),
    onSuccess: (result) => {
      if (result.relay?.agent_token)
        setIssued({
          url: result.relay.url,
          user: result.relay.user,
          token: result.relay.agent_token,
        })
      setNotice({ tone: 'ok', text: t('noticeRotated') })
      refresh()
    },
    onError: (error) => setNotice({ tone: 'error', text: errorText(error) }),
  })
  const hasIdentity = Boolean(status.data?.relay_user)
  const busy = provision.isPending || remove.isPending || rotate.isPending
  return (
    <section
      className="bg-card rounded-2xl border p-6 shadow-sm lg:col-span-2"
      aria-labelledby="settings-sandbox"
    >
      <h2 id="settings-sandbox" className="text-xl font-semibold">
        {t('sandbox')}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('sandboxHint')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border px-3 py-1 text-xs" data-sandbox-status={state}>
          {t(
            `sandboxStatus.${['absent', 'starting', 'ready', 'deleted'].includes(state) ? state : 'starting'}` as 'sandboxStatus.absent',
          )}
        </span>
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={busy}
          onClick={() => provision.mutate()}
        >
          {provision.isPending
            ? live
              ? t('updating')
              : t('provisioning')
            : live
              ? t('sandboxUpdate')
              : t('sandboxProvision')}
        </button>
        {live ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy}
            onClick={() => setConfirming('delete')}
          >
            {remove.isPending ? t('deleting') : t('sandboxDelete')}
          </button>
        ) : null}
        {hasIdentity ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy}
            onClick={() => setConfirming('rotate')}
            title={t('rotateHint')}
          >
            {rotate.isPending ? t('rotating') : t('rotateToken')}
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div
          className="mt-3 rounded-lg border border-amber-300 p-3 text-sm"
          role="alertdialog"
          data-confirm={confirming}
        >
          <p>{confirming === 'rotate' ? t('confirmRotate') : t('confirmDelete')}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm"
              onClick={() => {
                const action = confirming
                setConfirming(null)
                if (action === 'rotate') rotate.mutate()
                else remove.mutate()
              }}
            >
              {confirming === 'rotate' ? t('confirmRotateYes') : t('confirmDeleteYes')}
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => setConfirming(null)}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : null}
      {notice ? (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm ${notice.tone === 'error' ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'}`}
          data-notice={notice.tone}
        >
          {notice.text}
        </p>
      ) : null}
      {issued ? (
        <div
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/30"
          data-agent-token-issued
        >
          <p className="font-medium">{t('agentTokenTitle')}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t('agentTokenHint')}</p>
          <IssuedCommand
            command={`sunmoon-agent init --relay ${issued.url} --user ${issued.user} --token ${issued.token} --root <你的研究目录>`}
          />
        </div>
      ) : null}
    </section>
  )
}

// 只显示一次的接入命令：一键复制并给出"已复制"；浏览器不给剪贴板权限（如非 https）时退回为整段选中，让用户手动复制
function IssuedCommand({ command }: { command: string }) {
  const t = useTranslations('workbench.settings')
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const selectAll = () => {
    const el = preRef.current
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied('ok')
    } catch {
      selectAll()
      setCopied('manual')
    }
  }
  return (
    <div className="mt-2">
      <pre
        ref={preRef}
        className="bg-background overflow-x-auto rounded p-2 text-xs"
        data-issued-command
      >
        {command}
      </pre>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium"
          onClick={() => void copy()}
        >
          {t('copyCommand')}
        </button>
        {copied === 'ok' ? (
          <span role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {t('copied')}
          </span>
        ) : null}
        {copied === 'manual' ? (
          <span role="status" className="text-muted-foreground text-sm">
            {t('copyManual')}
          </span>
        ) : null}
      </div>
    </div>
  )
}
