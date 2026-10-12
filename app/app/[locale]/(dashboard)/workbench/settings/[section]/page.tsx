import { notFound } from 'next/navigation'
import { SettingsScreen, type SettingsSection } from '@/features/settings/ui/settings-screen'

const SECTIONS: SettingsSection[] = ['preferences', 'cloud', 'computer']

export default async function WorkbenchSettingsSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>
}) {
  const { section } = await params
  if (!SECTIONS.includes(section as SettingsSection)) notFound()
  return <SettingsScreen section={section as SettingsSection} />
}
