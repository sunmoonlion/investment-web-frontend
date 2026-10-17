import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { defaultLocale } from '@/i18n'
import { PlatformProviders } from '@/components/platform/providers'
import { PREFERENCES_BOOT_SCRIPT } from '@/lib/preferences-boot'
import './globals.css'

export const metadata: Metadata = {
  title: 'knowbench App',
  description: 'knowbench web application',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // A request-bound render is required so Next can propagate the nonce from
  // Proxy to framework scripts and styles. Do not remove while CSP uses nonce.
  await connection()
  // 个人偏好（外观、主题色）在画第一帧前就套上；脚本要带 Proxy 发的 nonce 才过 CSP
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang={defaultLocale} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PlatformProviders>{children}</PlatformProviders>
      </body>
    </html>
  )
}
