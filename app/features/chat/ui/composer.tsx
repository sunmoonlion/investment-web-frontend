'use client'

import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// 输入框。模型在答的时候，发送钮变成停止钮：随时能停。
export function Composer({
  busy,
  sending,
  stopping,
  problem,
  onSend,
  onStop,
  children,
}: {
  busy: boolean
  sending: boolean
  stopping: boolean
  problem: string | null
  onSend: (text: string) => Promise<unknown>
  onStop: () => void
  children?: React.ReactNode
}) {
  const t = useTranslations('chat')
  const [draft, setDraft] = useState('')
  const ready = draft.trim().length > 0 && !busy && !sending

  async function send() {
    if (!ready) return
    const text = draft.trim()
    try {
      await onSend(text)
      setDraft('')
    } catch {
      // 没发出去：话留在输入框里，原因由上面显示
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      {problem ? (
        <p role="alert" className="text-destructive mb-2 text-[13px]">
          {problem}
        </p>
      ) : null}
      <div className="bg-background focus-within:border-ring rounded-2xl border p-2 shadow-xs">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send()
            }
          }}
          rows={2}
          aria-label={t('composer.label')}
          placeholder={t('composer.placeholder')}
          className="max-h-48 min-h-12 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center gap-2 px-1 pt-1">
          {children}
          <div className="flex-1" />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={onStop}
              disabled={stopping}
              aria-label={t('composer.stop')}
              title={t('composer.stop')}
            >
              <SquareIcon className="fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => void send()}
              disabled={!ready}
              aria-label={t('composer.send')}
              title={t('composer.send')}
            >
              <ArrowUpIcon />
            </Button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground mt-1.5 text-center text-xs">{t('composer.hint')}</p>
    </div>
  )
}
