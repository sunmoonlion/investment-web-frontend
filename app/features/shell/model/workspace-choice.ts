'use client'

import { create } from 'zustand'

const KEY = 'workbench.workspace'

function remembered(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

type Choice = { chosen: string | null; restore: () => void; choose: (key: string) => void }

// 侧栏里选的是哪个工作区。记在浏览器里：下次进来还是它。
export const useWorkspaceChoice = create<Choice>((set) => ({
  chosen: null,
  restore: () => set({ chosen: remembered() }),
  choose: (key) => {
    try {
      window.localStorage.setItem(KEY, key)
    } catch {
      // 存不了就只在这一次有效
    }
    set({ chosen: key })
  },
}))
