'use client'

import { useEffect, useState } from 'react'

// 一个每秒走一下的钟：页面上「做了多久」「多久没动静」要它
export function useClock(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}
