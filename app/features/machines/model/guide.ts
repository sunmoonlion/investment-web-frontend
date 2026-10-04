// 接入一台机器的三步，各做到了没有。纯函数：看的是已有的清单，不另外问后端。
import type { Machine } from '@/contracts/workbench-v2'

export type GuideProgress = { sandbox: boolean; agent: boolean; roots: boolean }

export function progress(input: {
  sandboxes: number | undefined
  machines: Machine[] | undefined
}): GuideProgress {
  const machines = input.machines ?? []
  return {
    // 第一步：拉起过沙箱
    sandbox: (input.sandboxes ?? 0) > 0,
    // 第二步：本地代理登记过（有机器）
    agent: machines.length > 0,
    // 第三步：至少一台机器的白名单里有目录
    roots: machines.some((machine) => machine.roots.length > 0),
  }
}

export function isOnline(machine: Machine) {
  return machine.status === 'online'
}
