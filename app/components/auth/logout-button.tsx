'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LogoutButtonProps = {
  csrfToken: string
  locale: string
  label: string
  errorLabel: string
}

export function LogoutButton({ csrfToken, locale, label, errorLabel }: LogoutButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function logout() {
    setPending(true)
    setFailed(false)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      })
      if (!response.ok) throw new Error('logout_failed')
      router.replace(`/${locale}/login`)
      router.refresh()
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {failed ? (
        <span className="text-destructive text-sm" role="alert">
          {errorLabel}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={logout}
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  )
}
