'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { type SignedInUser, WorkbenchProvider } from '@/lib/workbench/context'

import { Sidebar } from './sidebar'

// 进了工作台之后的框架：左边侧栏，右边是当前这一页。
export function WorkbenchShell({
  csrfToken,
  locale,
  user,
  children,
}: {
  csrfToken: string
  locale: string
  user?: SignedInUser
  children: React.ReactNode
}) {
  return (
    <WorkbenchProvider csrfToken={csrfToken} locale={locale} user={user}>
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
