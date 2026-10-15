import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsScreen } from '@/features/settings'
import { Sidebar } from '@/features/shell/ui/sidebar'
import { PREFERENCES_KEY } from '@/lib/preferences-boot'
import { usePreferences } from '@/lib/preferences'
import { WorkbenchProvider } from '@/lib/workbench/context'
import zh from '@/messages/zh-CN.json'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/zh-CN/workbench/settings/preferences',
}))

const machines = {
  environments: [
    {
      id: '0f79a87c-7bf3-5956-be15-01e3988797ee',
      name: '办公室的电脑',
      status: 'online',
      roots: ['D:\\研究', 'D:\\笔记'],
      ceiling: { sandbox: 'workspace-write', network: false },
    },
  ],
}
let prefs: Record<string, unknown>
const puts: unknown[] = []
const localPuts: unknown[] = []
const posts: unknown[] = []

function page(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(children, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="zh-CN" messages={zh} timeZone="Asia/Shanghai">
        <QueryClientProvider client={client}>
          <WorkbenchProvider csrfToken="csrf-fixture" locale="zh-CN">
            {children}
          </WorkbenchProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    ),
  })
}

beforeEach(() => {
  prefs = { model: null, approval_policy: 'on-request', mcp_sources: { knowbase: true } }
  puts.length = 0
  localPuts.length = 0
  posts.length = 0
  window.localStorage.clear()
  document.documentElement.className = ''
  delete document.documentElement.dataset.accent
  delete document.documentElement.dataset.sidebar
  usePreferences.setState({
    ready: false,
    preferences: usePreferences.getInitialState().preferences,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).split('?')[0]
      if (path === '/api/workbench/prefs' && init.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        puts.push(body)
        prefs = { ...prefs, ...body }
        return Response.json(prefs)
      }
      if (path === '/api/workbench/prefs') return Response.json(prefs)
      if (path === '/api/workbench/credentials' && init.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        posts.push(body)
        return Response.json(
          {
            id: '6f1c2b1e-3c5d-4a7e-9b8f-0d1e2f3a4b5c',
            provider: body.provider,
            hint: 'abcd',
            status: 'active',
            base_url: body.base_url ?? null,
          },
          { status: 201 },
        )
      }
      if (path === '/api/workbench/credentials')
        return Response.json({
          credentials: [
            {
              id: '6f1c2b1e-3c5d-4a7e-9b8f-0d1e2f3a4b5d',
              provider: 'kimi',
              hint: '9999',
              status: 'active',
              base_url: 'https://proxy.example.com/openai/v1',
            },
          ],
        })
      if (path === '/api/workbench/environments') return Response.json(machines)
      if (path === '/api/workbench/sandboxes/provisioned')
        return Response.json({
          status: 'ready',
          relay_user: 'u',
          identity_revision: 'a'.repeat(64),
        })
      if (path === '/api/workbench/agent/download')
        return Response.json({
          contract_version: 2,
          download: {
            url: 'https://download.example/agent.zip',
            version: '0.3.0',
            codex_version: '0.155.1',
            zip_sha256: 'a'.repeat(64),
            manifest_sha256: 'b'.repeat(64),
            size_bytes: 1,
          },
        })
      // 回环口（0022 乙案）：这台电脑上的代理
      if (path === 'http://127.0.0.1:47811/presence')
        return Response.json({
          agent: 'sunmoon-agent',
          version: '0.4.0',
          machine_name: '办公室的电脑',
          connected: true,
        })
      if (path === `/api/workbench/environments/${machines.environments[0].id}/local-ticket`)
        return Response.json({
          ticket: 'h.e.s',
          expires_at: Math.floor(Date.now() / 1000) + 600,
          relay_user: 'u-abc',
        })
      if (path === 'http://127.0.0.1:47811/local/v1/info')
        return Response.json({
          agent: 'sunmoon-agent',
          version: '0.4.0',
          userId: 'u-abc',
          roots: ['D:\\研究'],
          libraryDir: null,
        })
      if (path === 'http://127.0.0.1:47811/local/v1/settings' && init.method === 'PUT') {
        localPuts.push(JSON.parse(String(init.body)))
        return Response.json({ applied: true, restart: true })
      }
      if (path === 'http://127.0.0.1:47811/local/v1/settings')
        return Response.json({
          machineName: '办公室的电脑',
          roots: ['D:\\研究'],
          rootChoices: ['D:\\研究', 'D:\\笔记'],
          ceiling: { sandbox: 'workspace-write', network: false },
          autostart: true,
          libraryDir: null,
          version: '0.4.0',
        })
      return Response.json({ code: 'not_found' }, { status: 404 })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('设置分三类（0021）', () => {
  it('个人偏好：外观、主题色、侧边栏存浏览器本地并立刻套到页面上；语言是换地址前缀', async () => {
    page(<SettingsScreen section="preferences" />)
    fireEvent.click(await screen.findByLabelText('深色'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    fireEvent.click(screen.getByLabelText('蓝'))
    fireEvent.click(screen.getByLabelText('宽'))
    fireEvent.click(screen.getByLabelText('项目'))
    expect(document.documentElement.dataset.accent).toBe('blue')
    expect(document.documentElement.dataset.sidebar).toBe('wide')
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toEqual({
      appearance: 'dark',
      accent: 'blue',
      sidebar: 'wide',
      expand: 'project',
    })
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/workbench/settings/preferences',
    )
  })

  it('侧边栏照偏好换宽度', async () => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ sidebar: 'narrow' }))
    page(<Sidebar />)
    const aside = await screen.findByRole('complementary', { name: zh.shell.brand })
    await waitFor(() => expect(aside.className).toContain('w-52'))
  })

  it('云端与模型：key 可带接入地址；MCP 开关写回偏好', async () => {
    page(<SettingsScreen section="cloud" />)
    expect(await screen.findByText(/proxy\.example\.com\/openai\/v1/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/API key/), {
      target: { value: 'sk-test-1234567890abcd' },
    })
    fireEvent.change(screen.getByLabelText(/接入地址/), {
      target: { value: 'https://gateway.example.com/v1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交 key' }))
    await waitFor(() => expect(posts).toHaveLength(1))
    expect(posts[0]).toMatchObject({ provider: 'kimi', base_url: 'https://gateway.example.com/v1' })
    const toggle = await screen.findByRole('switch', { name: '公共数据' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]).toMatchObject({
      approval_policy: 'on-request',
      mcp_sources: { knowbase: false },
    })
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: '公共数据' })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    )
  })

  it('我的电脑：代理那头的设置直接改——勾目录、开联网，保存送到那台电脑（经回环口）', async () => {
    page(<SettingsScreen section="computer" />)
    const local = (await screen.findByRole('heading', { name: '这台电脑上的设置' })).closest(
      'section',
    )!
    // 候选目录两个，勾着一个
    const research = await within(local).findByLabelText('D:\\研究')
    const notes = within(local).getByLabelText('D:\\笔记')
    expect(research).toBeChecked()
    expect(notes).not.toBeChecked()
    fireEvent.click(notes)
    fireEvent.click(within(local).getByLabelText('联网'))
    fireEvent.click(within(local).getByRole('button', { name: '保存到电脑' }))
    await waitFor(() => expect(localPuts).toHaveLength(1))
    // 只送改了的项
    expect(localPuts[0]).toEqual({
      roots: ['D:\\研究', 'D:\\笔记'],
      ceiling: { sandbox: 'workspace-write', network: true },
    })
    expect(await within(local).findByRole('status')).toHaveTextContent('已保存')
    // 文件与设置都没经工作台：工作台只被要了一张票
    const cloudPuts = puts.length
    expect(cloudPuts).toBe(0)
  })
})
