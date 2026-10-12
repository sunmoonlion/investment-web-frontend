'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'

// 旧地址 /workbench/settings：带 #computer 的（接入电脑的各处链接、旧版代理打开的核对页）去「我的电脑」，
// 其余去「云端与模型」。查询串原样带着：配对码在里面。
export function SettingsRedirect() {
  const t = useTranslations('settings')
  const { locale } = useWorkbench()
  const router = useRouter()
  useEffect(() => {
    const wantsComputer = window.location.hash === '#computer'
    const target = wantsComputer ? routes.computer(locale) : routes.settings(locale)
    router.replace(`${target}${window.location.search}${wantsComputer ? '#computer' : ''}`)
  }, [locale, router])
  return (
    <p className="p-6 text-sm">
      <a href={routes.settings(locale)}>{t('title')}</a>
    </p>
  )
}
