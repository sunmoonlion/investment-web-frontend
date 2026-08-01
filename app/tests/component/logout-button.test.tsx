import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogoutButton } from '@/components/auth/logout-button'

const replace = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

describe('LogoutButton', () => {
  beforeEach(() => {
    replace.mockReset()
    refresh.mockReset()
    vi.restoreAllMocks()
  })

  it('uses POST with the session CSRF token and then returns to login', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    render(
      <LogoutButton
        csrfToken="csrf-token-value-that-is-long-enough-1234"
        locale="en"
        label="Logout"
        errorLabel="Logout failed"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/login'))
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': 'csrf-token-value-that-is-long-enough-1234',
      },
    })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not redirect when logout is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }))
    render(
      <LogoutButton
        csrfToken="csrf-token-value-that-is-long-enough-1234"
        locale="en"
        label="Logout"
        errorLabel="Logout failed"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Logout failed')
    expect(replace).not.toHaveBeenCalled()
  })
})
