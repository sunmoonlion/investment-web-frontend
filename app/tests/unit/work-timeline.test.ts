import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { conversationEventSchema, type ConversationEvent } from '@/contracts/workbench-v2'
import { byFile, phaseTally, timeline } from '@/features/work/model/timeline'
import { relativeTo } from '@/lib/workbench/items'

const full = join(process.cwd(), 'preview/fixtures/full')
const manifest = JSON.parse(readFileSync(join(full, 'manifest.json'), 'utf8')) as {
  pages: { title: string; path: string }[]
  responses: { method: string; path: string; file: string }[]
}

// 样例里的那段工作：第一轮是真 Codex 录的（看目录、读文件、写文件），
// 第二轮是照协议拼的（用补丁改文件），第三轮是录的（一条命令停在等批准）
function work(): ConversationEvent[] {
  const page = manifest.pages.find((each) => each.title.startsWith('工作（'))!
  const id = page.path.split('/').pop()!
  const found = manifest.responses.find(
    (each) => each.path === `/api/workbench/sessions/${id}/events`,
  )!
  const body = JSON.parse(readFileSync(join(full, found.file), 'utf8')) as { events: unknown[] }
  return body.events.map((event) => conversationEventSchema.parse(event))
}

describe('工作页的时间线', () => {
  const all = work()
  const line = timeline(all)

  it('三句话、三段过程、一次改文件、一件等批准的事', () => {
    expect(line.entries.filter((entry) => entry.kind === 'user')).toHaveLength(3)
    const phases = line.entries.filter((entry) => entry.kind === 'phase')
    // 它先说一句要做什么，再动手：那句话成了这一段的标题，不再单独占一行
    expect(phases[0]).toMatchObject({ said: '我先看一下当前目录结构，然后创建这个说明文件。' })
    expect(phases[0].kind === 'phase' && phases[0].steps).toHaveLength(2)
    expect(phases.map((phase) => phase.kind === 'phase' && phase.steps.length)).toEqual([2, 1, 1])
    expect(phaseTally(phases[0].kind === 'phase' ? phases[0].steps : [])).toEqual({
      commands: 2,
      data: 0,
      failed: 0,
      running: false,
    })
    // 模型的思考不进时间线
    expect(JSON.stringify(line.entries)).not.toContain('The user wants')
  })

  it('最后的回答是单独的一条，不被当成过程的标题', () => {
    const models = line.entries.filter((entry) => entry.kind === 'model')
    expect(models.some((entry) => entry.kind === 'model' && entry.text.startsWith('已创建'))).toBe(
      true,
    )
    expect(models.some((entry) => entry.kind === 'model' && entry.text.startsWith('改好了'))).toBe(
      true,
    )
  })

  it('用补丁改的文件：摆在外面，也进「改动」栏', () => {
    const change = line.entries.find((entry) => entry.kind === 'change')
    expect(change?.kind === 'change' && change.step.files.map((file) => file.how)).toEqual([
      'update',
      'add',
    ])
    const files = byFile(line.changes)
    expect(files.map((file) => relativeTo('/home/demo/research/恒瑞医药', file.path))).toEqual([
      'README.md',
      'notes/待办.md',
    ])
    expect(files[0]).toMatchObject({ how: 'update', added: 2, removed: 1 })
    expect(files[1]).toMatchObject({ how: 'add', added: 4, removed: 0 })
  })

  it('等批准的命令：一张卡，带着答复用的凭证；这时候它在等你', () => {
    const waiting = line.entries.filter((entry) => entry.kind === 'approval')
    expect(waiting).toHaveLength(1)
    const approval = waiting[0].kind === 'approval' ? waiting[0].approval : null
    expect(approval).toMatchObject({ state: 'pending', cwd: '/home/demo/research/恒瑞医药' })
    expect(approval?.command).toContain('outside.txt')
    expect(approval?.token.length).toBeGreaterThan(16)
    expect(line.live).toBe('approval')
    // 那条命令在最后一段过程里，还在等
    const phases = line.entries.filter((entry) => entry.kind === 'phase')
    const lastPhase = phases[phases.length - 1]
    expect(lastPhase.kind === 'phase' && lastPhase.steps[0].running).toBe(true)
  })

  it('答复之后：卡片记下你答了什么，它接着做', () => {
    const opened = all.find((event) => event.type === 'interaction/opened')!
    const answered = conversationEventSchema.parse({
      ...opened,
      id: '00000000-0000-4000-8000-000000009999',
      cursor: all[all.length - 1].cursor + 1,
      type: 'interaction/consumed',
      payload: {
        interaction_id: opened.payload.interaction_id,
        kind: 'tool_approval',
        response: { decision: 'decline' },
      },
    })
    const after = timeline([...all, answered])
    const card = after.entries.find((entry) => entry.kind === 'approval')
    expect(card?.kind === 'approval' && card.approval).toMatchObject({
      state: 'answered',
      decision: 'decline',
    })
    expect(after.live).toBe('thinking')
  })

  it('专家拿着方向盘的那一段：它交回的原样不摆进时间线', () => {
    const page = manifest.pages.find((each) => each.title.startsWith('专家处理中'))!
    const id = page.path.split('/').pop()!
    const found = manifest.responses.find(
      (each) => each.path === `/api/workbench/sessions/${id}/events`,
    )!
    const body = JSON.parse(readFileSync(join(full, found.file), 'utf8')) as { events: unknown[] }
    const during = timeline(body.events.map((event) => conversationEventSchema.parse(event)))
    expect(during.entries.map((entry) => entry.kind)).toEqual(['handover'])
    expect(JSON.stringify(during.entries)).not.toContain('SELECT')
    expect(during.live).toBeNull()
  })

  it('同一个文件改了两次：在「改动」栏里合成一行', () => {
    const files = byFile([
      { path: '/p/a.md', how: 'add', added: 3, removed: 0, diff: 'x' },
      { path: '/p/a.md', how: 'update', added: 1, removed: 2, diff: 'y' },
      { path: '/p/b.md', how: 'update', added: 1, removed: 1, diff: 'z' },
    ])
    expect(files).toEqual([
      { path: '/p/a.md', how: 'add', added: 4, removed: 2, diffs: ['x', 'y'] },
      { path: '/p/b.md', how: 'update', added: 1, removed: 1, diffs: ['z'] },
    ])
    expect(relativeTo('/p', '/p/a.md')).toBe('a.md')
    expect(relativeTo('/p', '/q/a.md')).toBe('/q/a.md')
    expect(relativeTo(null, '/q/a.md')).toBe('/q/a.md')
  })
})
