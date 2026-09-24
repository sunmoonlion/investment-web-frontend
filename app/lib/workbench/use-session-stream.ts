'use client'

// 会话事件流：先按 cursor 拉一遍，再开 SSE 续传；重复按 cursor 去重（AT-15）。断了指数退避重连，重连前再补拉一次。
import { useEffect, useRef, useState } from 'react'
import type { SessionEvent } from '@/contracts/workbench'
import { fetchEvents, parseStreamEvent } from './client'

export type StreamState = 'connecting' | 'open' | 'offline'

export function useSessionStream(sessionId: string) {
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [state, setState] = useState<StreamState>('connecting')
  const cursorRef = useRef(0)

  useEffect(() => {
    let stopped = false
    let source: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const append = (incoming: SessionEvent[]) => {
      if (!incoming.length) return
      setEvents((prev) => {
        const fresh = incoming.filter((e) => e.cursor > cursorRef.current)
        if (!fresh.length) return prev
        cursorRef.current = fresh[fresh.length - 1].cursor
        return [...prev, ...fresh]
      })
    }

    const connect = async () => {
      if (stopped) return
      setState('connecting')
      try {
        const page = await fetchEvents(sessionId, cursorRef.current)
        append(page.events)
      } catch {
        setState('offline')
        schedule()
        return
      }
      source = new EventSource(
        `/api/workbench/sessions/${encodeURIComponent(sessionId)}/stream?after=${cursorRef.current}`,
        { withCredentials: true },
      )
      source.onopen = () => {
        attempt = 0
        setState('open')
      }
      source.onmessage = (message) => {
        try {
          append([parseStreamEvent(message.data)])
        } catch {
          /* 坏帧丢弃；下一次补拉会修正 */
        }
      }
      source.onerror = () => {
        source?.close()
        source = null
        setState('offline')
        schedule()
      }
    }

    const schedule = () => {
      if (stopped) return
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5))
      attempt += 1
      timer = setTimeout(() => void connect(), delay)
    }

    void connect()
    return () => {
      stopped = true
      source?.close()
      if (timer) clearTimeout(timer)
    }
  }, [sessionId])

  return { events, state }
}
