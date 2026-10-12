import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SettingsRedirect } from '@/features/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// 旧地址：/workbench/settings（带 #computer 的去「我的电脑」，其余去「云端与模型」）
export default function WorkbenchSettingsPage() {
  return <SettingsRedirect />
}
