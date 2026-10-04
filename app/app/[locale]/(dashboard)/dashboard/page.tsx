import { redirect } from 'next/navigation'

import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 登录之后默认到这里。investment 的首页是工作台：直接过去。
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireBrowserSession(locale)
  redirect(`/${locale}/workbench`)
}
