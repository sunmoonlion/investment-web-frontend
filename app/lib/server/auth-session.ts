import 'server-only'

import { randomUUID } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverEnv } from '@/env/server'
import { loadBrowserSession } from '@/lib/auth/browser-session'
import { loginPath } from '@/lib/auth/next-path'

export async function getBrowserSession() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ')
  const incomingCorrelationId = requestHeaders.get('x-correlation-id')
  const correlationId =
    incomingCorrelationId && /^[A-Za-z0-9._:-]{8,128}$/.test(incomingCorrelationId)
      ? incomingCorrelationId
      : randomUUID()

  return loadBrowserSession({
    backendUrl: serverEnv.BACKEND_INTERNAL_URL,
    cookieHeader,
    correlationId,
    expectedApp: serverEnv.AUTH_APP,
  })
}

// next：登录完回到哪（本语言下的路径，可带参数）。不给就回默认页
export async function requireBrowserSession(locale: string, next?: string) {
  const session = await getBrowserSession()
  if (!session) redirect(loginPath(locale, next))
  return session
}
