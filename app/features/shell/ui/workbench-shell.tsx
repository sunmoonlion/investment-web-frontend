'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkbenchProvider } from '@/lib/workbench/context'

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
