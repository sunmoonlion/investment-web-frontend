import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="space-y-3 text-center">
        <p className="text-muted-foreground text-sm">404</p>
        <h1 className="text-2xl font-semibold">页面不存在 / Page not found</h1>
        <Link className="underline underline-offset-4" href="/">
          返回首页 / Return home
        </Link>
      </section>
    </main>
  )
}
