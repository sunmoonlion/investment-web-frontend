'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

import { FileTree, ServiceProblem } from '@/components/workbench/file-tree'
import { FileView } from '@/components/workbench/file-view'
import { useWorkbench } from '@/lib/workbench/context'
import { useLocalAgent, useMachines } from '@/lib/workbench/queries'
import { routes } from '@/lib/workbench/routes'

// 本地知识库（0019 §二，0022 乙案）：用户电脑上的一个目录。网页直连本机代理回环口翻看，一个字节不上云；
// 只在装着代理的那台电脑上看得到。Codex 在工作与专家对话里读它，由代理在那台电脑上执行。
export function LocalLibraryScreen() {
  const t = useTranslations('localLibrary')
  const { locale } = useWorkbench()
  const machines = useMachines()
  const current =
    (machines.data ?? []).find((machine) => machine.status === 'online') ??
    machines.data?.[0] ??
    null
  const link = useLocalAgent(current?.id ?? null)
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
      </header>
      {machines.isSuccess && !current ? (
        <p className="text-muted-foreground text-sm">
          {t('noComputer')}{' '}
          <Link href={routes.computer(locale)} className="underline underline-offset-3">
            {t('goComputer')}
          </Link>
        </p>
      ) : null}
      {current && link.isError ? (
        <div className="text-sm">
          <ServiceProblem error={link.error} />
        </div>
      ) : null}
      {current && link.data && !link.data.info.libraryDir ? (
        <p className="text-muted-foreground text-sm">
          {t('noDir')}{' '}
          <Link href={routes.computer(locale)} className="underline underline-offset-3">
            {t('goComputer')}
          </Link>
        </p>
      ) : null}
      {current && link.data && link.data.info.libraryDir ? (
        <section className="rounded-xl border p-4 text-[13px]" aria-label={t('title')}>
          {opened ? (
            <FileView agent={link.data} path={opened} onBack={() => setOpened(null)} />
          ) : (
            <FileTree
              environment={current.id}
              directory={null}
              selected={opened}
              onSelect={setOpened}
              scope="library"
            />
          )}
        </section>
      ) : null}
    </div>
  )
}
