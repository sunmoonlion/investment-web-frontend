import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LibraryScreen } from '@/features/library'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('library')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function LibraryPage() {
  return <LibraryScreen />
}
