import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { LogoutButton } from '@/components/auth/logout-button'
import { TaskDossier } from '@/components/workbench/task-dossier'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench.dossier')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function DossierPage({ params }: { params: Promise<{ locale: string; sessionId: string; taskId: string }> }) {
  const { locale, sessionId, taskId } = await params
  if (!UUID.test(sessionId) || !UUID.test(taskId)) notFound()
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('workbench')
  const tAuth = await getTranslations('auth')
  return (
    <div className="bg-background min-h-screen" data-route-class="authenticated-workspace">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href={`/${locale}/workbench/${sessionId}`} className="text-muted-foreground text-sm font-medium hover:underline">
          ← {t('sessionTitle')}
        </Link>
        <LogoutButton csrfToken={session.csrf_token} locale={locale} label={tAuth('logout')} errorLabel={tAuth('logoutFailed')} />
      </header>
      <main className="space-y-6 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('dossier.title')}</h1>
        <TaskDossier taskId={taskId} csrfToken={session.csrf_token} />
      </main>
    </div>
  )
}
