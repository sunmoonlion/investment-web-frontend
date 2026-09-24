import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { LogoutButton } from '@/components/auth/logout-button'
import { SessionConsole } from '@/components/workbench/session-console'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench')
  return { title: t('sessionTitle'), robots: { index: false, follow: false } }
}

export default async function SessionPage({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, sessionId } = await params
  if (!UUID.test(sessionId)) notFound()
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('workbench')
  const tAuth = await getTranslations('auth')
  return (
    <div className="bg-background min-h-screen" data-route-class="authenticated-workspace">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href={`/${locale}/workbench`} className="text-muted-foreground text-sm font-medium hover:underline">
          ← {t('title')}
        </Link>
        <LogoutButton csrfToken={session.csrf_token} locale={locale} label={tAuth('logout')} errorLabel={tAuth('logoutFailed')} />
      </header>
      <main className="p-8">
        <SessionConsole sessionId={sessionId} csrfToken={session.csrf_token} />
      </main>
    </div>
  )
}
