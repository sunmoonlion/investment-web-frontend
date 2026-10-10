import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MachinesRedirect } from '@/features/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('machines')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function MachinesPage() {
  return <MachinesRedirect />
}
