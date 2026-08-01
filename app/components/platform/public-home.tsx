import Link from 'next/link'

type PublicHomeProps = {
  locale: string
  title: string
  description: string
  loginLabel: string
  workspaceLabel: string
}

export function PublicHome({
  locale,
  title,
  description,
  loginLabel,
  workspaceLabel,
}: PublicHomeProps) {
  return (
    <main
      className="bg-background flex min-h-screen items-center justify-center px-6"
      data-route-class="public-content"
    >
      <section className="bg-card w-full max-w-2xl space-y-6 rounded-2xl border p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">SunmoonAI Web Platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground max-w-xl">{description}</p>
        </div>
        <nav aria-label={title} className="flex flex-wrap gap-3">
          <Link
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
            href={`/${locale}/login`}
          >
            {loginLabel}
          </Link>
          <Link
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            href={`/${locale}/dashboard`}
          >
            {workspaceLabel}
          </Link>
        </nav>
      </section>
    </main>
  )
}
