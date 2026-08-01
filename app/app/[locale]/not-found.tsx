'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function LocaleNotFound() {
  const t = useTranslations('errors')

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="space-y-3 text-center">
        <p className="text-muted-foreground text-sm">404</p>
        <h1 className="text-2xl font-semibold">{t('notFoundTitle')}</h1>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Link className="underline underline-offset-4" href="/">
          {t('returnHome')}
        </Link>
      </section>
    </main>
  )
}
