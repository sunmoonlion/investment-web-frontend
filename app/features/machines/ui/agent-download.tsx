'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { fetchAgentDownload } from '../api/client'
import { installCommands } from '../model/onboarding'
import { IssuedCommand } from './agent-setup'

export function AgentDownloadPanel() {
  const t = useTranslations('machines.setup')
  const query = useQuery({
    queryKey: ['agent-download'],
    queryFn: () => fetchAgentDownload(),
    retry: false,
  })
  const release = query.data?.download
  return (
    <section
      id="agent-download"
      className="space-y-3 rounded-xl border p-5"
      aria-label={t('downloadTitle')}
    >
      <h2 className="text-base font-semibold">{t('downloadTitle')}</h2>
      {query.isPending ? (
        <p role="status">{t('loading')}</p>
      ) : query.isError ? (
        <div>
          <p role="alert">{t('downloadFailed')}</p>
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            {t('retryStatus')}
          </button>
        </div>
      ) : !release ? (
        <p>{t('unavailable')}</p>
      ) : (
        <>
          <p>
            {t('packageInfo', {
              version: release.version,
              codex: release.codex_version,
              size: (release.size_bytes / 1048576).toFixed(2),
            })}
          </p>
          <a
            className="inline-block rounded border px-4 py-2 underline"
            href={release.url}
            download="windows-x64.zip"
            referrerPolicy="no-referrer"
          >
            {t('downloadButton')}
          </a>
          <dl className="text-xs break-all">
            <dt>ZIP SHA256</dt>
            <dd className="font-mono">{release.zip_sha256}</dd>
            <dt>{t('manifestSha')}</dt>
            <dd className="font-mono">{release.manifest_sha256}</dd>
          </dl>
          <details id="agent-install" open>
            <summary className="cursor-pointer">{t('installTitle')}</summary>
            <p className="mt-2 text-sm">{t('installHint')}</p>
            <IssuedCommand command={installCommands(release)} />
          </details>
        </>
      )}
      <p className="text-muted-foreground text-xs">{t('developmentOnly')}</p>
    </section>
  )
}
