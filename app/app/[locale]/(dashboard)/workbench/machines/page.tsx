import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MachinesScreen } from '@/features/machines'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('machines')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function MachinesPage() {
  return <MachinesScreen />
}
