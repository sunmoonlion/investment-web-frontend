import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkSidePanel } from '@/components/workbench/side-panel'
import { WorkbenchProvider } from '@/lib/workbench/context'
import { forgetTicket } from '@/lib/workbench/local-agent'
import messages from '@/messages/zh-CN.json'

const ENV = '33333333-3333-4333-8333-333333333333'
const LOCAL = 'http://127.0.0.1:47811'
const ticket = {
  ticket: 'h.e.s',
  expires_at: Math.floor(Date.now() / 1000) + 600,
  relay_user: 'u-abc',
}

type Answer = { status: number; body: unknown; headers?: Record<string, string>; raw?: boolean }
let answers: Record<string, Answer | ((url: URL) => Answer)> = {}
let seen: { url: string; auth: string | null; origin: boolean }[] = []

beforeEach(() => {
  seen = []
  forgetTicket(ENV)
  answers = {
    // 这台电脑上有代理
    [`${LOCAL}/presence`]: {
      status: 200,
      body: { agent: 'sunmoon-agent', version: '0.4.0', machine_name: 'zymun', connected: true },
    },
    // 工作台只发票
    [`http://testserver/api/workbench/environments/${ENV}/local-ticket`]: {
      status: 200,
      body: ticket,
    },
    [`${LOCAL}/local/v1/info`]: {
      status: 200,
      body: {
        agent: 'sunmoon-agent',
        version: '0.4.0',
        userId: 'u-abc',
        roots: ['C:\\r'],
        libraryDir: 'D:\\lib',
      },
    },
    [`${LOCAL}/local/v1/fs/dir`]: (url) => {
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
      return { status: 404, body: { code: 'not_found', message: 'no' } }
    },
    [`${LOCAL}/local/v1/fs/file`]: {
      status: 200,
      raw: true,
      body: '# 标题\n正文',
      headers: { 'X-File-Size': '13', 'X-File-Eof': 'true' },
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input), 'http://testserver')
      const headers = (init.headers ?? {}) as Record<string, string>
      seen.push({
        url: url.origin + url.pathname + url.search,
        auth: headers.Authorization ?? null,
        origin: url.origin === LOCAL,
      })
      const found = answers[url.origin + url.pathname]
      const answer = typeof found === 'function' ? found(url) : found
      if (!answer) return new Response(JSON.stringify({ code: 'not_found' }), { status: 404 })
      const body = answer.raw
        ? new TextEncoder().encode(String(answer.body))
        : JSON.stringify(answer.body)
      return new Response(body, {
        status: answer.status,
        headers: {
          'Content-Type': answer.raw ? 'application/octet-stream' : 'application/json',
          ...answer.headers,
        },
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

describe('右边栏「文件」：直接问本机代理，文件不经云端', () => {
  it('探口 → 要票 → 看树；当前项目默认展开；点文件看内容', async () => {
    panel(ENV, 'C:\\r\\恒瑞医药')
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    const tree = await screen.findByRole('tree', { name: '文件' })
    expect(within(tree).getByText('C:\\r')).toBeInTheDocument()
    expect(within(tree).getByText('本地知识库')).toBeInTheDocument()
    expect(await within(tree).findByText('笔记.md')).toBeInTheDocument()
    expect(within(tree).getByText('README.md')).toBeInTheDocument()
    // 文件内容只向 127.0.0.1 要，工作台那边只被要了一张票
    const cloud = seen.filter((each) => !each.origin).map((each) => each.url)
    expect(cloud).toEqual([`http://testserver/api/workbench/environments/${ENV}/local-ticket`])
    // 每一次敲代理都带着票；探口那次不用
    for (const each of seen.filter((each) => each.origin && !each.url.endsWith('/presence'))) {
      expect(each.auth).toBe('Bearer h.e.s')
    }
    expect(seen.some((each) => each.url.includes(encodeURIComponent('D:\\lib')))).toBe(false)
    fireEvent.click(within(tree).getByRole('button', { name: /笔记\.md/ }))
    expect(await screen.findByRole('heading', { name: '标题' })).toBeInTheDocument()
    expect(screen.getByText('正文')).toBeInTheDocument()
    expect(seen.some((each) => each.url.startsWith(`${LOCAL}/local/v1/fs/file?path=`))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '返回文件树' }))
    expect(await screen.findByRole('tree', { name: '文件' })).toBeInTheDocument()
  })

  it('这台电脑上没有代理：说明白，不去要票', async () => {
    delete answers[`${LOCAL}/presence`]
    panel(ENV, null)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('没有在运行的代理')
    expect(seen.some((each) => each.url.includes('local-ticket'))).toBe(false)
  })

  it('代理接的是别的账号：说明白', async () => {
    answers[`${LOCAL}/local/v1/info`] = {
      status: 200,
      body: { userId: 'u-someone-else', roots: ['C:\\r'] },
    }
    panel(ENV, null)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('别的账号')
  })

  it('没有电脑的对话：没有文件可看', () => {
    panel(null, null)
    fireEvent.click(screen.getByRole('button', { name: '文件' }))
    expect(screen.getByText('这段对话不在哪台电脑上，没有文件可看。')).toBeInTheDocument()
  })
})
