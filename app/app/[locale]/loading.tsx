'use client'

import { useTranslations } from 'next-intl'

export default function Loading() {
  const t = useTranslations('common')

  return (
    <main className="flex min-h-screen items-center justify-center" aria-busy="true">
      <p className="text-muted-foreground text-sm">{t('loading')}</p>
    </main>
  )
}
