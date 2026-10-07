// 结果边栏（所有者 2026-10-07 定）：平时折叠成一条，做完那一刻自动展开一次，开合随意，归入知识库的一行。
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import { ResultsPanel } from '@/components/workbench/results-panel'
import { useAutoOpen } from '@/lib/workbench/use-auto-open'
import messages from '@/messages/zh-CN.json'

function Harness({ done, filed }: { done: boolean; filed?: string | null }) {
  const [open, setOpen] = useAutoOpen(done)
  return (
    <ResultsPanel
      summary={done ? '13,346,192,164.12 元' : null}
      status={done ? 'done' : 'running'}
      open={open}
      onOpenChange={setOpen}
      filed={filed === undefined ? null : { href: filed }}
    >
      <p>里面的内容</p>
    </ResultsPanel>
  )
}

function mount(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('结果边栏', () => {
  it('平时折叠成一条，点开看、点收起', () => {
    mount(<Harness done={false} />)
    const strip = screen.getByRole('complementary', { name: '结果' })
    expect(strip).toHaveAttribute('data-state', 'collapsed')
    expect(screen.queryByText('里面的内容')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /打开结果|结果/ }))
    expect(screen.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'open',
    )
    expect(screen.getByText('里面的内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '收起结果' }))
    expect(screen.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'collapsed',
    )
  })

  it('做完那一刻自动展开一次；之后收起就不再自己弹出来', () => {
    const view = mount(<Harness done={false} />)
    expect(screen.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'collapsed',
    )
    view.rerender(
      <NextIntlClientProvider locale="zh-CN" messages={messages}>
        <Harness done />
      </NextIntlClientProvider>,
    )
    expect(screen.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'open',
    )
    expect(screen.getByText('13,346,192,164.12 元')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '收起结果' }))
    view.rerender(
      <NextIntlClientProvider locale="zh-CN" messages={messages}>
        <Harness done />
      </NextIntlClientProvider>,
    )
    expect(screen.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'collapsed',
    )
  })

  it('一打开就是做完的：不自己弹出来，点开才看；归入知识库有地址就是链接，没有就只说一句', () => {
    const first = mount(<Harness done filed="/zh-CN/workbench/library/dossier:1" />)
    expect(first.getByRole('complementary', { name: '结果' })).toHaveAttribute(
      'data-state',
      'collapsed',
    )
    fireEvent.click(within(first.getByRole('complementary', { name: '结果' })).getByRole('button'))
    expect(first.getByRole('link', { name: '已归入知识库' })).toHaveAttribute(
      'href',
      '/zh-CN/workbench/library/dossier:1',
    )
    first.unmount()
    const second = mount(<Harness done filed={null} />)
    fireEvent.click(within(second.getByRole('complementary', { name: '结果' })).getByRole('button'))
    expect(second.queryByRole('link', { name: '已归入知识库' })).toBeNull()
    expect(second.getByText('已归入知识库')).toBeInTheDocument()
  })
})
