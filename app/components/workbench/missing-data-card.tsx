'use client'

import { useTranslations } from 'next-intl'

// 「没有数据」：我们的数据里还没有这家公司。只说这一句；入库由我们在管理后台做（所有者 2026-10-07 定）。
export function MissingDataCard({ code, dataset }: { code: string; dataset: string | null }) {
  const t = useTranslations('conversation')
  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="font-medium">{t('missing.title', { code })}</p>
      <p className="text-muted-foreground mt-1 text-[13px]">
        {t('missing.body')}
        {dataset ? <span className="font-mono"> {dataset}</span> : null}
      </p>
      <p className="text-muted-foreground mt-1 text-[13px]">{t('missing.later')}</p>
    </div>
  )
}
