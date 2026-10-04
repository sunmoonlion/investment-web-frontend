import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ReviewScreen } from '@/features/expert'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reviewPage')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function ReviewPage({ params }: { params: Promise<{ pending: string }> }) {
  const { pending } = await params
  return <ReviewScreen pending={pending} />
}
