import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SettingsScreen } from '@/features/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workbench.settings')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function WorkbenchSettingsPage() {
  return <SettingsScreen />
}
