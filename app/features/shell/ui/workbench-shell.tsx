'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import {
  applySystemAppearance,
  usePersonalPreferences,
} from '@/features/settings/model/personal-preferences'
import { WorkbenchProvider } from '@/lib/workbench/context'
import { useEffect } from 'react'

import { Sidebar } from './sidebar'

// 进了工作台之后的框架：左边侧栏，右边是当前这一页。
export function WorkbenchShell({
  csrfToken,
  locale,
  children,
}: {
  csrfToken: string
  locale: string
  children: React.ReactNode
}) {
  const restorePreferences = usePersonalPreferences((state) => state.restore)
  useEffect(() => {
    restorePreferences(locale === 'en' ? 'en' : 'zh-CN')
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applySystemAppearance)
    return () => media.removeEventListener('change', applySystemAppearance)
  }, [locale, restorePreferences])

  return (
    <WorkbenchProvider csrfToken={csrfToken} locale={locale}>
      <TooltipProvider>
        <div
          className="bg-background flex h-dvh overflow-hidden"
          data-route-class="authenticated-workspace"
        >
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </TooltipProvider>
    </WorkbenchProvider>
  )
}
