"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Loader2,
  Play,
  RefreshCw,
  Send,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type JsonRecord = Record<string, unknown>

type AgentSessionResponse = {
  session_id: string
  status: string
}

type AgentRunResponse = {
  run_id?: string
  session_id?: string
  status?: string
  resume_token?: string | null
}

type TimelineEvent = {
  id?: string | null
  type: string
  payload?: JsonRecord
  lineage?: {
    session_id?: string
    run_id?: string
  }
  schema_version?: number
}

type LiveDelta = {
  type: "LiveDelta"
  payload?: JsonRecord
  final_event_id?: string
  lineage?: {
    session_id?: string
    run_id?: string
  }
}

type StreamPayload = TimelineEvent | LiveDelta

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error"

const namedEvents = [
  "TimelineRunStarted",
  "TimelineWaitInputDisplayed",
  "TimelineUserInputReceived",
  "TimelineToolStarted",
  "TimelineToolCompleted",
  "TimelineRunCompleted",
  "TimelineRunFailed",
  "LiveDelta",
]

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "")

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function payloadText(payload: JsonRecord | undefined): string {
  if (!payload) return ""
  const text =
    readString(payload.text) ??
    readString(payload.message) ??
    readString(payload.content) ??
    readString(payload.output) ??
    readString(payload.error)
  if (text) return text
  return JSON.stringify(payload, null, 2)
}

function timelineTitle(type: string): string {
  const labels: Record<string, string> = {
    TimelineRunStarted: "运行开始",
    TimelineWaitInputDisplayed: "等待人工输入",
    TimelineUserInputReceived: "收到用户输入",
    TimelineToolStarted: "工具开始",
    TimelineToolCompleted: "工具完成",
    TimelineRunCompleted: "运行完成",
    TimelineRunFailed: "运行失败",
  }
  return labels[type] ?? type
}

function eventKey(event: TimelineEvent, index: number): string {
  return event.id ?? `${event.type}-${event.lineage?.run_id ?? "run"}-${index}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const body = (await response.json()) as JsonRecord
      detail = readString(body.detail) ?? detail
    } catch {
      // keep the HTTP status as fallback
    }
    throw new Error(detail)
  }

  return (await response.json()) as T
}

export function AgentConsole() {
  const [sessionId, setSessionId] = useState("")
  const [runId, setRunId] = useState("")
  const [resumeToken, setResumeToken] = useState("")
  const [userInput, setUserInput] = useState("请基于当前 v4 工作区继续推进。")
  const [resumeInput, setResumeInput] = useState("继续")
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [deltas, setDeltas] = useState<LiveDelta[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const lastEventIdRef = useRef("")
  const eventSourceRef = useRef<EventSource | null>(null)

  const statusLabel = useMemo(() => {
    const labels: Record<ConnectionState, string> = {
      idle: "未连接",
      connecting: "连接中",
      open: "实时连接",
      closed: "已关闭",
      error: "连接异常",
    }
    return labels[connectionState]
  }, [connectionState])

  function closeStream() {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setConnectionState("closed")
  }

  function applyPayload(payload: StreamPayload) {
    if (payload.type === "LiveDelta") {
      const delta = payload as LiveDelta
      setDeltas((current) => [delta, ...current].slice(0, 8))
      return
    }
    const timelineEvent = payload as TimelineEvent

    setEvents((current) => {
      if (timelineEvent.id && current.some((event) => event.id === timelineEvent.id)) {
        return current
      }
      return [...current, timelineEvent]
    })

    if (timelineEvent.id) {
      lastEventIdRef.current = timelineEvent.id
    }

    const payloadData = isRecord(timelineEvent.payload) ? timelineEvent.payload : {}
    const nextRunId = timelineEvent.lineage?.run_id
    if (nextRunId) setRunId(nextRunId)

    if (timelineEvent.type === "TimelineWaitInputDisplayed") {
      setResumeToken(readString(payloadData.resume_token) ?? readString(payloadData.resumeToken) ?? "")
    }

    if (timelineEvent.type === "TimelineRunCompleted" || timelineEvent.type === "TimelineRunFailed") {
      setResumeToken("")
    }
  }

  function handleStreamMessage(message: MessageEvent<string>) {
    if (!message.data) return
    try {
      const payload = JSON.parse(message.data) as StreamPayload
      if (isRecord(payload) && readString(payload.type)) {
        applyPayload(payload)
      }
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "无法解析 SSE 消息")
    }
  }

  function connectStream(nextSessionId = sessionId) {
    if (!nextSessionId) return
    closeStream()
    setConnectionState("connecting")

    const streamUrl = new URL(`${apiBase}/agent/sessions/${nextSessionId}/stream`, window.location.origin)
    if (lastEventIdRef.current) {
      streamUrl.searchParams.set("last_event_id", lastEventIdRef.current)
    }

    const source = new EventSource(streamUrl.toString(), { withCredentials: true })
    source.onopen = () => {
      setConnectionState("open")
      setError("")
    }
    source.onerror = () => {
      setConnectionState("error")
      setError("SSE 连接异常。若后端返回 404，请先确认 AGENT_V4_TRAFFIC_ENABLED 已打开。")
    }
    source.onmessage = handleStreamMessage
    namedEvents.forEach((eventName) => {
      source.addEventListener(eventName, handleStreamMessage as EventListener)
    })
    eventSourceRef.current = source
  }

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId
    const session = await requestJson<AgentSessionResponse>("/agent/sessions", {
      method: "POST",
    })
    setSessionId(session.session_id)
    return session.session_id
  }

  async function startRun(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setBusy(true)
    setError("")
    try {
      const nextSessionId = await ensureSession()
      connectStream(nextSessionId)
      const run = await requestJson<AgentRunResponse>(`/agent/sessions/${nextSessionId}/runs`, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          user_input: {
            text: userInput,
            attachment_ids: [],
            metadata: { source: "research-web-frontend" },
          },
        }),
      })
      setRunId(run.run_id ?? "")
      setResumeToken(run.resume_token ?? "")
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "启动运行失败")
    } finally {
      setBusy(false)
    }
  }

  async function resumeRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!runId || !resumeToken) return
    setBusy(true)
    setError("")
    try {
      await requestJson<AgentRunResponse>(`/agent/runs/${runId}/resume`, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          resume_token: resumeToken,
          user_input: {
            text: resumeInput,
            attachment_ids: [],
            metadata: { source: "research-web-frontend" },
          },
        }),
      })
      setResumeToken("")
      setResumeInput("继续")
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "恢复运行失败")
    } finally {
      setBusy(false)
    }
  }

  function resetSession() {
    closeStream()
    setSessionId("")
    setRunId("")
    setResumeToken("")
    setEvents([])
    setDeltas([])
    setError("")
    lastEventIdRef.current = ""
    setConnectionState("idle")
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">MoocManus v4</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agent 工作台</h1>
          </div>
          <form className="space-y-3" onSubmit={startRun}>
            <textarea
              className="min-h-32 w-full resize-y rounded-lg border bg-background p-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20"
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              placeholder="输入本轮任务"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy || !userInput.trim()}>
                {busy ? <Loader2 className="animate-spin" /> : <Play />}
                启动运行
              </Button>
              <Button type="button" variant="outline" onClick={() => connectStream()} disabled={!sessionId}>
                <RefreshCw />
                重连 SSE
              </Button>
              <Button type="button" variant="ghost" onClick={resetSession}>
                重置会话
              </Button>
            </div>
          </form>
        </div>

        <aside className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">运行状态</h2>
              <p className="mt-1 text-xs text-muted-foreground">web-frontend 直连 FastAPI /api/agent</p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
                connectionState === "open" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                connectionState === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              <CircleDot className="size-3" />
              {statusLabel}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">API Base</dt>
              <dd className="mt-1 break-all font-mono text-xs">{apiBase}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Session</dt>
              <dd className="mt-1 break-all font-mono text-xs">{sessionId || "尚未创建"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Run</dt>
              <dd className="mt-1 break-all font-mono text-xs">{runId || "尚未启动"}</dd>
            </div>
          </dl>
          {error ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </aside>
      </section>

      {resumeToken ? (
        <form className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950" onSubmit={resumeRun}>
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="font-semibold">智能体正在等待人工输入</h2>
                <p className="mt-1 break-all text-xs">resume_token: {resumeToken}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-9 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20"
                  value={resumeInput}
                  onChange={(event) => setResumeInput(event.target.value)}
                />
                <Button type="submit" disabled={busy || !resumeInput.trim()}>
                  <Send />
                  提交继续
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border bg-card shadow-xs">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">时间线</h2>
          </div>
          <div className="divide-y">
            {events.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">还没有 UIEvent。启动运行后会在这里看到可补发的时间线。</div>
            ) : (
              events.map((event, index) => {
                const text = payloadText(event.payload)
                return (
                  <article key={eventKey(event, index)} className="flex gap-3 p-4">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium">{timelineTitle(event.type)}</h3>
                        {event.id ? <span className="font-mono text-xs text-muted-foreground">{event.id}</span> : null}
                      </div>
                      {text ? (
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                          {text}
                        </pre>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>

        <aside className="rounded-lg border bg-card shadow-xs">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">LiveDelta</h2>
          </div>
          <div className="space-y-3 p-4">
            {deltas.length === 0 ? (
              <p className="text-sm text-muted-foreground">实时增量只用于交互反馈，不作为最终事实源。</p>
            ) : (
              deltas.map((delta, index) => (
                <div key={`${delta.final_event_id ?? "delta"}-${index}`} className="rounded-lg bg-muted p-3">
                  <div className="mb-2 font-mono text-xs text-muted-foreground">
                    final: {delta.final_event_id ?? "pending"}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-5">{payloadText(delta.payload)}</pre>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}
