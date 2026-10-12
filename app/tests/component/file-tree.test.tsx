import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkSidePanel } from '@/components/workbench/side-panel'
import { WorkbenchProvider } from '@/lib/workbench/context'
import messages from '@/messages/zh-CN.json'

const ENV = '33333333-3333-4333-8333-333333333333'
const b64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))

type Answer = { status: number; body: unknown }
let answers: Record<string, Answer | ((url: URL) => Answer)> = {}
let seen: string[] = []

beforeEach(() => {
  seen = []
  answers = {
    [`/api/workbench/environments/${ENV}/service`]: {
      status: 200,
      body: { agent: 'sunmoon-agent', version: '0.4.0', roots: ['C:\\r'], libraryDir: 'D:\\lib' },
    },
    [`/api/workbench/environments/${ENV}/fs/dir`]: (url) => {
      const path = url.searchParams.get('path')
      if (path === 'C:\\r') {
        return {
          status: 200,
          body: {
            path,
            entries: [
              { name: '恒瑞医药', type: 'dir' },
              { name: 'README.md', type: 'file', size: 12 },
            ],
          },
        }
      }
      if (path === 'C:\\r\\恒瑞医药') {
        return {
          status: 200,
          body: { path, entries: [{ name: '笔记.md', type: 'file', size: 9 }], truncated: false },
        }
      }
      return { status: 404, body: { code: 'not_found' } }
    },
    [`/api/workbench/environments/${ENV}/fs/file`]: {
      status: 200,
      body: {
        path: 'C:\\r\\恒瑞医药\\笔记.md',
        offset: 0,
        content: b64('# 标题\n正文'),
        size: 9,
        eof: true,
      },
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(String(input), 'http://testserver')
      seen.push(url.pathname + url.search)
      const found = answers[url.pathname]
      const answer = typeof found === 'function' ? found(url) : found
      return new Response(JSON.stringify(answer?.body ?? { code: 'not_found' }), {
        status: answer?.status ?? 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

function panel(environment: string | null, directory: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages}>
      <QueryClientProvider client={client}>
        <WorkbenchProvider csrfToken="csrf" locale="zh-CN">
          <WorkSidePanel files={[]} directory={directory} live={false} environment={environment} />
        </WorkbenchProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('右边栏「文件」', () => {
  it('根是白名单目录加本地知识库；当前项目默认展开；点文件看内容', async () => {
    panel(ENV, 'C:\\r\\恒瑞医药')
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    const tree = await screen.findByRole('tree', { name: '文件' })
    expect(within(tree).getByText('C:\\r')).toBeInTheDocument()
    expect(within(tree).getByText('本地知识库')).toBeInTheDocument()
    // 项目目录自动展开到里面的文件
    expect(await within(tree).findByText('笔记.md')).toBeInTheDocument()
    expect(within(tree).getByText('README.md')).toBeInTheDocument()
    // 知识库那个根默认收着，没去读
    expect(seen.some((each) => each.includes(encodeURIComponent('D:\\lib')))).toBe(false)
    fireEvent.click(within(tree).getByRole('button', { name: /笔记\.md/ }))
    expect(await screen.findByRole('heading', { name: '标题' })).toBeInTheDocument()
    expect(screen.getByText('正文')).toBeInTheDocument()
    expect(
      seen.some((each) => each.startsWith(`/api/workbench/environments/${ENV}/fs/file?path=`)),
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '返回文件树' }))
    expect(await screen.findByRole('tree', { name: '文件' })).toBeInTheDocument()
  })

  it('代理不在线：说一句，不装作空', async () => {
    answers[`/api/workbench/environments/${ENV}/service`] = {
      status: 503,
      body: { code: 'agent_offline', status: 503, detail: 'off' },
    }
    panel(ENV, null)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('这台电脑的代理不在线')
  })

  it('没有电脑的对话：没有文件可看', () => {
    panel(null, null)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(screen.getByText('这段对话不在哪台电脑上，没有文件可看。')).toBeInTheDocument()
  })
})
