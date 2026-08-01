import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError, requestJson } from '@/lib/common/api-client'

describe('common API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects cross-origin and malformed API paths before fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestJson('https://example.com/api/items')).rejects.toThrow(
      'same-origin /api/',
    )
    await expect(requestJson('//example.com/api/items')).rejects.toThrow(
      'same-origin /api/',
    )
    await expect(requestJson('/api\\items')).rejects.toThrow('same-origin /api/')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('adds CSRF and correlation headers to unsafe same-origin requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      requestJson<{ ok: boolean }>('/api/items', {
        method: 'POST',
        csrfToken: 'csrf-value',
        body: { name: 'example' },
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'manual',
        body: JSON.stringify({ name: 'example' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf-value',
          'X-Correlation-ID': expect.any(String),
        }),
      }),
    )
  })

  it('normalizes non-contract error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('upstream failed', { status: 502 })),
    )

    const error = await requestJson('/api/items').catch((value: unknown) => value)
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      status: 502,
      problem: {
        code: 'unexpected_response',
        message_key: 'errors.unexpected',
        retryable: false,
        correlation_id: expect.any(String),
      },
    })
  })
})
