import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ExpertRunScreen } from '@/features/expert'
import { WorkbenchProvider } from '@/lib/workbench/context'
import { ConversationEventsProvider } from '@/lib/workbench/conversation-events'
import messages from '@/messages/zh-CN.json'

const full = join(process.cwd(), 'preview/fixtures/full')
const manifest = JSON.parse(readFileSync(join(full, 'manifest.json'), 'utf8')) as {
  pages: { title: string; path: string }[]
  responses: { method: string; path: string; query: string; file: string }[]
}
function sample(path: string, query?: string): unknown {
  const found = manifest.responses.find(
    (each) =>
      each.method === 'GET' && each.path === path && (query === undefined || each.query === query),
  )
  return found ? JSON.parse(readFileSync(join(full, found.file), 'utf8')) : null
}
const conversationOf = (title: string) =>
  manifest.pages
    .find((page) => page.title.startsWith(title))!
    .path.split('/')
    .pop()!
const taskOf = (conversation: string) =>
  (sample('/api/workbench/tasks', `session_id=${conversation}`) as { tasks: { id: string }[] })
    .tasks[0].id

class FakeEventSource {
  onopen: (() => void) | null = null
  onmessage: ((message: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    queueMicrotask(() => this.onopen?.())
  }
  close() {}
}

type Call = { method: string; path: string; body: unknown; csrf: string | null }
let calls: Call[] = []

beforeEach(() => {
  calls = []
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).split('?')[0]
      const method = init.method ?? 'GET'
      const headers = (init.headers ?? {}) as Record<string, string>
      calls.push({
        method,
        path,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        csrf: headers['X-CSRF-Token'] ?? null,
      })
      const body = method === 'GET' ? sample(path) : { ok: true }
      return new Response(JSON.stringify(body ?? { code: 'not_found' }), {
        status: body ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function page(conversation: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>
        <WorkbenchProvider csrfToken="csrf-for-test" locale="zh-CN">
          <ConversationEventsProvider conversation={conversation}>
            <ExpertRunScreen task={taskOf(conversation)} />
          </ConversationEventsProvider>
        </WorkbenchProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('专家处理中', () => {
  it('一直摆着：做到第几步、花了多少、现在在干什么、为什么', async () => {
    page(conversationOf('专家处理中'))
    expect(await screen.findByText('专家正在处理：问数')).toBeInTheDocument()
    expect(screen.getByText('第 3 步，共 5 步：执行 SQL')).toBeInTheDocument()
    expect(screen.getByTestId('run-spent')).toHaveTextContent('已花 ¥0.150')
    const now = within(screen.getByRole('region', { name: '现在' }))
    expect(now.getByRole('status')).toHaveTextContent('在想这一步怎么做')
    expect(now.getByText(/查询的结果原样带回/)).toBeInTheDocument()
    expect(now.getByText(/这一步已经做了/)).toBeInTheDocument()
    // 步骤轨：前两步通过，第三步在做，后面的还没做
    const rail = within(screen.getByRole('navigation', { name: '步骤' }))
    expect(rail.getByRole('button', { name: /1 改写问题/ })).toHaveAttribute('title', '通过')
    expect(rail.getByRole('button', { name: /3 执行 SQL/ })).toHaveAttribute('title', '在做')
    expect(rail.getByRole('button', { name: /5 成稿/ })).toHaveAttribute('title', '还没做')
    // 右边的结果边栏平时折叠成一条：还在做，不会自己展开；点开才看到委托单
    const strip = screen.getByRole('complementary', { name: '结果' })
    expect(strip).toHaveAttribute('data-state', 'collapsed')
    fireEvent.click(within(strip).getByRole('button'))
    const panel = within(screen.getByRole('complementary', { name: '结果' }))
    const sheet = within(panel.getByRole('region', { name: '委托单' }))
    expect(sheet.getByText('五粮液近五年的毛利率分别是多少？')).toBeInTheDocument()
    expect(sheet.getByText('做完的 ¥0.100 ＋ 在做的 ¥0.050')).toBeInTheDocument()
    // 底稿还没做完：边栏说还没有回答，做完后归入知识库
    expect(panel.getByText('做完后归入知识库')).toBeInTheDocument()
  })

  it('点别的步骤看它交回了什么、验收的每一条', async () => {
    page(conversationOf('专家处理中'))
    fireEvent.click(await screen.findByRole('button', { name: /2 生成 SQL/ }))
    expect(await screen.findByRole('heading', { name: '生成 SQL' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/SELECT fiscal_year/)).toBeInTheDocument())
    expect(screen.getByText('查询语句不是空的')).toBeInTheDocument()
  })

  it('停止：先问一句，写明已花的不退；确认才停', async () => {
    const conversation = conversationOf('专家处理中')
    page(conversation)
    fireEvent.click(await screen.findByRole('button', { name: '停止' }))
    expect(await screen.findByText('停下专家？')).toBeInTheDocument()
    expect(screen.getByText(/已经花的不退/)).toBeInTheDocument()
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '停下' }))
    await waitFor(() => expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true))
    expect(calls.find((call) => call.path.endsWith('/cancel'))).toMatchObject({
      method: 'POST',
      path: `/api/workbench/tasks/${taskOf(conversation)}/cancel`,
      csrf: 'csrf-for-test',
    })
  })

  it('专家停下来问我：哪条没过、每个选项选了会怎样；答复带着凭证', async () => {
    page(conversationOf('专家停下来了：勾稽不平'))
    expect(await screen.findByText('专家停下来了，等你决定')).toBeInTheDocument()
    const review = within(await screen.findByRole('region', { name: '第「勾稽」步没有通过验收' }))
    expect(review.getByText('每条勾稽规则都平')).toBeInTheDocument()
    // 「选了会怎样」是后端写的
    expect(review.getByText(/专家重做这一步/)).toBeInTheDocument()
    expect(review.getByText(/把做完的 2 步交回给你/)).toBeInTheDocument()
    expect(review.getByText(/过期不等于同意/)).toBeInTheDocument()
    fireEvent.click(review.getByRole('button', { name: '再试一次' }))
    await waitFor(() => expect(calls.some((call) => call.path.endsWith('/respond'))).toBe(true))
    const sent = calls.find((call) => call.path.endsWith('/respond'))!
    expect(sent).toMatchObject({ method: 'POST', csrf: 'csrf-for-test' })
    expect(sent.body).toMatchObject({ decision: 'rework' })
    expect((sent.body as { token: string }).token.length).toBeGreaterThan(16)
    // 等你决定的时候不说「还在进行」
    expect(screen.queryByText(/这一步已经做了/)).toBeNull()
  })

  it('专家发现没有数据：审查面里有去申请入库的路', async () => {
    page(conversationOf('专家停下来了：没有数据'))
    const review = within(await screen.findByRole('region', { name: '这家公司还没有数据' }))
    expect(review.getByText('600436 的数据还没有入库')).toBeInTheDocument()
    expect(review.getByRole('button', { name: '数据已经入库了，接着做' })).toBeInTheDocument()
  })
})
