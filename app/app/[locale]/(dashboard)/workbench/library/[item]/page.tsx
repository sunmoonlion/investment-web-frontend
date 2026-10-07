import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LibraryItemScreen } from '@/features/library'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('library')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function LibraryItemPage({ params }: { params: Promise<{ item: string }> }) {
  const { item } = await params
  return <LibraryItemScreen item={decodeURIComponent(item)} />
}
