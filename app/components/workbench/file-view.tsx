'use client'

import { ChevronLeftIcon, LoaderIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { Markdown } from '@/components/common/markdown'
import { Button } from '@/components/ui/button'
import { baseName, decodeText, isMarkdown, sizeText } from '@/lib/workbench/file-tree'
import { useFileContent } from '@/lib/workbench/queries'

import { ServiceProblem } from './file-tree'

// 点开一个文件看内容（0022）：≤ 1 MiB 的文本直接看，Markdown 渲染；二进制或更大的只给大小。只读。
export function FileView({
  environment,
  path,
  onBack,
}: {
  environment: string
  path: string
  onBack: () => void
}) {
  const t = useTranslations('work')
  const file = useFileContent(environment, path)
  const decoded = useMemo(() => (file.data ? decodeText(file.data.content) : null), [file.data])
  return (
    <section aria-label={baseName(path)} className="flex h-full min-h-0 flex-col">
      <header className="mb-2 flex items-center gap-1">
        <Button variant="ghost" size="icon-xs" aria-label={t('files.back')} onClick={onBack}>
          <ChevronLeftIcon />
        </Button>
        <span className="truncate font-medium" title={path}>
          {baseName(path)}
        </span>
        {file.data ? (
          <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
            {sizeText(file.data.size)}
          </span>
        ) : null}
      </header>
      {file.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <LoaderIcon className="size-3.5 animate-spin" />
          {t('files.loading')}
        </p>
      ) : file.isError ? (
        <ServiceProblem error={file.error} />
      ) : decoded && 'binary' in decoded ? (
        <p className="text-muted-foreground leading-6">{t('files.binary')}</p>
      ) : decoded ? (
        <div className="min-h-0 flex-1 overflow-auto">
          {isMarkdown(path) ? (
            <Markdown>{decoded.text}</Markdown>
          ) : (
            <pre className="font-mono text-xs leading-5 whitespace-pre-wrap">{decoded.text}</pre>
          )}
          {!file.data.eof ? (
            <p className="text-muted-foreground mt-2 text-xs">{t('files.partial')}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
