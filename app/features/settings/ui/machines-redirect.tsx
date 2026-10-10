'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'

export function MachinesRedirect() {
  const t = useTranslations('machines')
  const { locale } = useWorkbench()
  const href = routes.computer(locale)
  useEffect(() => {
    window.location.replace(href)
  }, [href])
  return (
    <p>
      <a href={href}>{t('title')}</a>
    </p>
  )
}
