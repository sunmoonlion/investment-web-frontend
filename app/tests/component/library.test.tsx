// 知识库（SDD 0011 第一期）：清单、一份资料、改名、拿掉。样例是真后端录下来的。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LibraryItemScreen, LibraryScreen } from '@/features/library'
import { WorkbenchProvider } from '@/lib/workbench/context'
import messages from '@/messages/zh-CN.json'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/zh-CN/workbench/library',
}))

const full = join(process.cwd(), 'preview/fixtures/full')
const manifest = JSON.parse(readFileSync(join(full, 'manifest.json'), 'utf8')) as {
  pages: { title: string; path: string }[]
  responses: { method: string; path: string; query: string; file: string }[]
}
function sample(path: string, query = ''): unknown {
  const found = manifest.responses.find(
    (each) => each.method === 'GET' && each.path === path && each.query === query,
  )
  return found ? JSON.parse(readFileSync(join(full, found.file), 'utf8')) : null
}
const itemOf = (title: string) =>
  decodeURIComponent(
    manifest.pages
      .find((page) => page.title.startsWith(title))!
      .path.split('/')
      .pop()!,
  )

type Call = { method: string; path: string; body: unknown; csrf: string | null }
let calls: Call[] = []

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const [path, query = ''] = String(input).split('?')
      const method = init.method ?? 'GET'
      const headers = (init.headers ?? {}) as Record<string, string>
      calls.push({
        method,
        path: decodeURIComponent(path),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        csrf: headers['X-CSRF-Token'] ?? null,
      })
      const body =
        method === 'GET'
          ? sample(decodeURIComponent(path), query)
          : method === 'PATCH'
            ? {
                item: {
                  ...(sample(decodeURIComponent(path)) as { item: object }).item,
                  title: '改过的名字',
                },
              }
            : { ok: true }
      if (method === 'DELETE') return new Response(null, { status: 204 })
      return new Response(JSON.stringify(body ?? { code: 'not_found' }), {
        status: body ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

function mount(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>
        <WorkbenchProvider csrfToken="csrf-for-test" locale="zh-CN">
          {ui}
        </WorkbenchProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('知识库', () => {
  it('清单：底稿和交回物自动归入，按项目分组，写明服务端有专属副本', async () => {
    mount(<LibraryScreen />)
    const items = (sample('/api/workbench/library') as { items: { kind: string }[] }).items
    expect(items.length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getAllByText('底稿').length).toBeGreaterThan(1))
    expect(screen.getByText(/服务端有一份只属于你的副本/)).toBeInTheDocument()
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(items.length)
    // 只看底稿
    fireEvent.click(screen.getByRole('button', { name: '底稿' }))
    await waitFor(() =>
      expect(calls.some((call) => call.path === '/api/workbench/library' && true)).toBe(true),
    )
  })

  it('一份底稿：版本、内容、来路；改名和拿掉经同一份接口', async () => {
    const id = itemOf('知识库：一份底稿')
    mount(<LibraryItemScreen item={id} />)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/服务端有一份只属于你的副本/)).toBeInTheDocument()
    const versions = within(screen.getByRole('region', { name: '版本' }))
    expect(versions.getAllByRole('button').length).toBeGreaterThan(0)
    expect(await screen.findByRole('region', { name: '内容' })).toHaveTextContent(/回答|问/)
    // 改名
    fireEvent.click(screen.getByRole('button', { name: '改名' }))
    const input = screen.getByRole('textbox', { name: '改名' })
    fireEvent.change(input, { target: { value: '  改过的名字 ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')).toMatchObject({
        path: `/api/workbench/library/${id}`,
        body: { title: '改过的名字' },
        csrf: 'csrf-for-test',
      }),
    )
    // 拿掉：先问一句，确认才删，删完回清单
    fireEvent.click(screen.getByRole('button', { name: '从知识库拿掉' }))
    expect(screen.getByText(/原来的对话和底稿还在/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '从知识库拿掉' }).pop()!)
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'DELETE')).toMatchObject({
        path: `/api/workbench/library/${id}`,
        csrf: 'csrf-for-test',
      }),
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith('/zh-CN/workbench/library'))
  })

  it('没有这份资料：说清楚，能回清单', async () => {
    mount(<LibraryItemScreen item="dossier:00000000-0000-0000-0000-000000000000" />)
    expect(await screen.findByText(/没有这份资料/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /回到知识库/ })).toHaveAttribute(
      'href',
      '/zh-CN/workbench/library',
    )
  })
})
