// 下载/安装仅用户确认；其余根据只读状态，不把下载点击当作安装成功。
import type { Machine } from '@/contracts/workbench-v2'

export type GuideProgress = {
  download: boolean
  install: boolean
  token: boolean
  roots: boolean
  online: boolean
}

export function progress(input: {
  downloaded: boolean
  installed: boolean
  identityIssued: boolean
  machines: Machine[] | undefined
}): GuideProgress {
  const machines = input.machines ?? []
  return {
    download: input.downloaded,
    install: input.installed,
    token: input.identityIssued || machines.some(isOnline),
    roots: machines.some((machine) => machine.roots.length > 0),
    // 须是已选目录的那台电脑在线，不能拼接两台电脑的进度。
    online: machines.some((machine) => isOnline(machine) && machine.roots.length > 0),
  }
}

export function isOnline(machine: Machine) {
  return machine.status === 'online'
}
