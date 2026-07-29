import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AgentConsole } from '@/components/agent/agent-console'
import { LogoutButton } from '@/components/auth/logout-button'
import { ReferenceWorkspace } from '@/components/platform/reference-workspace'
import { serverEnv } from '@/env/server'
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

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
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
        <AgentConsole />
        {serverEnv.REFERENCE_UI_ENABLED ? (
          <ReferenceWorkspace
            runId="00000000-0000-5000-8000-000000000001"
            csrfToken={session.csrf_token}
          />
        ) : null}
      </main>
    </div>
  )
}
