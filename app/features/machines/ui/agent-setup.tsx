'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'
import type { ProvisionedSandbox } from '@/contracts/workbench-settings'
import { deprovisionSandbox, provisionSandbox, rotateRelayIdentity } from '../api/client'
import { useAgentStatus } from '../api/status'
import { initCommand } from '../model/onboarding'

export function AgentSetup({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('workbench.settings')
  const u = useTranslations('machines.setup')
  const format = useFormatter()
  const { locale } = useWorkbench()
  const queryClient = useQueryClient()
  const status = useAgentStatus()
  const [issued, setIssued] = useState<{
    url: string
    user: string
    token: string
    expires: string | null
  } | null>(null)
  useEffect(() => {
    if (!issued) return
    const clear = () => setIssued(null)
    const timer = window.setTimeout(clear, 5 * 60 * 1000)
    window.addEventListener('pagehide', clear)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', clear)
    }
  }, [issued])
  const issue = async (action: () => Promise<ProvisionedSandbox>) => {
    setIssued(null)
    const result = await action()
    if (result.relay?.agent_token)
      setIssued({
        url: result.relay.url,
        user: result.relay.user,
        token: result.relay.agent_token,
        expires: result.relay.agent_token_expires_at ?? null,
      })
    // React Query mutation cache must never keep the issued credential.
    return { fresh: Boolean(result.relay?.agent_token) }
  }
  // 每个动作做完都给一句人话（做了什么、接下来会看到什么）；失败也在这里说（KIND 09：点了没反应，用户不知道成没成）
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirming, setConfirming] = useState<'rotate' | 'delete' | null>(null)
  const [rotationRevision, setRotationRevision] = useState<string | null>(null)
  const errorText = (error: unknown) => {
    const code = (error as Error).message
    if (['relay_identity_changed', 'relay_identity_busy'].includes(code))
      return u('refreshRequired')
    if (code === 'no_active_credential') return u('needKey')
    return code === 'sandbox_capacity_full'
      ? t('sandboxCapacityFull')
      : u('operationFailed', { code })
  }
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['wb-provisioned'] })
    void queryClient.invalidateQueries({ queryKey: ['wb-sandboxes'] })
    void queryClient.invalidateQueries({ queryKey: ['workbench', 'sandboxes'] })
  }
  const state = status.data?.status ?? 'absent'
  const live = state === 'ready' || state === 'starting'
  const provision = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: () => issue(() => provisionSandbox(csrfToken)),
    onMutate: () => setNotice(null),
    onSuccess: (result) => {
      const fresh = result.fresh
      setNotice({
        tone: 'ok',
        text: fresh ? t('noticeProvisioned') : live ? t('noticeUpdated') : t('noticeRestored'),
      })
      refresh()
    },
    onError: (error) => {
      setNotice({ tone: 'error', text: errorText(error) })
      refresh()
    },
  })
  const remove = useMutation({
    retry: false,
    mutationFn: () => deprovisionSandbox(csrfToken),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setIssued(null)
      setNotice({ tone: 'ok', text: t('noticeDeleted') })
      refresh()
    },
    onError: (error) => {
      setNotice({ tone: 'error', text: errorText(error) })
      refresh()
    },
  })
  const rotate = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: () => {
      if (!rotationRevision) throw new Error('relay_identity_changed')
      return issue(() => rotateRelayIdentity(csrfToken, rotationRevision))
    },
    onMutate: () => {
      setNotice(null)
      setIssued(null)
    },
    onSuccess: () => {
      setNotice({ tone: 'ok', text: t('noticeRotated') })
      refresh()
    },
    onError: (error) => {
      setNotice({ tone: 'error', text: errorText(error) })
      refresh()
    },
  })
  const hasIdentity = Boolean(status.data?.relay_user)
  const busy = provision.isPending || remove.isPending || rotate.isPending
  const expiry = issued?.expires ?? status.data?.agent_token_expires_at
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <section id="agent-token" className="rounded-xl border p-5" aria-labelledby="settings-sandbox">
      <h2 id="settings-sandbox" className="text-base font-semibold">
        {u('tokenTitle')}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('sandboxHint')}</p>
      <Link href={routes.settings(locale)} className="text-sm underline">
        {u('toSettings')}
      </Link>
      <p className="mt-2 text-sm">{u('oneMachine')}</p>
      <p className="text-muted-foreground text-sm">
        {u('expires', { value: expiry ? date(expiry) : u('unknownExpiry') })}
      </p>
      {status.isError ? <p role="alert">{u('statusFailed')}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border px-3 py-1 text-xs" data-sandbox-status={state}>
          {t(
            `sandboxStatus.${['absent', 'starting', 'ready', 'deleted'].includes(state) ? state : 'starting'}` as 'sandboxStatus.absent',
          )}
        </span>
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={busy || status.isPending || status.isError}
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
            disabled={busy || status.isPending || status.isError}
            onClick={() => setConfirming('delete')}
          >
            {remove.isPending ? t('deleting') : t('sandboxDelete')}
          </button>
        ) : null}
        {hasIdentity && status.data?.identity_revision ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy || status.isPending || status.isError}
            onClick={() => {
              setRotationRevision(status.data!.identity_revision!)
              setConfirming('rotate')
            }}
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
              disabled={busy || status.isError}
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
          <IssuedCommand command={initCommand(issued.url, issued.user)} />
          <TokenValue token={issued.token} />
          <button type="button" className="mt-2 underline" onClick={() => setIssued(null)}>
            {u('clearToken')}
          </button>
          <p className="mt-2 text-xs">{u('afterInit')}</p>
        </div>
      ) : null}
    </section>
  )
}

// 只显示一次的接入命令：一键复制并给出"已复制"；浏览器不给剪贴板权限（如非 https）时退回为整段选中，让用户手动复制
export function IssuedCommand({ command }: { command: string }) {
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

function TokenValue({ token }: { token: string }) {
  const t = useTranslations('machines.setup')
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } catch {
      input.current?.focus()
      input.current?.select()
    }
  }
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-sm">
        {t('tokenLabel')}
        <input
          ref={input}
          className="w-full rounded border p-2 font-mono"
          type={shown ? 'text' : 'password'}
          value={token}
          readOnly
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button type="button" className="mr-3 underline" onClick={() => setShown(!shown)}>
        {shown ? t('hideToken') : t('showToken')}
      </button>
      <button type="button" className="underline" onClick={() => void copy()}>
        {t('copyToken')}
      </button>
      {copied ? <p role="status">{t('tokenCopied')}</p> : null}
      <p className="text-xs">{t('tokenMemory')}</p>
    </div>
  )
}
