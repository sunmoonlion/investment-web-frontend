// 事件 → 聊天页上要显示的东西。纯函数，不取数、不渲染。
// 一轮：用户的一句话，模型在回答之前做的事（查数据、读文件、顺口说的话），最后的回答。
import type { ConversationEvent } from '@/contracts/workbench-v2'

export type DataStep = {
  kind: 'data'
  id: string
  server: string
  tool: string
  dataset: string | null
  version: string | null
  failed: boolean
  running: boolean
  query: string
  result: string
}

export type FileStep = {
  kind: 'file'
  id: string
  // 读文件时是文件名；别的命令是命令本身
  label: string
  reading: boolean
  running: boolean
  failed: boolean
  command: string
  output: string
}

export type SaidStep = { kind: 'said'; id: string; text: string }

export type Step = DataStep | FileStep | SaidStep

export type TurnStatus = 'queued' | 'running' | 'completed' | 'interrupted' | 'failed'

// 模型这会儿在干什么。只在这一轮还在跑的时候有
export type Activity = 'waiting' | 'thinking' | 'data' | 'file' | 'writing'

export type MissingData = { code: string; dataset: string | null }

export type TurnView = {
  key: string
  turnId: string | null
  text: string
  at: string
  steps: Step[]
  answer: { id: string; text: string } | null
  missing: MissingData[]
  status: TurnStatus
  activity: Activity | null
}

type Item = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function pretty(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// 工具答复里的正文：MCP 的答复是若干段文字
function resultText(result: unknown): string {
  if (!result || typeof result !== 'object') return pretty(result)
  const content = (result as { content?: unknown }).content
  if (!Array.isArray(content)) return pretty(result)
  return content
    .map((part) => (part && typeof part === 'object' ? text((part as Item).text) : ''))
    .filter(Boolean)
    .join('\n')
}

function versionIn(result: string): string | null {
  const found = /"data_version"\s*:\s*"([^"]+)"/.exec(result)
  return found ? found[1] : null
}

function dataStep(item: Item, running: boolean): DataStep {
  const args = (item.arguments ?? {}) as Item
  const result = resultText(item.result)
  return {
    kind: 'data',
    id: text(item.id),
    server: text(item.server),
    tool: text(item.tool),
    dataset: text(args.dataset) || null,
    version: versionIn(result),
    failed: !running && (item.status === 'failed' || Boolean(item.error)),
    running,
    query: pretty(item.arguments),
    result: result || pretty(item.error),
  }
}

function fileStep(item: Item, running: boolean): FileStep {
  const actions = Array.isArray(item.commandActions) ? (item.commandActions as Item[]) : []
  const first = actions[0] ?? {}
  const reading = actions.length > 0 && actions.every((action) => action.type === 'read')
  const command = text(first.command) || text(item.command)
  const exit = typeof item.exitCode === 'number' ? item.exitCode : null
  return {
    kind: 'file',
    id: text(item.id),
    label: reading ? actions.map((action) => text(action.name)).join('、') : command,
    reading,
    running,
    failed: !running && exit !== null && exit !== 0,
    command,
    output: text(item.aggregatedOutput),
  }
}

function turnIdOf(payload: Item): string | null {
  const turn = payload.turn as Item | undefined
  return text(payload.turnId) || text(turn?.id) || null
}

export function thread(events: readonly ConversationEvent[]): TurnView[] {
  const turns: TurnView[] = []
  const byTurnId = (id: string | null) =>
    (id ? turns.find((turn) => turn.turnId === id) : undefined) ?? turns[turns.length - 1]

  // 回答之后又做了别的事：那句话就不是最后的回答，退回成顺口说的话
  const demote = (turn: TurnView) => {
    if (turn.answer === null) return
    turn.steps.push({ kind: 'said', id: turn.answer.id, text: turn.answer.text })
    turn.answer = null
  }
  const put = (turn: TurnView, step: Step) => {
    const at = turn.steps.findIndex((each) => each.id === step.id && each.kind === step.kind)
    if (at >= 0) turn.steps[at] = step
    else {
      demote(turn)
      turn.steps.push(step)
    }
  }

  for (const event of events) {
    const payload = event.payload as Item
    if (event.type === 'turn/requested') {
      turns.push({
        key: text(payload.request_id) || event.id,
        turnId: null,
        text: text(payload.text),
        at: event.created_at,
        steps: [],
        answer: null,
        missing: [],
        status: 'queued',
        activity: 'waiting',
      })
      continue
    }
    if (event.type === 'turn/accepted') {
      const turn = turns.find((each) => each.key === text(payload.request_id))
      if (turn) {
        turn.turnId = turnIdOf(payload)
        turn.status = 'running'
      }
      continue
    }
    const turn = byTurnId(turnIdOf(payload))
    if (!turn) continue
    const live = turn.status === 'queued' || turn.status === 'running'

    if (event.type === 'turn/started') {
      if (live) {
        turn.status = 'running'
        turn.activity = 'thinking'
      }
    } else if (event.type === 'turn/completed') {
      const status = text((payload.turn as Item | undefined)?.status)
      turn.status =
        status === 'interrupted' ? 'interrupted' : status === 'failed' ? 'failed' : 'completed'
      turn.activity = null
      for (const step of turn.steps) if (step.kind !== 'said') step.running = false
    } else if (event.type === 'command/failed') {
      if (live && text(payload.kind).startsWith('turn')) {
        turn.status = 'failed'
        turn.activity = null
      }
    } else if (event.type === 'data.missing') {
      const code = text(payload.security_code)
      if (code && !turn.missing.some((each) => each.code === code)) {
        turn.missing.push({ code, dataset: text(payload.dataset) || null })
      }
    } else if (event.type === 'item/started' || event.type === 'item/completed') {
      const item = (payload.item ?? {}) as Item
      const running = event.type === 'item/started'
      if (item.type === 'reasoning') {
        if (running && live) turn.activity = 'thinking'
      } else if (item.type === 'mcpToolCall') {
        put(turn, dataStep(item, running))
        if (live) turn.activity = running ? 'data' : 'thinking'
      } else if (item.type === 'commandExecution') {
        put(turn, fileStep(item, running))
        if (live) turn.activity = running ? 'file' : 'thinking'
      } else if (item.type === 'agentMessage') {
        if (running) {
          if (live) turn.activity = 'writing'
        } else if (text(item.text)) {
          demote(turn)
          turn.answer = { id: text(item.id), text: text(item.text) }
          if (live) turn.activity = 'thinking'
        }
      }
    }
  }
  return turns
}

// 有没有一轮还在跑：发送钮这时候变成停止钮
export function running(turns: readonly TurnView[]): TurnView | null {
  const last = turns[turns.length - 1]
  return last && (last.status === 'queued' || last.status === 'running') ? last : null
}

// 过程收成一行：「查了 2 次数据 · 读了 1 个文件」。数出来，由页面去说
export function tally(steps: readonly Step[]) {
  return {
    data: steps.filter((step) => step.kind === 'data').length,
    files: steps.filter((step) => step.kind === 'file' && step.reading).length,
    commands: steps.filter((step) => step.kind === 'file' && !step.reading).length,
    failed: steps.filter((step) => step.kind !== 'said' && step.failed).length,
  }
}
