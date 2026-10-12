'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { routes } from '@/lib/workbench/routes'
import { useWorkbench } from '@/lib/workbench/context'

export function SettingsDefaultRoute() {
  const router = useRouter()
  const { locale } = useWorkbench()
  const t = useTranslations('workbench.settings')
  useEffect(() => {
    const section = window.location.hash === '#computer' ? 'computer' : 'cloud'
    router.replace(routes.settingsSection(locale, section), { scroll: false })
  }, [locale, router])
  return (
    <div role="status" className="text-muted-foreground p-8 text-sm">
      {t('title')}
    </div>
  )
}
