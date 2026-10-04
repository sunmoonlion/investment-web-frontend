import { describe, expect, it } from 'vitest'

import type { Machine, Project, Workspace } from '@/contracts/workbench-v2'
import {
  byWorkspace,
  defaultTitle,
  fullDirectory,
  onlyMachine,
  pathProblem,
  rootsOf,
} from '@/features/projects/model/projects'

const E1 = '11111111-1111-4111-8111-111111111111'
const E2 = '22222222-2222-4222-8222-222222222222'
const office: Workspace = {
  environment_id: E1,
  environment_name: '办公室',
  online: true,
  root: '/r',
}
const other: Workspace = {
  environment_id: E1,
  environment_name: '办公室',
  online: true,
  root: '/s',
}

function project(id: string, at: { environment_id: string; root: string }, last: string | null) {
  return {
    id,
    environment_id: at.environment_id,
    workspace_root: at.root,
    path: id,
    title: id,
    directory: `${at.root}/${id}`,
    archived: false,
    conversations: 0,
    last_active_at: last,
    environment_name: '办公室',
    online: true,
  } as Project
}

describe('项目列表', () => {
  it('按工作区分组，组里最近用的在前；空的工作区也列出来', () => {
    const groups = byWorkspace(
      [office, other],
      [project('a', office, '2026-10-01'), project('b', office, '2026-10-03')],
    )
    expect(groups.map((group) => group.projects.map((each) => each.id))).toEqual([['b', 'a'], []])
  })
  it('工作区已经不在白名单里的项目不会凭空消失', () => {
    const groups = byWorkspace(
      [office],
      [project('x', { environment_id: E2, root: '/gone' }, null)],
    )
    expect(groups).toHaveLength(2)
    expect(groups[1].workspace.root).toBe('/gone')
    expect(groups[1].projects.map((each) => each.id)).toEqual(['x'])
  })
})

describe('新建项目', () => {
  const machines = [
    { id: E1, name: '办公室', status: 'online', roots: ['/r', '/s'] },
    { id: E2, name: '家里', status: 'offline', roots: ['/h'] },
  ] as Machine[]
  it('只有一台机器时不用选', () => {
    expect(onlyMachine(machines)).toBeNull()
    expect(onlyMachine([machines[0]])).toBe(E1)
    expect(rootsOf(machines, E2)).toEqual(['/h'])
    expect(rootsOf(machines, null)).toEqual([])
  })
  it('子目录是相对工作区的：不许往上走、不许写绝对路径', () => {
    expect(pathProblem('恒瑞医药')).toBeNull()
    expect(pathProblem('a/b')).toBeNull()
    expect(pathProblem('')).toBeNull()
    expect(pathProblem('/etc')).toBe('absolute')
    expect(pathProblem('C:\\x')).toBe('absolute')
    expect(pathProblem('a/../b')).toBe('upward')
  })
  it('没填名字时用目录的最后一段', () => {
    expect(defaultTitle('/home/me/research', '医药/恒瑞医药')).toBe('恒瑞医药')
    expect(defaultTitle('/home/me/research', '')).toBe('research')
    expect(fullDirectory('/home/me/research', ' 医药/恒瑞/ ')).toBe('/home/me/research/医药/恒瑞')
    expect(fullDirectory('/home/me/research/', '')).toBe('/home/me/research/')
  })
})
