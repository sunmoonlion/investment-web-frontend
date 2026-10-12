import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LocalLibraryScreen } from '@/features/local-library'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('localLibrary')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function LocalLibraryPage() {
  return <LocalLibraryScreen />
}
