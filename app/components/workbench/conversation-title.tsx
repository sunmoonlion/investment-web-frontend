'use client'

import { PencilIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Input } from '@/components/ui/input'

// 对话的名字：点一下就地改。回车或移开保存，Esc 放弃。
export function ConversationTitle({
  title,
  onRename,
}: {
  title: string | null | undefined
  onRename: (title: string) => void
}) {
  const t = useTranslations('conversation')
  const [draft, setDraft] = useState<string | null>(null)

  function save() {
    const next = (draft ?? '').trim()
    setDraft(null)
    if (next && next !== title) onRename(next)
  }

  if (draft !== null) {
    return (
      <Input
        autoFocus
        value={draft}
        maxLength={400}
        aria-label={t('rename')}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save()
          if (event.key === 'Escape') setDraft(null)
        }}
        className="h-8 max-w-md"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setDraft(title ?? '')}
      title={t('rename')}
      className="group flex min-w-0 items-center gap-1.5 text-sm font-medium"
    >
      <span className="truncate">{title ?? t('untitled')}</span>
      <PencilIcon className="text-muted-foreground size-3 shrink-0 opacity-0 group-hover:opacity-100" />
    </button>
  )
}
