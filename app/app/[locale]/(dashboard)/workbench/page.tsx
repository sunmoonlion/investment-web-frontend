import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LogoutButton } from '@/components/auth/logout-button'
import { SessionList } from '@/components/workbench/session-list'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function WorkbenchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('workbench')
  const tAuth = await getTranslations('auth')
  return (
    <div className="bg-background min-h-screen" data-route-class="authenticated-workspace">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm font-medium">{t('title')}</span>
          <a href={`/${locale}/workbench/settings`} className="text-sm font-medium hover:underline">
            {t('settingsLink')}
          </a>
        </nav>
        <LogoutButton csrfToken={session.csrf_token} locale={locale} label={tAuth('logout')} errorLabel={tAuth('logoutFailed')} />
      </header>
      <main className="space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <SessionList csrfToken={session.csrf_token} locale={locale} />
      </main>
    </div>
  )
}
