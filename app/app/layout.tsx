import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'investment App',
  description: 'investment web application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  )
}
