import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectListScreen, ProjectScreen } from '@/features/projects'
import { WorkbenchProvider } from '@/lib/workbench/context'
import messages from '@/messages/zh-CN.json'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/zh-CN/workbench/projects',
}))

const fixtures = join(process.cwd(), 'preview/fixtures')
let scenario = 'full'
function manifestOf(name: string) {
  return JSON.parse(readFileSync(join(fixtures, name, 'manifest.json'), 'utf8')) as {
    pages: { title: string; path: string }[]
    responses: { method: string; path: string; query: string; file: string }[]
  }
}
function sample(path: string, query: string): unknown {
  const found = manifestOf(scenario).responses.find(
    (each) => each.method === 'GET' && each.path === path && each.query === query,
  )
  return found ? JSON.parse(readFileSync(join(fixtures, scenario, found.file), 'utf8')) : null
}

type Call = { method: string; path: string; body: Record<string, unknown> }
let calls: Call[] = []

beforeEach(() => {
  calls = []
  scenario = 'full'
  push.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const [path, query = ''] = String(input).split('?')
      const method = init.method ?? 'GET'
      if (method !== 'GET') {
        calls.push({ method, path, body: JSON.parse(String(init.body ?? '{}')) })
        return new Response(JSON.stringify({ id: '33333333-3333-4333-8333-333333333333' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const body = sample(path, query)
      return new Response(JSON.stringify(body ?? { code: 'not_found' }), {
        status: body ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function page(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>
        <WorkbenchProvider csrfToken="csrf-for-test" locale="zh-CN">
          {children}
        </WorkbenchProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('项目列表', () => {
  it('按工作区分组；归档的默认不显示，勾上才显示', async () => {
    page(<ProjectListScreen />)
    const research = within(
      await screen.findByRole('region', { name: '办公室的电脑 /home/demo/research' }),
    )
    expect(research.getAllByRole('link')).toHaveLength(9)
    expect(research.getByText('/home/demo/research/恒瑞医药')).toBeInTheDocument()
    // 另一个工作区里还没有项目：也列出来，写明是空的
    const notes = within(screen.getByRole('region', { name: '办公室的电脑 /home/demo/notes' }))
    expect(notes.getByText('这个工作区里还没有项目。')).toBeInTheDocument()
    expect(screen.queryByText('已归档')).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: '显示归档的' }))
    expect(await screen.findByText('已归档')).toBeInTheDocument()
  })

  it('新建项目：选工作区、填子目录；不填名字就用目录的最后一段', async () => {
    page(<ProjectListScreen />)
    const create = await screen.findByRole('button', { name: '新建项目' })
    await waitFor(() => expect(create).toBeEnabled()) // 工作区取到了才能建
    fireEvent.click(create)
    // 只有一台机器：不用选机器
    expect(screen.queryByText('在哪台机器上')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: '/home/demo/research' }))
    const path = screen.getByLabelText('子目录')
    fireEvent.change(path, { target: { value: '../外面' } })
    expect(screen.getByRole('alert')).toHaveTextContent('不能往上走')
    expect(screen.getByRole('button', { name: '建立' })).toBeDisabled()
    fireEvent.change(path, { target: { value: '医药/恒瑞二期' } })
    expect(screen.getByText('/home/demo/research/医药/恒瑞二期')).toBeInTheDocument()
    expect(screen.getByText('不填就用目录的最后一段：恒瑞二期')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '建立' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/workbench/projects' })
    expect(calls[0].body).toMatchObject({
      workspace_root: '/home/demo/research',
      path: '医药/恒瑞二期',
    })
    expect('title' in calls[0].body).toBe(false)
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/zh-CN/workbench/projects/33333333-3333-4333-8333-333333333333',
      ),
    )
  })

  it('一个工作区都没有：说明三种原因和去哪里处理', async () => {
    scenario = 'empty'
    page(<ProjectListScreen />)
    expect(await screen.findByText('还没有工作区')).toBeInTheDocument()
    expect(screen.getByText(/还没有接入本地代理/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '接入电脑' })).toHaveAttribute(
      'href',
      '/zh-CN/workbench/settings#computer',
    )
    fireEvent.click(screen.getByRole('button', { name: '新建项目' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(await dialog.findByText('先接入电脑并选择项目目录，再创建项目。')).toBeVisible()
    expect(dialog.getByRole('link', { name: '接入电脑' })).toHaveAttribute(
      'href',
      '/zh-CN/workbench/settings#computer',
    )
    expect(calls).toHaveLength(0)
  })
})

describe('项目页', () => {
  const idOf = (name: string, title: string) =>
    manifestOf(name)
      .pages.find((each) => each.title.startsWith(title))!
      .path.split('/')[4]

  it('对话、底稿；三种开始的办法', async () => {
    const id = idOf('full', '项目页')
    page(<ProjectScreen project={id} />)
    expect(await screen.findByRole('button', { name: '恒瑞医药' })).toBeInTheDocument()
    expect(screen.getByText(/一个项目是你电脑上的一个文件夹/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '新聊天' })).toHaveAttribute(
      'href',
      `/zh-CN/workbench?mode=chat&project=${id}`,
    )
    expect(screen.getByRole('link', { name: '请专家' })).toHaveAttribute(
      'href',
      `/zh-CN/workbench/projects/${id}/expert/new`,
    )
    const conversations = within(screen.getByRole('region', { name: '对话' }))
    expect(conversations.getAllByRole('link')).toHaveLength(3)
    // 底稿：专家的名字、终态的白话、花了多少。没有代号
    const dossiers = within(screen.getByRole('region', { name: '底稿' }))
    expect(dossiers.getByText('财报体检')).toBeInTheDocument()
    expect(dossiers.getByText('已完成')).toBeInTheDocument()
    expect(dossiers.getByText('¥0.400')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('FIN_REVIEW')
  })

  it('机器离线：可以看、可以聊天，不能新建工作、不能请专家', async () => {
    scenario = 'offline'
    page(<ProjectScreen project={idOf('offline', '项目页')} />)
    expect(await screen.findByText(/机器不在线/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '新聊天' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('link', { name: '新工作' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: '请专家' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('归档：先问一句，说明归档之后怎样；确认才归档', async () => {
    const id = idOf('full', '项目页')
    page(<ProjectScreen project={id} />)
    fireEvent.click(await screen.findByRole('button', { name: '归档' }))
    expect(await screen.findByText('归档这个项目？')).toBeInTheDocument()
    expect(screen.getByText(/你电脑上的文件不受影响/)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.click(dialog.getByRole('button', { name: '归档' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({
      method: 'PATCH',
      path: `/api/workbench/projects/${id}`,
      body: { archived: true },
    })
  })
})
