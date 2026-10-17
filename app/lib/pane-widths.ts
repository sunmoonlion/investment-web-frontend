'use client'

import { create } from 'zustand'

// 工作台分栏拖出来的宽度（所有者 2026-10-17：分割线要能拖）。和个人偏好一样只存这台浏览器，存不了就只在这一次有效。
// 没拖过（null）就用默认：侧边栏按偏好的窄、中、宽，右栏 384px。左边的侧边栏还能折叠成一条窄栏（所有者同日「侧边栏都加可折叠按钮」）。

export const PANE_WIDTHS_KEY = 'sunmoon:pane-widths'
export type Pane = 'sidebar' | 'side'

export const PANE_LIMITS: Record<Pane, { min: number; max: number; fallback: number }> = {
  sidebar: { min: 180, max: 480, fallback: 240 },
  side: { min: 280, max: 960, fallback: 384 },
}
// 中间那一栏至少留这么宽：拖宽两边时不把它挤没
export const MAIN_MIN = 360

export function clampWidth(pane: Pane, width: number, viewport?: number, other = 0): number {
  const { min, max } = PANE_LIMITS[pane]
  const room = viewport ? Math.max(min, viewport - other - MAIN_MIN) : max
  return Math.round(Math.min(Math.max(width, min), max, room))
}

type Widths = Record<Pane, number | null>
type Saved = { widths: Widths; sidebarCollapsed: boolean }

function readSaved(): Saved {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PANE_WIDTHS_KEY) ?? '{}') as Record<
      string,
      unknown
    >
    const of = (pane: Pane) =>
      typeof raw[pane] === 'number' && Number.isFinite(raw[pane])
        ? clampWidth(pane, raw[pane] as number)
        : null
    return {
      widths: { sidebar: of('sidebar'), side: of('side') },
      sidebarCollapsed: raw.sidebarCollapsed === true,
    }
  } catch {
    return { widths: { sidebar: null, side: null }, sidebarCollapsed: false }
  }
}

function writeSaved(saved: Saved) {
  try {
    window.localStorage.setItem(
      PANE_WIDTHS_KEY,
      JSON.stringify({ ...saved.widths, sidebarCollapsed: saved.sidebarCollapsed }),
    )
  } catch {
    // 存不了就只在这一次有效
  }
}

type Store = {
  widths: Widths
  sidebarCollapsed: boolean
  ready: boolean
  restore: () => void
  set: (pane: Pane, width: number | null) => void
  collapseSidebar: (collapsed: boolean) => void
}

export const usePaneWidths = create<Store>((set, get) => ({
  widths: { sidebar: null, side: null },
  sidebarCollapsed: false,
  ready: false,
  restore: () => {
    if (get().ready) return
    set({ ...readSaved(), ready: true })
  },
  set: (pane, width) => {
    const widths = { ...get().widths, [pane]: width === null ? null : clampWidth(pane, width) }
    writeSaved({ widths, sidebarCollapsed: get().sidebarCollapsed })
    set({ widths })
  },
  collapseSidebar: (sidebarCollapsed) => {
    writeSaved({ widths: get().widths, sidebarCollapsed })
    set({ sidebarCollapsed })
  },
}))
