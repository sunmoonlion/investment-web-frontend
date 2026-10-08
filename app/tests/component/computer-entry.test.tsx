import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeScreen } from '@/features/home'
import { AskExpertScreen, ExpertHomeScreen } from '@/features/expert'
import { MachinesScreen } from '@/features/machines'
import { NewProjectDialog } from '@/features/projects/ui/new-project-dialog'
import { Sidebar } from '@/features/shell/ui/sidebar'
import { WorkbenchProvider } from '@/lib/workbench/context'
import { workbenchKeys } from '@/lib/workbench/queries'
import zh from '@/messages/zh-CN.json'
import en from '@/messages/en.json'

const navigation = vi.hoisted(() => ({ query: '', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.query),
  usePathname: () => '/zh-CN/workbench',
}))
const fixture = (name: string, path: string) => {
  const directory = join(process.cwd(), 'preview/fixtures', name)
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as {
    responses: { method: string; path: string; file: string }[]
  }
  const entry = manifest.responses.find((r) => r.method === 'GET' && r.path === path)
  return entry ? JSON.parse(readFileSync(join(directory, entry.file), 'utf8')) : null
}
const connected = fixture('full', '/api/workbench/environments').environments
const release = {
  url: 'https://download.example/agent.zip',
  version: '0.2.1',
  codex_version: '0.155.1',
  zip_sha256: 'a'.repeat(64),
  manifest_sha256: 'b'.repeat(64),
  size_bytes: 174243923,
}
let environment: 'empty' | 'full' | 'error' | 'pending'
let hasSandbox: boolean
let issuedIdentity: boolean
const calls: { path: string; method: string }[] = []
const clients: QueryClient[] = []
beforeEach(() => {
  environment = 'empty'
  hasSandbox = true
  issuedIdentity = true
  navigation.query = ''
  navigation.push.mockReset()
  calls.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).split('?')[0]
      calls.push({ path, method: init.method ?? 'GET' })
      if (init.method && init.method !== 'GET') throw new Error('Unexpected mutation')
      if (path === '/api/workbench/environments') {
        if (environment === 'pending') return new Promise<Response>(() => {})
        if (environment === 'error') return Response.json({ code: 'unavailable' }, { status: 503 })
        return Response.json(fixture(environment, path))
      }
      if (path === '/api/workbench/agent/download')
        return Response.json({ contract_version: 2, download: release })
      if (path === '/api/workbench/sandboxes/provisioned')
        return Response.json({
          status: 'ready',
          relay_user: issuedIdentity ? 'fixture-user' : null,
          identity_revision: 'a'.repeat(64),
        })
      // 云端沙箱与电脑无关：聊天有沙箱就能发消息。
      const body = fixture(
        path === '/api/workbench/sandboxes' && hasSandbox ? 'full' : 'empty',
        path,
      )
      return Response.json(body ?? { code: 'not_found' }, { status: body ? 200 : 404 })
    }),
  )
})
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  vi.unstubAllGlobals()
})
function page(children: React.ReactNode, locale: 'zh-CN' | 'en' = 'zh-CN') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  return {
    client,
    ...render(children, {
      wrapper: ({ children }) => (
        <NextIntlClientProvider
          locale={locale}
          messages={locale === 'zh-CN' ? zh : en}
          timeZone="Asia/Shanghai"
        >
          <QueryClientProvider client={client}>
            <WorkbenchProvider csrfToken="csrf-fixture" locale={locale}>
              {children}
            </WorkbenchProvider>
          </QueryClientProvider>
        </NextIntlClientProvider>
      ),
    }),
  }
}
const checkLink = (locale: 'zh-CN' | 'en' = 'zh-CN') => {
  expect(
    screen.getByRole('link', { name: locale === 'zh-CN' ? '接入电脑' : 'Connect computer' }),
  ).toHaveAttribute('href', `/${locale}/workbench/machines`)
}

describe('电脑接入入口', () => {
  it('首次卡片依次引导设置 key 和接电脑，不重复显示下方沙箱提示', async () => {
    hasSandbox = false
    page(<HomeScreen />)
    const card = await screen.findByRole('region', { name: zh.computerConnection.welcome })
    expect(
      within(card)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/zh-CN/workbench/settings', '/zh-CN/workbench/machines'])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '你好' } })
    expect(screen.queryByText(zh.home.blocker.noSandbox)).toBeNull()
    expect(screen.getByRole('button', { name: zh.home.mode.chat.send })).toBeDisabled()
  })
  it.each(['zh-CN', 'en'] as const)('通用首页展示卡片，登记电脑后消失（%s）', async (locale) => {
    const p = page(<HomeScreen />, locale)
    const title = (locale === 'zh-CN' ? zh : en).computerConnection.welcome
    expect(await screen.findByRole('region', { name: title })).toBeVisible()
    checkLink(locale)
    act(() => p.client.setQueryData(workbenchKeys.machines, connected))
    await waitFor(() => expect(screen.queryByRole('region', { name: title })).toBeNull())
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })
  it.each(['pending', 'error'] as const)('首页列表 %s 不当作没有电脑', async (state) => {
    environment = state
    const { client } = page(<HomeScreen />)
    await waitFor(() => expect(client.getQueryState(workbenchKeys.machines)?.status).toBe(state))
    expect(screen.queryByRole('link', { name: '接入电脑' })).toBeNull()
  })
  it.each(['mode=chat', 'mode=chat&project=fixture-project'])(
    '明确进入聊天，不提示接入、不以缺电脑拦截（%s）',
    async (query) => {
      navigation.query = query
      const { client } = page(<HomeScreen />)
      await waitFor(() =>
        expect(client.getQueryState(workbenchKeys.machines)?.status).toBe('success'),
      )
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '你好' } })
      expect(screen.getByRole('button', { name: zh.home.mode.chat.send })).toBeEnabled()
      expect(screen.queryByRole('link', { name: '接入电脑' })).toBeNull()
      expect(screen.queryByText(zh.home.blocker.noMachine)).toBeNull()
      expect(screen.getByRole('link', { name: '聊天' })).toHaveAttribute(
        'href',
        '/zh-CN/workbench?mode=chat',
      )
    },
  )
  it.each(['work', 'expert'])('%s 缺电脑，直接引导接入', async (mode) => {
    navigation.query = `mode=${mode}`
    page(<HomeScreen />)
    await screen.findByText(zh.home.blocker.noMachine)
    checkLink()
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })
  it('专家首页与指定项目的专家页都能接入', async () => {
    const p = page(<ExpertHomeScreen />)
    await screen.findByText(zh.expertHome.noMachine)
    checkLink()
    p.rerender(<AskExpertScreen project="fixture-project" from={null} expert={null} />)
    await screen.findByText(zh.askExpert.blocker.noMachine)
    checkLink()
    expect(screen.getByRole('button', { name: '交给专家' })).toBeDisabled()
  })
  it('侧栏状态是可见链接，聊天导航明确指向聊天入口', async () => {
    page(<Sidebar />)
    const status = await screen.findByText('还没有登记电脑')
    expect(status.closest('a')).toHaveAttribute('href', '/zh-CN/workbench/machines')
    expect(status.closest('a')).toHaveTextContent('我的电脑')
    expect(screen.getByRole('link', { name: '聊天' })).toHaveAttribute(
      'href',
      '/zh-CN/workbench?mode=chat',
    )
  })
  it.each(['pending', 'error'] as const)('新建项目 %s 不误报没有电脑或创建项目', async (state) => {
    environment = state
    page(<NewProjectDialog open onOpenChange={() => {}} onCreated={() => {}} />)
    await screen.findByText(
      state === 'pending' ? zh.projects.create.loadingMachines : zh.projects.create.machinesFailed,
    )
    expect(screen.queryByRole('link', { name: '接入电脑' })).toBeNull()
    expect(screen.getByRole('button', { name: zh.projects.create.submit })).toBeDisabled()
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })
})

describe('五步引导证据', () => {
  it('电脑已在线，即使签发状态没有 relay_user，领取令牌步骤也完成', async () => {
    issuedIdentity = false
    environment = 'full'
    page(<MachinesScreen />)
    const guide = within(screen.getByRole('region', { name: zh.machines.guide.title }))
    await waitFor(() => expect(guide.getAllByLabelText('已完成')).toHaveLength(3))
    expect(guide.getByText(zh.machines.guide.evidence)).toHaveTextContent(
      '前两步做完自己打勾，后三步做完会自动打勾。',
    )
    expect(guide.getByLabelText(zh.machines.guide.confirmDownload)).not.toBeChecked()
    expect(guide.getByLabelText(zh.machines.guide.confirmInstall)).not.toBeChecked()
  })
  it('下载/安装不自动打勾，不改令牌；目录与在线随只读状态更新', async () => {
    const p = page(<MachinesScreen />)
    const guide = within(screen.getByRole('region', { name: zh.machines.guide.title }))
    await waitFor(() => expect(guide.getAllByLabelText('已完成')).toHaveLength(1))
    expect(guide.getAllByRole('link').map((link) => link.textContent)).toEqual([
      '1. 下载安装包',
      '2. 校验并安装',
      '3. 领取代理令牌',
      '4. 选择项目目录',
      '5. 确认电脑在线',
    ])
    expect(screen.getByRole('link', { name: '下载 Windows ZIP' })).toHaveAttribute(
      'href',
      release.url,
    )
    expect(guide.getByLabelText(zh.machines.guide.confirmDownload)).not.toBeChecked()
    expect(guide.getByLabelText(zh.machines.guide.confirmInstall)).not.toBeChecked()
    fireEvent.click(guide.getByLabelText(zh.machines.guide.confirmDownload))
    fireEvent.click(guide.getByLabelText(zh.machines.guide.confirmInstall))
    expect(guide.getAllByLabelText('已完成')).toHaveLength(3)
    act(() =>
      p.client.setQueryData(
        workbenchKeys.machines,
        connected.map((m: object) => ({ ...m, status: 'offline' })),
      ),
    )
    await waitFor(() => expect(guide.getAllByLabelText('已完成')).toHaveLength(4))
    act(() => p.client.setQueryData(workbenchKeys.machines, connected))
    await waitFor(() => expect(guide.getAllByLabelText('已完成')).toHaveLength(5))
    const sections = [...document.querySelectorAll('section[id]')].map((s) => s.id)
    expect(sections).toEqual(['agent-download', 'agent-token', 'agent-roots', 'agent-online'])
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })
  it('电脑状态失败不显示未登记或在线通过', async () => {
    environment = 'error'
    page(<MachinesScreen />)
    await screen.findByText(zh.machines.loadFailed)
    expect(screen.queryByText(zh.machines.none)).toBeNull()
    const guide = within(screen.getByRole('region', { name: zh.machines.guide.title }))
    expect(guide.getAllByLabelText('还没做')).toHaveLength(4)
  })
})
