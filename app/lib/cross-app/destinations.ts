import { defineDestinations } from '@/lib/cross-app/links'

// investment 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
// 2026-10-07 所有者定：公共数据的入口（数据目录、申请入库）不在用户侧，放管理后台。现在没有要带用户去的别的应用。
export const destinations = defineDestinations({})

export type DestinationKey = keyof typeof destinations
