import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalLibraryScreen } from '@/features/local-library'
import { WorkbenchProvider } from '@/lib/workbench/context'
import { forgetTicket } from '@/lib/workbench/local-agent'
import messages from '@/messages/zh-CN.json'

const ENV = '0f79a87c-7bf3-5956-be15-01e3988797ee'
const LOCAL = 'http://127.0.0.1:47811'
let libraryDir: string | null = 'D:\\资料'

beforeEach(() => {
  forgetTicket(ENV)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(String(input), 'http://testserver')
      const path = url.origin + url.pathname
      if (path === 'http://testserver/api/workbench/environments')
        return Response.json({
          environments: [{ id: ENV, name: 'zymun', status: 'online', roots: ['D:\\研究'] }],
        })
      if (path === `http://testserver/api/workbench/environments/${ENV}/local-ticket`)
        return Response.json({
          ticket: 'h.e.s',
          expires_at: Math.floor(Date.now() / 1000) + 600,
          relay_user: 'u-abc',
        })
      if (path === `${LOCAL}/presence`)
        return Response.json({
          agent: 'sunmoon-agent',
          version: '0.4.0',
          machine_name: 'zymun',
          connected: true,
        })
      if (path === `${LOCAL}/local/v1/info`)
        return Response.json({ userId: 'u-abc', roots: ['D:\\研究'], libraryDir })
      if (path === `${LOCAL}/local/v1/fs/dir`) {
        const asked = url.searchParams.get('path')
        if (asked === 'D:\\资料')
          return Response.json({
            path: asked,
            entries: [{ name: '行业报告.md', type: 'file', size: 10 }],
          })
        return Response.json({ code: 'not_found', message: 'no' }, { status: 404 })
      }
      return Response.json({ code: 'not_found' }, { status: 404 })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

function page() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages}>
      <QueryClientProvider client={client}>
        <WorkbenchProvider csrfToken="csrf" locale="zh-CN">
          <LocalLibraryScreen />
        </WorkbenchProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('本地知识库页', () => {
  it('只画知识库那个根，默认展开，不碰白名单里别的目录', async () => {
    libraryDir = 'D:\\资料'
    page()
    const tree = await screen.findByRole('tree', { name: '文件' })
    expect(await within(tree).findByText('行业报告.md')).toBeInTheDocument()
    expect(within(tree).queryByText('D:\\研究')).toBeNull()
  })

  it('还没选知识库目录：说明并指去「我的电脑」', async () => {
    libraryDir = null
    page()
    expect(await screen.findByText('还没有选本地知识库目录。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '去「我的电脑」设' })).toHaveAttribute(
      'href',
      '/zh-CN/workbench/settings/computer',
    )
  })
})
