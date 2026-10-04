'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { CrossAppLink } from '@/components/common/cross-app-link'

// 「没有数据」：我们的数据里没有这家公司。给一条去 info 申请入库的路。
export function MissingDataCard({ code, dataset }: { code: string; dataset: string | null }) {
  const t = useTranslations('conversation')
  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium">{t('missing.title', { code })}</p>
      <p className="text-muted-foreground mt-1 text-[13px]">
        {t('missing.body')}
        {dataset ? <span className="font-mono"> {dataset}</span> : null}
      </p>
      <CrossAppLink
        to="info.request"
        values={{ code }}
        className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-3"
        fallback={<p className="text-muted-foreground mt-2 text-[13px]">{t('missing.noLink')}</p>}
      >
        {t('missing.request')}
        <ArrowUpRightIcon className="size-3.5" />
      </CrossAppLink>
    </div>
  )
}
