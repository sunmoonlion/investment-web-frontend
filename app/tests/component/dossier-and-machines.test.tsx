import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DossierBlock, Machine } from '@/contracts/workbench-v2'
import { DossierScreen } from '@/features/expert'
import {
  alsoLine,
  cell,
  ordinal,
  pivotOf,
  sourceLine,
  tablesOf,
} from '@/features/expert/model/dossier'
import { MachinesScreen } from '@/features/settings'
import { progress } from '@/features/settings/model/guide'
import { SettingsScreen } from '@/features/settings'
import { WorkbenchProvider } from '@/lib/workbench/context'
import messages from '@/messages/zh-CN.json'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/zh-CN/workbench',
}))

const fixtures = join(process.cwd(), 'preview/fixtures')
let scenario = 'full'
function manifestOf(name: string) {
  return JSON.parse(readFileSync(join(fixtures, name, 'manifest.json'), 'utf8')) as {
    pages: { title: string; path: string }[]
    responses: { method: string; path: string; query: string; file: string }[]
  }
}
function sample(path: string): unknown {
  const found = manifestOf(scenario).responses.find(
    (each) => each.method === 'GET' && each.path === path,
  )
  return found ? JSON.parse(readFileSync(join(fixtures, scenario, found.file), 'utf8')) : null
}
const parts = (title: string) =>
  manifestOf('full')
    .pages.find((page) => page.title.startsWith(title))!
    .path.split('/')

type Call = { method: string; path: string; body: Record<string, unknown> }
let calls: Call[] = []

beforeEach(() => {
  calls = []
  scenario = 'full'
  push.mockReset()
  window.sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).split('?')[0]
      const method = init.method ?? 'GET'
      if (method !== 'GET') {
        calls.push({ method, path, body: JSON.parse(String(init.body ?? '{}')) })
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const body = sample(path)
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

describe('底稿：格子与表', () => {
  it('比率写成百分数，大数加分隔，是否，空的写一横', () => {
    expect(cell(0.846, { unit: '比率' }, 'value')).toBe('84.6%')
    expect(cell(22820000000, { unit: '元' }, 'value')).toBe('22,820,000,000')
    // 年度不是金额：这一行的单位是比率，年度也照原样写
    expect(cell(2023, { unit: '比率' }, 'fiscal_year')).toBe('2023')
    expect(cell(6, {}, 'page')).toBe('6')
    expect(alsoLine({ fiscal_year: 2024, note: '追溯调整后的口径', diff: 1204 })).toBe(
      '2024 年：追溯调整后的口径',
    )
    expect(cell(true, {})).toBe('是')
    expect(cell(null, {})).toBe('—')
    expect(cell([], {})).toBe('—')
    expect(cell(['2024-12-31'], {})).toBe('2024-12-31')
    expect(ordinal(1) + ordinal(8)).toBe('一八')
  })
  it('列按专家包登记的排；没登记的，行里有什么排什么', () => {
    const block = {
      kind: 'table',
      columns: [{ key: 'b', title: '乙' }],
      content: [{ a: 1, b: 2 }],
    } as unknown as DossierBlock
    expect(tablesOf(block)[0].columns).toEqual([{ key: 'b', title: '乙' }])
    expect(tablesOf({ ...block, columns: [] })[0].columns.map((c) => c.key)).toEqual(['a', 'b'])
    expect(
      sourceLine({ dataset: 'd', data_version: 'abcdefgh12345678', as_of: '2025-12-31' }),
    ).toEqual({ dataset: 'd', version: '12345678', asOf: '2025-12-31' })
    expect(sourceLine(null)).toBeNull()
  })
  it('长表转成「名称 × 年度」的对照表；转不了就照长表摆', () => {
    const columns = ['display_name', 'fiscal_year', 'value'].map((key) => ({ key, title: key }))
    const row = (name: string, year: number, value: number, more = {}) => ({
      display_name: name,
      fiscal_year: year,
      value,
      unit: '比率',
      ...more,
    })
    const pivot = pivotOf({
      title: null,
      columns,
      rows: [
        row('毛利率', 2024, 0.859, { basis: '追溯调整后' }),
        row('毛利率', 2023, 0.846, { basis: '原始披露' }),
        row('净资产收益率', 2023, 0, { applicable: false, reason_if_not: '要用上一年的期末数' }),
        row('净资产收益率', 2024, 0.1),
      ],
    })
    expect(pivot?.years).toEqual([2023, 2024])
    expect(pivot?.rows[0]).toEqual({
      name: '毛利率',
      cells: {
        2023: { text: '84.6%', note: null },
        2024: { text: '85.9%', note: '追溯调整后' }, // 口径和别的年不一样：写在数下面
      },
    })
    // 不适用的不硬写一个数
    expect(pivot?.rows[1].cells[2023]).toEqual({ text: '不适用', note: '要用上一年的期末数' })
    // 同一个名称同一年有两行：不转，免得丢数
    expect(
      pivotOf({
        title: null,
        columns,
        rows: [row('a', 2023, 1), row('a', 2023, 2), row('a', 2024, 1)],
      }),
    ).toBeNull()
    expect(pivotOf({ title: null, columns: [], rows: [] })).toBeNull()
  })
})

describe('底稿页', () => {
  it('做完的底稿：问了什么、答了什么、凭什么、哪些没做到、我怎么看', async () => {
    const at = parts('底稿：已完成，算指标重做过一次')
    page(<DossierScreen project={at[4]} task={at[6]} />)
    expect(
      await screen.findByRole('heading', { name: '恒瑞医药 2023 到 2025 年的盈利能力怎么样？' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/财报体检 · 已完成 · .* · 花了 ¥0.400（估算）/)).toBeInTheDocument()
    for (const title of [
      '一、回答',
      '二、数据',
      '三、专家验过什么',
      '七、它是怎么做的',
      '八、我的结论',
    ]) {
      expect(screen.getByRole('heading', { name: new RegExp(`^${title}`) })).toBeInTheDocument()
    }
    // 指标表：列名是中文，比率写成百分数；取数表默认收着
    const data = within(screen.getByRole('region', { name: '数据' }))
    // 指标表摆成「指标 × 年度」：一行一个指标，一列一年
    expect(data.getByRole('columnheader', { name: '指标' })).toBeInTheDocument()
    expect(data.getByRole('columnheader', { name: '2023' })).toBeInTheDocument()
    expect(data.getByRole('row', { name: /毛利率.*84\.6%.*85\.9%.*86\.2%/ })).toBeInTheDocument()
    expect(data.getAllByText('不适用').length).toBeGreaterThan(0)
    expect(screen.getByRole('article').textContent).not.toContain('202300')
    expect(data.getByRole('button', { name: /取数表/ })).toHaveAttribute('aria-expanded', 'false')
    // 专家验过什么：这一块是底稿和普通回答的区别
    const verified = within(screen.getByRole('region', { name: '专家验过什么' }))
    expect(verified.getByText(/9 条规则 × 3 期，全部平/)).toBeInTheDocument()
    expect(verified.getByText(/对了 12 项，12 项一致/)).toBeInTheDocument()
    // 重做过的步骤如实写
    const how = within(screen.getByRole('region', { name: '它是怎么做的' }))
    expect(how.getByRole('button', { name: /5 算指标.*重做过 1 次/ })).toBeInTheDocument()
    // 页面上没有评级、目标价、买卖建议；没有代号
    for (const word of ['评级', '目标价', 'FIN_REVIEW']) {
      expect(screen.getByRole('article').textContent).not.toContain(word)
    }
    // 导出：浏览器下载；回到对话
    expect(screen.getByRole('link', { name: '导出' })).toHaveAttribute(
      'href',
      `/api/workbench/tasks/${at[6]}/dossier/export`,
    )
    expect(screen.getByRole('link', { name: '回到对话' })).toBeInTheDocument()
  })

  it('我的结论：不预填专家的话；保存的是用户写的', async () => {
    const at = parts('底稿：已完成，算指标重做过一次')
    page(<DossierScreen project={at[4]} task={at[6]} />)
    const box = await screen.findByRole('textbox', { name: '我的结论' })
    expect(box).toHaveValue('')
    expect(screen.getByText('专家不下结论。这一栏是你的。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    fireEvent.change(box, { target: { value: '毛利率稳定，净利率在提高。' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      path: `/api/workbench/tasks/${at[6]}/conclusion`,
      body: { text: '毛利率稳定，净利率在提高。' },
    })
  })

  it('已经写过结论的：显示用户自己写的那份', async () => {
    const at = parts('底稿：已完成，用户写了结论')
    page(<DossierScreen project={at[4]} task={at[6]} />)
    const box = await screen.findByRole('textbox', { name: '我的结论' })
    expect((box as HTMLTextAreaElement).value).toContain('这是用户自己写的草稿')
    expect(screen.getByText(/已保存，第 1 版/)).toBeInTheDocument()
  })

  it('没做完的：做完的照常显示，没做到的写「没有做到这一步」', async () => {
    const at = parts('底稿：失败')
    page(<DossierScreen project={at[4]} task={at[6]} />)
    const notice = within(await screen.findByRole('status'))
    expect(notice.getByText('做到第 6 步停下了')).toBeInTheDocument()
    expect(notice.getByText('专家停下来问你，你选择了停止')).toBeInTheDocument()
    expect(screen.getAllByText('没有做到这一步').length).toBeGreaterThan(3)
    expect(within(screen.getByRole('region', { name: '数据' })).getByRole('table')).toBeVisible()
  })

  it('专家没有接的：只有原因和重新请的路', async () => {
    const at = parts('底稿：打回')
    page(<DossierScreen project={at[4]} task={at[6]} />)
    expect(await screen.findByText('专家没有接这件事。')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '它是怎么做的' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '换一位专家' }))
    expect(push).toHaveBeenCalledWith(`/zh-CN/workbench/projects/${at[4]}/expert/new`)
    // 原来的问题带过去
    expect(window.sessionStorage.getItem('workbench.question')).toBe(
      '中国平安 2025 年的偿付能力怎么样？',
    )
  })
})

describe('我的电脑', () => {
  it('三步：有在线电脑即完成；离线只算已安装和已选文件夹', () => {
    const machine = (roots: string[], status: Machine['status'] = 'online') =>
      ({ id: 'x', name: 'm', status, roots }) as Machine
    expect(progress([])).toEqual({ install: false, connect: false, folders: false })
    expect(progress(undefined)).toEqual({ install: false, connect: false, folders: false })
    expect(progress([machine([])])).toEqual({ install: true, connect: true, folders: true })
    expect(progress([machine(['/r'], 'offline')])).toEqual({
      install: true,
      connect: false,
      folders: true,
    })
    expect(progress([machine([], 'offline'), machine([])]).connect).toBe(true)
  })

  it('接入的机器：在线、版本、白名单里的目录、它自己定的上限', async () => {
    page(<MachinesScreen />)
    expect(await screen.findByRole('heading', { name: '办公室的电脑' })).toBeInTheDocument()
    expect(screen.getAllByText('在线').length).toBeGreaterThan(0)
    expect(screen.getByText('/home/demo/research')).toBeInTheDocument()
    expect(screen.getByText(/只能改白名单目录里的文件；不许联网/)).toBeInTheDocument()
    expect(screen.getByText(/这些只能在那台机器上改/)).toBeInTheDocument()
    // 已在线可证明持有可用令牌；下载与安装仍由本人确认。
    await waitFor(() => expect(screen.getAllByLabelText('已完成')).toHaveLength(3))
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('机器离线：写明本地代理没在运行', async () => {
    scenario = 'offline'
    page(<MachinesScreen />)
    expect(await screen.findByText(/代理当前离线。请在本机托盘查看原因并启动/)).toBeVisible()
  })

  it('还没有电脑：照五步做', async () => {
    scenario = 'empty'
    page(<MachinesScreen />)
    expect(await screen.findByText('还没有电脑接入。')).toBeInTheDocument()
    expect(screen.getAllByLabelText('还没做')).toHaveLength(3)
  })
})

describe('设置', () => {
  it('三块：模型 key、我的沙箱、新对话的默认。给用户看的字里没有「会话」', async () => {
    page(<SettingsScreen />)
    expect(await screen.findByRole('heading', { name: '设置' })).toBeInTheDocument()
    for (const name of ['模型 key', '电脑与沙箱', '新对话的默认']) {
      expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    }
    expect(document.body.textContent).not.toContain('会话')
    expect(document.getElementById('computer')).not.toBeNull()
  })
})
