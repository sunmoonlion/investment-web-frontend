import { defineDestinations } from '@/lib/cross-app/links'

// investment 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
export const destinations = defineDestinations({
  // 工具答复没有数据、专家发现公司没有入库时，去 info 申请入库
  'info.request': { target: 'info', segments: ['requests', 'new'], params: ['code'] },
  // 导航里的「数据目录」
  'knowledge.catalog': { target: 'knowledge', segments: ['catalog'] },
  // 底稿里点数据集的名字
  'knowledge.dataset': { target: 'knowledge', segments: ['catalog', ':dataset'] },
})

export type DestinationKey = keyof typeof destinations
