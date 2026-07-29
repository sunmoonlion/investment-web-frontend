import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { createContentSecurityPolicy } from './lib/security/content-security-policy'

const routeByLocale = createMiddleware(routing)

// Next 16 calls this request-bound routing boundary Proxy. It composes locale
// routing with a per-request CSP nonce. Authentication and authorization stay
// in the product API or server-side data layer and are never delegated here.
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const policy = createContentSecurityPolicy(nonce)
  request.headers.set('x-nonce', nonce)
  request.headers.set('Content-Security-Policy', policy)

  const response = routeByLocale(request)
  response.headers.set('Content-Security-Policy', policy)
  return response
}

// Keep the matcher narrow so static assets and internal Next routes are not
// redirected by locale negotiation.
export const config = {
  matcher: ['/', '/(en|zh-CN)/:path*'],
}
