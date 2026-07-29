import { describe, expect, it } from 'vitest'

import {
  assertSameOriginDownloadPath,
  normalizePageQuery,
  pageQueryKey,
  safeDownloadFilename,
} from '@/lib/common/query'

describe('common query helpers', () => {
  it('normalizes pagination, search and sort input deterministically', () => {
    const query = normalizePageQuery({
      page: -4,
      pageSize: 999,
      search: `  ${'x'.repeat(300)}  `,
      sort: ` ${'s'.repeat(80)} `,
      direction: 'desc',
    })

    expect(query).toEqual({
      page: 1,
      pageSize: 200,
      search: 'x'.repeat(256),
      sort: 's'.repeat(64),
      direction: 'desc',
    })
    expect(pageQueryKey('documents', 'tenant-a', query)).toEqual([
      'web',
      'documents',
      'tenant-a',
      query,
    ])
  })

  it('allows only same-origin API download paths', () => {
    expect(assertSameOriginDownloadPath('/api/files/1')).toBe('/api/files/1')
    expect(() => assertSameOriginDownloadPath('https://example.com/file')).toThrow(
      'same-origin /api/',
    )
    expect(() => assertSameOriginDownloadPath('//example.com/file')).toThrow(
      'same-origin /api/',
    )
  })

  it('sanitizes download filenames', () => {
    expect(safeDownloadFilename('report:2026/07?.csv')).toBe(
      'report_2026_07_.csv',
    )
    expect(safeDownloadFilename('\u0000')).toBe('download')
  })
})
