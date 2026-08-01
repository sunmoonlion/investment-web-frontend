import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LogoutButton } from '@/components/auth/logout-button'
import { ResearchWorkspace } from '@/components/research/research-workspace'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('workspaceTitle'),
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ run?: string | string[] }>
}) {
  const { locale } = await params
  const { run } = await searchParams
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('auth')
  const tNav = await getTranslations('nav')

  return (
    <div className="bg-background min-h-screen" data-route-class="authenticated-workspace">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-muted-foreground text-sm font-medium">{tNav('dashboard')}</span>
        <LogoutButton
          csrfToken={session.csrf_token}
          locale={locale}
          label={t('logout')}
          errorLabel={t('logoutFailed')}
        />
      </header>
      <main className="space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tNav('dashboard')}</h1>
          <p className="text-muted-foreground mt-2">{t('dashboardWelcome')}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('signedInAs', {
              name: session.user.display_name ?? session.user.email ?? session.user.actor_id,
            })}
          </p>
        </div>
        <ResearchWorkspace
          initialRunId={typeof run === 'string' && UUID_PATTERN.test(run) ? run : null}
          csrfToken={session.csrf_token}
        />
      </main>
    </div>
  )
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
