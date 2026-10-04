'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useConversationEvents } from '@/lib/workbench/conversation-events'

import { useUsage } from '../api/usage'
import { money, symbol, toMicros } from '@/lib/workbench/money'

import { spent } from '../model/spent'

// 花费钮：这段对话到现在花了多少。模型每调用一次跳一次。点开看每一轮的明细和单价。
export function CostButton({ conversation }: { conversation: string }) {
  const t = useTranslations('usage')
  const { events } = useConversationEvents()
  const [open, setOpen] = useState(false)
  const total = spent(events)
  const usage = useUsage(conversation, total.calls, open)
  const sign = symbol(total.currency)
  const price = usage.data?.price

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" aria-label={t('button')} />}>
        <span className="tabular-nums" data-testid="cost-amount">
          {total.micros === null
            ? t('tokens', { count: total.tokens })
            : `${sign}${money(total.micros)}`}
        </span>
        <span className="text-muted-foreground text-xs">{t('estimated')}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <PopoverHeader>
          <PopoverTitle>{t('title')}</PopoverTitle>
          <PopoverDescription>{t('why')}</PopoverDescription>
        </PopoverHeader>
        {usage.isPending ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : usage.isError || !usage.data ? (
          <p className="text-destructive text-sm">{t('failed')}</p>
        ) : usage.data.turns.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('none')}</p>
        ) : (
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-1 font-normal">{t('turn')}</th>
                <th className="py-1 text-right font-normal">{t('calls')}</th>
                <th className="py-1 text-right font-normal">{t('tokenColumn')}</th>
                <th className="py-1 text-right font-normal">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {usage.data.turns.map((turn, index) => {
                const micros = turn.cost === null ? null : toMicros(turn.cost)
                return (
                  <tr key={turn.turn_id ?? index} className="border-b last:border-0">
                    <td className="py-1">{t('turnNumber', { n: index + 1 })}</td>
                    <td className="py-1 text-right">{turn.calls}</td>
                    <td className="py-1 text-right">{turn.tokens.total.toLocaleString()}</td>
                    <td className="py-1 text-right">
                      {micros === null ? '—' : `${sign}${money(micros)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {price ? (
          <p className="text-muted-foreground text-xs leading-5">
            {price.per_million
              ? t('price', {
                  model: price.model ?? '',
                  input: price.per_million.input,
                  cached: price.per_million.cached_input,
                  write: price.per_million.cache_write,
                  output: price.per_million.output,
                  asOf: price.as_of,
                })
              : t('noPrice', { model: price.model ?? '' })}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
