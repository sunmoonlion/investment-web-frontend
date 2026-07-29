'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const t = useTranslations('common')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="space-y-4 text-center" role="alert">
        <h1 className="text-2xl font-semibold">{t('error')}</h1>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium"
          type="button"
          onClick={() => unstable_retry()}
        >
          {t('retry')}
        </button>
      </section>
    </main>
  )
}
