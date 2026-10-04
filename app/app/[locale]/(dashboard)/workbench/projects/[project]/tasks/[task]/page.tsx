import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { DossierScreen } from '@/features/expert'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('expertHome')
  return { title: t('dossier'), robots: { index: false, follow: false } }
}

// 底稿：专家交回的结果。挂在项目下面。
export default async function DossierPage({
  params,
}: {
  params: Promise<{ project: string; task: string }>
}) {
  const { project, task } = await params
  return <DossierScreen project={project} task={task} />
}
