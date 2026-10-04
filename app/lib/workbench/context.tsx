'use client'

import { createContext, useContext } from 'react'

type WorkbenchContext = { csrfToken: string; locale: string }

const Context = createContext<WorkbenchContext | null>(null)

// 进了工作台之后各功能都要用的两样：改动类请求的 CSRF、当前语言
export function WorkbenchProvider({
  csrfToken,
  locale,
  children,
}: WorkbenchContext & { children: React.ReactNode }) {
  return <Context.Provider value={{ csrfToken, locale }}>{children}</Context.Provider>
}

export function useWorkbench() {
  const value = useContext(Context)
  if (value === null) throw new Error('useWorkbench must be used inside WorkbenchProvider')
  return value
}
