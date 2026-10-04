import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProjectScreen } from '@/features/projects'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects.list')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params
  return <ProjectScreen project={project} />
}
