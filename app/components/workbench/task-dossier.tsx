'use client'

// 底稿（F-WEB-05）：结果、证据（引用与数据版本）、交回物、工作区变更；结论栏是用户草稿。不渲染任何评级、目标价字段。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { ArtifactWithContent } from '@/contracts/workbench'
import { fetchArtifacts, fetchTask, saveConclusion } from '@/lib/workbench/client'

// 结论栏之外绝不显示的字段名（评级、目标价一类），即便交回物里出现也不渲染
export const FORBIDDEN_FIELDS = new Set(['rating', 'target_price', 'targetPrice', 'recommendation', 'buy_sell', 'evaluation_grade'])

export function stripForbidden(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripForbidden)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_FIELDS.has(k)) continue
      out[k] = stripForbidden(v)
    }
    return out
  }
  return value
}

function pick(artifacts: ArtifactWithContent[], name: string): ArtifactWithContent | undefined {
  return artifacts.find((a) => a.name === name)
}

export function TaskDossier({ taskId, csrfToken }: { taskId: string; csrfToken: string }) {
  const t = useTranslations('workbench.dossier')
  const queryClient = useQueryClient()
  const task = useQuery({ queryKey: ['wb-task', taskId], queryFn: () => fetchTask(taskId) })
  const artifacts = useQuery({ queryKey: ['wb-artifacts', taskId], queryFn: () => fetchArtifacts(taskId) })
  const arts = artifacts.data ?? []
  const result = pick(arts, 'note') ?? pick(arts, 'answer') ?? pick(arts, 'table')
  const handback = pick(arts, 'handback')
  const conclusion = pick(arts, 'conclusion')
  const savedText = (conclusion?.content as { text?: string } | undefined)?.text ?? ''
  const [edited, setEdited] = useState<string | null>(null)
  const draft = edited ?? savedText
  const save = useMutation({
    mutationFn: () => saveConclusion(taskId, draft, csrfToken),
    onSuccess: () => {
      setEdited(null)
      void queryClient.invalidateQueries({ queryKey: ['wb-artifacts', taskId] })
    },
  })
  const content = (stripForbidden(result?.content) ?? {}) as Record<string, unknown>
  const citations = Array.isArray(content.citations) ? (content.citations as unknown[]) : []
  const limitations = Array.isArray(content.limitations) ? (content.limitations as unknown[]) : []
  const table = Array.isArray(content.table) ? (content.table as Record<string, unknown>[]) : []
  const hb = (handback?.content ?? {}) as Record<string, unknown>

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="dossier-result">
          <h2 id="dossier-result" className="text-xl font-semibold">
            {t('result')}
          </h2>
          {task.data ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {task.data.task.profile_id} · {task.data.task.state} · {task.data.task.budget.used} / {task.data.task.budget.limit} {task.data.task.budget.currency}
            </p>
          ) : null}
          {result ? (
            <>
              {typeof content.answer === 'string' ? <p className="mt-4 whitespace-pre-wrap text-sm">{content.answer}</p> : null}
              {table.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {Object.keys(table[0]).map((k) => (
                          <th key={k} className="border-b px-2 py-1 text-left font-medium">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((row, i) => (
                        <tr key={i}>
                          {Object.keys(table[0]).map((k) => (
                            <td key={k} className="border-b px-2 py-1">
                              {String(row[k] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {limitations.length ? (
                <ul className="text-muted-foreground mt-4 list-disc pl-5 text-xs">
                  {limitations.map((l, i) => (
                    <li key={i}>{String(l)}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">{t('noResult')}</p>
          )}
        </section>

        <section className="bg-card rounded-2xl border p-6 shadow-sm" aria-labelledby="dossier-conclusion">
          <h2 id="dossier-conclusion" className="text-xl font-semibold">
            {t('conclusion')}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">{t('conclusionHint')}</p>
          <textarea
            aria-label={t('conclusion')}
            className="bg-background mt-3 w-full rounded-lg border px-3 py-2 text-sm"
            rows={5}
            value={draft}
            placeholder={t('conclusionPlaceholder')}
            onChange={(e) => setEdited(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" disabled={save.isPending} onClick={() => save.mutate()}>
              {t('saveDraft')}
            </button>
            <span className="text-muted-foreground text-xs" data-conclusion-status={conclusion ? 'draft' : 'empty'}>
              {conclusion ? t('draftVersion', { version: conclusion.version }) : t('draftEmpty')}
            </span>
            {save.error ? (
              <p role="alert" className="text-destructive text-xs">
                {String((save.error as Error).message)}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bg-card rounded-2xl border p-4 shadow-sm" aria-labelledby="dossier-evidence">
          <h2 id="dossier-evidence" className="text-lg font-semibold">
            {t('evidence')}
          </h2>
          {citations.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {citations.map((c, i) => (
                <li key={i} className="rounded border px-2 py-1 break-all">
                  {typeof c === 'string' ? c : JSON.stringify(c)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">{t('noEvidence')}</p>
          )}
        </section>
        <section className="bg-card rounded-2xl border p-4 shadow-sm" aria-labelledby="dossier-artifacts">
          <h2 id="dossier-artifacts" className="text-lg font-semibold">
            {t('artifacts')}
          </h2>
          <ul className="mt-2 space-y-1 text-xs">
            {arts.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  {a.name} <span className="text-muted-foreground">v{a.version} · {a.kind}</span>
                </span>
                <span className="text-muted-foreground font-mono">{a.digest.slice(0, 10)}</span>
              </li>
            ))}
            {arts.length === 0 ? <li className="text-muted-foreground">{t('noArtifacts')}</li> : null}
          </ul>
        </section>
        <section className="bg-card rounded-2xl border p-4 shadow-sm" aria-labelledby="dossier-workspace">
          <h2 id="dossier-workspace" className="text-lg font-semibold">
            {t('workspace')}
          </h2>
          <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">{typeof hb.workspace_restore === 'string' ? hb.workspace_restore : t('noWorkspaceChanges')}</p>
          {Array.isArray(hb.did) && hb.did.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {(hb.did as unknown[]).map((d, i) => (
                <li key={i}>{String(d)}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </aside>
    </div>
  )
}
