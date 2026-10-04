// 首页的输入框：三个功能各要什么、现在能不能开始。纯函数。
import type { Machine, Project } from '@/contracts/workbench-v2'
import { isBuilt, type Mode } from '@/lib/workbench/routes'

// 不能开始的原因。页面按这个词去说
export type Blocker =
  | 'empty' // 还没写字
  | 'noSandbox' // 没有沙箱：模型没处跑
  | 'needProject' // 工作、专家必须选项目
  | 'noMachine' // 工作、专家要用户的机器
  | 'machineOffline' // 项目所在的机器不在线
  | 'notBuilt' // 这一页还在做

export function blockerOf(input: {
  mode: Mode
  text: string
  project: Project | undefined
  sandboxes: number | undefined
  machines: Machine[] | undefined
}): Blocker | null {
  const { mode, text, project, sandboxes, machines } = input
  if (sandboxes === 0) return 'noSandbox'
  if (mode !== 'chat') {
    if (!isBuilt(mode === 'work' ? 'projectConversation' : 'askExpert')) return 'notBuilt'
    if (machines && machines.length === 0) return 'noMachine'
    if (!project) return 'needProject'
    if (!project.online) return 'machineOffline'
  }
  if (!text.trim()) return 'empty'
  return null
}

// 聊天也可以放进项目，但这时候读不了项目里的文件也照样能聊
export function projectIsRequired(mode: Mode) {
  return mode !== 'chat'
}
