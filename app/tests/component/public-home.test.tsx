import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublicHome } from '@/components/platform/public-home'

describe('PublicHome', () => {
  it('renders semantic navigation without product-specific content', () => {
    render(
      <PublicHome
        locale="en"
        title="Platform home"
        description="Neutral template content"
        loginLabel="Sign in"
        workspaceLabel="Open workspace"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Platform home' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Platform home' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/en/login')
    expect(screen.getByRole('link', { name: 'Open workspace' })).toHaveAttribute(
      'href',
      '/en/dashboard',
    )
  })
})
