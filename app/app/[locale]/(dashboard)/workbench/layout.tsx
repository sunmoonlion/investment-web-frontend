import { WorkbenchShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 工作台的框架：侧栏在左，各页在右。进来先要登录。
export default async function WorkbenchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await requireBrowserSession(locale)
  return (
    <WorkbenchShell csrfToken={session.csrf_token} locale={locale}>
      {children}
    </WorkbenchShell>
  )
}
