import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MemoryScreen } from '@/features/memory'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('memory')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function MemoryPage() {
  return <MemoryScreen />
}
