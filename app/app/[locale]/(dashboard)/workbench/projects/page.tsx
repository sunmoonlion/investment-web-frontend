import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ProjectListScreen } from '@/features/projects'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects.list')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function ProjectsPage() {
  return <ProjectListScreen />
}
