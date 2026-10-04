'use client'

import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { MissingDataCard } from '@/components/workbench/missing-data-card'
import type { Review } from '@/contracts/workbench-v2'

// 审查面：专家停下来问我。为什么停、哪几条没过、每个选项选了会怎样、问题保留到什么时候。
// 这些话都是后端写的；页面不自己编「选了会怎样」。
export function ReviewPanel({
  review,
  token,
  answering,
  failed,
  onAnswer,
}: {
  review: Review
  token: string | null
  answering: boolean
  failed: boolean
  onAnswer: (decision: string) => void
}) {
  const t = useTranslations('expert')
  const format = useFormatter()
  const pending = review.pending
  const chosen = review.decision.decided
    ? (pending.options.find((option) => option.id === review.decision.chosen)?.label ??
      review.decision.chosen)
    : null
  return (
    <section
      aria-label={pending.title}
      className="mx-6 mb-6 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <header>
        <h3 className="text-sm font-semibold">{pending.title}</h3>
        {review.why ? <p className="mt-1 text-[13px]">{review.why}</p> : null}
      </header>

      {review.failed.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-xs font-medium">{t('review.failed')}</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {review.failed.map((check) => (
              <li key={check.label}>
                <span className="text-destructive font-medium">{check.label}</span>
                {check.message ? `：${check.message}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.missing_data ? (
        <MissingDataCard
          code={review.missing_data.security_code}
          dataset={review.missing_data.dataset}
        />
      ) : null}

      {chosen !== null ? (
        <p className="text-[13px] font-medium">{t('review.decided', { choice: chosen ?? '' })}</p>
      ) : (
        <div>
          <p className="text-muted-foreground text-xs font-medium">{t('review.choose')}</p>
          <p className="mt-1 text-[13px]">{pending.question}</p>
          <ul className="mt-2 space-y-2">
            {pending.options.map((option) => (
              <li key={option.id} className="flex items-start gap-3">
                <Button
                  size="sm"
                  variant={option.id === 'stop' || option.id === 'decline' ? 'outline' : 'default'}
                  disabled={answering || token === null}
                  onClick={() => onAnswer(option.id)}
                  className="shrink-0"
                >
                  {option.label}
                </Button>
                <span className="text-muted-foreground pt-1 text-[13px]">{option.consequence}</span>
              </li>
            ))}
          </ul>
          {token === null ? (
            <p className="text-destructive mt-2 text-[13px]">{t('review.noToken')}</p>
          ) : null}
          {failed ? (
            <p role="alert" className="text-destructive mt-2 text-[13px]">
              {t('review.failedToSend')}
            </p>
          ) : null}
        </div>
      )}

      {review.validity.expires_at && chosen === null ? (
        <p className="text-muted-foreground border-t border-amber-200 pt-2 text-xs dark:border-amber-900">
          {t('review.expires', {
            date: format.dateTime(new Date(review.validity.expires_at), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}
          {review.validity.after_expiry}
        </p>
      ) : null}
    </section>
  )
}
