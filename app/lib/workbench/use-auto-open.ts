'use client'

import { useState } from 'react'

// 结果边栏平时折叠；「做完」那一刻自动展开一次（从没做完变成做完时）。之后用户开合随意。
export function useAutoOpen(done: boolean, initial = false) {
  const [open, setOpen] = useState(initial)
  const [seen, setSeen] = useState(done)
  // 渲染中推导：上一次看到的还没做完、这一次做完了，就展开
  if (done !== seen) {
    setSeen(done)
    if (done) setOpen(true)
  }
  return [open, setOpen] as const
}
