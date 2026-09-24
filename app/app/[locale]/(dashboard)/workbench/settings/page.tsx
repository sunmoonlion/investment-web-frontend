import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { LogoutButton } from '@/components/auth/logout-button'
import { SettingsPanel } from '@/components/workbench/settings-panel'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench.settings')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function WorkbenchSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
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
      <main className="space-y-6 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <SettingsPanel csrfToken={session.csrf_token} />
      </main>
    </div>
  )
}
