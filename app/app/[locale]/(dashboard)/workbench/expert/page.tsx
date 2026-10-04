import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ExpertHomeScreen } from '@/features/expert'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('expertHome')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function ExpertHomePage() {
  return <ExpertHomeScreen />
}
