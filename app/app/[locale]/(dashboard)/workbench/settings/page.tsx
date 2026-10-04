import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SettingsPanel } from '@/components/workbench/settings-panel'
import { requireBrowserSession } from '@/lib/server/auth-session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench.settings')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// 设置页还是第一期的样子，只是放进了新的框架里。第 7 步后面的段落里重做。
export default async function WorkbenchSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('workbench')
  return (
    <div className="h-full space-y-6 overflow-y-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
      <SettingsPanel csrfToken={session.csrf_token} />
    </div>
  )
}
