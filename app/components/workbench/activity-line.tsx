'use client'

import { LoaderIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Activity } from '@/lib/workbench/timeline'

// 活动行：它这会儿在干什么，摆在消息流末尾、输入框上面，跟着内容滚（0002 第九节）。
// 不是气泡，不进历史；答完就没了，回答本身留下。等批准的时候卡片就在上面，这里只说一句，不转圈。
export function ActivityLine({
  activity,
  detail = null,
}: {
  activity: Activity
  // 跑命令时是命令本身，查数据时是查的什么；别的没有
  detail?: string | null
}) {
  const tc = useTranslations('conversation')
  const spinning = activity !== 'approval' && activity !== 'waiting'
  return (
    <div
      role="status"
      className="text-muted-foreground flex min-w-0 items-center gap-2 py-1 text-[13px]"
    >
      {spinning ? <LoaderIcon className="size-3.5 shrink-0 animate-spin" /> : null}
      <span className="shrink-0">{tc(`activity.${activity}`)}</span>
      {detail ? (
        <span className="truncate font-mono text-xs" title={detail}>
          {detail}
        </span>
      ) : null}
    </div>
  )
}
