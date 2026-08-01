export type PageQuery = {
  page: number
  pageSize: number
  search: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export function normalizePageQuery(input: Partial<PageQuery>): PageQuery {
  return {
    page: clampInteger(input.page, 1, 10_000, 1),
    pageSize: clampInteger(input.pageSize, 1, 200, 20),
    search: (input.search ?? '').trim().slice(0, 256),
    sort: input.sort?.trim().slice(0, 64) || undefined,
    direction: input.direction === 'desc' ? 'desc' : input.direction === 'asc' ? 'asc' : undefined,
  }
}

export function pageQueryKey(resource: string, scope: string, query: PageQuery) {
  return ['web', resource, scope, normalizePageQuery(query)] as const
}

export function assertSameOriginDownloadPath(path: string): string {
  if (!path.startsWith('/api/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('download path must be a same-origin /api/ path')
  }
  return path
}

export function safeDownloadFilename(filename: string): string {
  const sanitized = filename
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 160)
  return sanitized && /[^\s_.-]/.test(sanitized) ? sanitized : 'download'
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value as number)) : fallback
}
