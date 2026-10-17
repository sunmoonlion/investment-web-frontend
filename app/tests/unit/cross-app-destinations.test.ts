import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'

describe('where knowbench takes people', () => {
  it('only to the owner’s own knowbots in knowmart; public data entries live in the admin consoles', () => {
    // 2026-10-07 所有者定公共数据入口放管理后台；2026-10-16 定「请分身」跳到 knowmart 选（SDD 0027）
    expect(destinations).toEqual({
      'knowmart.knowbots': { target: 'knowmart', segments: ['knowbots'] },
    })
  })
})
