import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { HomeScreen } from '@/features/home'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell')
  return { title: t('brand'), robots: { index: false, follow: false } }
}

export default function WorkbenchHomePage() {
  return <HomeScreen />
}
