import { beforeEach, describe, expect, it } from 'vitest'

import { clampWidth, MAIN_MIN, PANE_WIDTHS_KEY, usePaneWidths } from '@/lib/pane-widths'

// 分栏宽度（所有者 2026-10-17）：有上下限，给中间那一栏留够地方，只存这台浏览器，读到坏值当没拖过。

beforeEach(() => {
  window.localStorage.clear()
  usePaneWidths.setState({
    widths: { sidebar: null, side: null },
    sidebarCollapsed: false,
    ready: false,
  })
})

describe('pane widths', () => {
  it('clamps to the limits and leaves room for the middle', () => {
    expect(clampWidth('sidebar', 50)).toBe(180)
    expect(clampWidth('sidebar', 9999)).toBe(480)
    expect(clampWidth('side', 300.4)).toBe(300)
    expect(clampWidth('side', 900, 1280, 240)).toBe(1280 - 240 - MAIN_MIN)
    expect(clampWidth('side', 900, 700, 240)).toBe(280) // 屏太窄也不小于下限
  })

  it('restores saved widths and ignores junk', () => {
    window.localStorage.setItem(
      PANE_WIDTHS_KEY,
      JSON.stringify({ sidebar: 1000, side: 'x', sidebarCollapsed: true }),
    )
    usePaneWidths.getState().restore()
    expect(usePaneWidths.getState().widths).toEqual({ sidebar: 480, side: null })
    expect(usePaneWidths.getState().sidebarCollapsed).toBe(true)
  })

  it('survives broken storage', () => {
    window.localStorage.setItem(PANE_WIDTHS_KEY, '{not json')
    usePaneWidths.getState().restore()
    expect(usePaneWidths.getState().widths).toEqual({ sidebar: null, side: null })
  })

  it('saves widths and the collapsed flag together', () => {
    usePaneWidths.getState().set('side', 500)
    usePaneWidths.getState().collapseSidebar(true)
    expect(JSON.parse(window.localStorage.getItem(PANE_WIDTHS_KEY)!)).toEqual({
      sidebar: null,
      side: 500,
      sidebarCollapsed: true,
    })
  })
})
