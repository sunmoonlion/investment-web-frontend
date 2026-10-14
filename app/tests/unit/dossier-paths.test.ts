import { describe, expect, it } from 'vitest'

import { stateOf, whenOf } from '@/components/workbench/dossier-panel'
import { underDirectory } from '@/lib/workbench/file-tree'

// 「工作底稿」栏（所有者 2026-10-14）：各次底稿按对话、按次各一格，位置相对项目目录
describe('工作底稿的位置', () => {
  const file = '底稿/对话-0ca14efb/2026-10-14-092623-财务分析与预测/交回.md'

  it('相对路径接到那台电脑的项目目录上，分隔符跟着目录走', () => {
    expect(underDirectory('C:\\Users\\zymun\\Desktop', file)).toBe(
      'C:\\Users\\zymun\\Desktop\\底稿\\对话-0ca14efb\\2026-10-14-092623-财务分析与预测\\交回.md',
    )
    expect(underDirectory('C:\\', '底稿/a.md')).toBe('C:\\底稿\\a.md')
    expect(underDirectory('/home/u/p/', '底稿/a.md')).toBe('/home/u/p/底稿/a.md')
  })

  it('格子名里读出开始时间；委托状态说成人话', () => {
    expect(whenOf('底稿/对话-0ca14efb/2026-10-14-092623-财务分析与预测')).toBe('2026-10-14 09:26')
    expect(whenOf('底稿/旧的')).toBe('')
    expect(['SUCCEEDED', 'CANCELLED', 'FAILED', 'REJECTED', 'RUNNING'].map(stateOf)).toEqual([
      'done',
      'stopped',
      'failed',
      'failed',
      'running',
    ])
  })
})
