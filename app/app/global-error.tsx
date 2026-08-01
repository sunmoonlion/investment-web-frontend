'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen items-center justify-center">
        <main className="space-y-4 text-center">
          <h1>页面暂时不可用 / Page unavailable</h1>
          <button type="button" onClick={() => unstable_retry()}>
            重试 / Retry
          </button>
        </main>
      </body>
    </html>
  )
}
