import { defineDestinations } from '@/lib/cross-app/links'

// investment 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
// 2026-10-07 所有者定：公共数据的入口（数据目录、申请入库）不在用户侧，放管理后台。
export const destinations = defineDestinations({
  // 「请我的分身」：去 knowmart「我的分身」选一位，选定后 knowmart 按登记的回跳地址带回工作台，
  // 链接上只多 knowbot=<分身>@<版本>（SDD 0027 P4）。回来后由后端按会话向 knowmart 核验
  'knowmart.knowbots': { target: 'knowmart', segments: ['knowbots'] },
})

export type DestinationKey = keyof typeof destinations
