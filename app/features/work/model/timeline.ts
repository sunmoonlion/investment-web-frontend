// 事件 → 工作页的过程时间线。纯函数。
// 时间线不是气泡：重点是「它在我的目录里做了什么」。
// 一段过程（它说了一句要做什么，接着跑了几条命令）收成一行，点开才看细节；
// 改文件、等你批准、没有数据这三样一直摆在外面，不收起来。
import type { ConversationEvent } from '@/contracts/workbench-v2'
import {
  changeStep,
  commandStep,
  dataStep,
  text,
  turnIdOf,
  type ChangedFile,
  type ChangeStep,
  type CommandStep,
  type DataStep,
  type Item,
} from '@/lib/workbench/items'

export type Approval = {
  id: string
  token: string
  command: string
  cwd: string
  reason: string
  state: 'pending' | 'answered' | 'expired'
  decision: string | null
}

export type Entry =
  | { kind: 'user'; key: string; text: string }
  | { kind: 'model'; key: string; text: string; turn: string | null }
  | {
      kind: 'phase'
      key: string
      said: string | null
      steps: (DataStep | CommandStep)[]
      turn: string | null
    }
  | { kind: 'change'; key: string; step: ChangeStep }
  | { kind: 'approval'; key: string; approval: Approval }
  | { kind: 'missing'; key: string; code: string; dataset: string | null }
  // 交给专家之后、交回之前：专家做的事不进这条时间线（它有自己的步骤进度）
  | { kind: 'handover'; key: string; what: 'given' | 'returned' }
  | { kind: 'notice'; key: string; what: 'stopped' | 'failed' }

export type Activity =
  | 'waiting'
  | 'thinking'
  | 'data'
  | 'command'
  | 'change'
  | 'writing'
  | 'approval'

export type Timeline = {
  entries: Entry[]
  // 有一轮还在跑：它这会儿在干什么
  live: Activity | null
  // 上一轮是怎么结束的
  last: 'none' | 'completed' | 'stopped' | 'failed'
  // 这段对话里用补丁改过的文件。同一个文件改了几次就有几条，按先后
  changes: ChangedFile[]
}

export function timeline(events: readonly ConversationEvent[]): Timeline {
  const entries: Entry[] = []
  const changes = new Map<string, ChangeStep>()
  let live: Activity | null = null
  let last: Timeline['last'] = 'none'
  let asked = 0
  // 专家拿着方向盘的时候：它每一步交回的是给验收看的原样，不是给人读的话，不摆进来
  let expert = false

  const attach = (step: DataStep | CommandStep, turn: string | null) => {
    for (const entry of entries) {
      if (entry.kind !== 'phase') continue
      const at = entry.steps.findIndex((each) => each.id === step.id && each.kind === step.kind)
      if (at >= 0) {
        entry.steps[at] = step
        return
      }
    }
    const tail = entries[entries.length - 1]
    if (tail?.kind === 'phase' && tail.turn === turn) {
      tail.steps.push(step)
    } else if (tail?.kind === 'model' && tail.turn === turn) {
      // 它刚说了一句要做什么，接着就动手：那句话是这一段过程的标题
      entries[entries.length - 1] = {
        kind: 'phase',
        key: tail.key,
        said: tail.text,
        steps: [step],
        turn,
      }
    } else {
      entries.push({ kind: 'phase', key: `phase:${step.id}`, said: null, steps: [step], turn })
    }
  }

  for (const event of events) {
    const payload = event.payload as Item
    const turn = turnIdOf(payload)
    // 专家那一段里只留三样：交回、没有数据、要用户批准的命令（批准不能等专家页做好）
    if (
      expert &&
      event.type !== 'wheel/return' &&
      event.type !== 'data.missing' &&
      !event.type.startsWith('interaction/')
    ) {
      continue
    }
    switch (event.type) {
      case 'turn/requested':
        entries.push({ kind: 'user', key: `user:${event.cursor}`, text: text(payload.text) })
        asked += 1
        live = 'waiting'
        break
      case 'turn/started':
        if (asked > 0) live = 'thinking'
        break
      case 'turn/completed': {
        const status = text((payload.turn as Item | undefined)?.status)
        live = null
        last = status === 'interrupted' ? 'stopped' : status === 'failed' ? 'failed' : 'completed'
        for (const entry of entries) {
          if (entry.kind === 'phase') for (const step of entry.steps) step.running = false
        }
        if (last !== 'completed') {
          entries.push({ kind: 'notice', key: `notice:${event.cursor}`, what: last })
        }
        break
      }
      case 'command/failed':
        if (live !== null && text(payload.kind).startsWith('turn')) {
          live = null
          last = 'failed'
          entries.push({ kind: 'notice', key: `notice:${event.cursor}`, what: 'failed' })
        }
        break
      case 'data.missing': {
        const code = text(payload.security_code)
        if (code && !entries.some((entry) => entry.kind === 'missing' && entry.code === code)) {
          entries.push({
            kind: 'missing',
            key: `missing:${code}`,
            code,
            dataset: text(payload.dataset) || null,
          })
        }
        break
      }
      case 'interaction/opened': {
        if (payload.kind !== 'tool_approval') break
        const subject = (payload.subject ?? {}) as Item
        entries.push({
          kind: 'approval',
          key: `approval:${text(payload.interaction_id)}`,
          approval: {
            id: text(payload.interaction_id),
            token: text(payload.token),
            command: text(subject.command),
            cwd: text(subject.cwd),
            reason: text(subject.reason),
            state: 'pending',
            decision: null,
          },
        })
        live = 'approval'
        break
      }
      case 'interaction/consumed':
      case 'interaction/expired': {
        const found = entries.find(
          (entry) =>
            entry.kind === 'approval' && entry.approval.id === text(payload.interaction_id),
        )
        if (found?.kind === 'approval') {
          found.approval.state = event.type === 'interaction/expired' ? 'expired' : 'answered'
          found.approval.decision =
            text(((payload.response ?? {}) as Item).decision) || found.approval.decision
          if (live === 'approval') live = 'thinking'
        }
        break
      }
      case 'wheel/handover':
        entries.push({ kind: 'handover', key: `handover:${event.cursor}`, what: 'given' })
        expert = true
        live = null
        break
      case 'wheel/return':
        entries.push({ kind: 'handover', key: `handover:${event.cursor}`, what: 'returned' })
        expert = false
        live = null
        break
      case 'item/started':
      case 'item/completed': {
        const item = (payload.item ?? {}) as Item
        const running = event.type === 'item/started'
        const busy = live !== null && live !== 'approval'
        if (item.type === 'reasoning') {
          if (running && busy) live = 'thinking'
        } else if (item.type === 'mcpToolCall') {
          attach(dataStep(item, running), turn)
          if (busy) live = running ? 'data' : 'thinking'
        } else if (item.type === 'commandExecution') {
          attach(commandStep(item, running), turn)
          if (busy) live = running ? 'command' : 'thinking'
        } else if (item.type === 'fileChange') {
          const step = changeStep(item, running)
          const at = entries.findIndex(
            (entry) => entry.kind === 'change' && entry.step.id === step.id,
          )
          if (at >= 0) entries[at] = { kind: 'change', key: `change:${step.id}`, step }
          else entries.push({ kind: 'change', key: `change:${step.id}`, step })
          if (!running && !step.failed) changes.set(step.id, step)
          if (busy) live = running ? 'change' : 'thinking'
        } else if (item.type === 'agentMessage') {
          if (running) {
            if (busy) live = 'writing'
          } else if (text(item.text)) {
            entries.push({
              kind: 'model',
              key: `model:${text(item.id) || event.cursor}`,
              text: text(item.text),
              turn,
            })
            if (busy) live = 'thinking'
          }
        }
        break
      }
    }
  }
  return {
    entries,
    live,
    last,
    changes: [...changes.values()].flatMap((step) => step.files),
  }
}

// 「改动」栏：一个文件一行，同一个文件改了几次合在一起
export type FileChanges = {
  path: string
  how: ChangedFile['how']
  added: number
  removed: number
  diffs: string[]
}

export function byFile(changes: readonly ChangedFile[]): FileChanges[] {
  const files = new Map<string, FileChanges>()
  for (const change of changes) {
    const seen = files.get(change.path)
    if (seen) {
      seen.added += change.added
      seen.removed += change.removed
      seen.diffs.push(change.diff)
      // 先新建后修改，还是「新建」；后来删了，就是「删除」
      if (change.how === 'delete') seen.how = 'delete'
    } else {
      files.set(change.path, {
        path: change.path,
        how: change.how,
        added: change.added,
        removed: change.removed,
        diffs: [change.diff],
      })
    }
  }
  return [...files.values()]
}

export function phaseTally(steps: readonly (DataStep | CommandStep)[]) {
  return {
    commands: steps.filter((step) => step.kind === 'file').length,
    data: steps.filter((step) => step.kind === 'data').length,
    failed: steps.filter((step) => step.failed).length,
    running: steps.some((step) => step.running),
  }
}
