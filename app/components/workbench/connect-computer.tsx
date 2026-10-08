'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { useWorkbench } from '@/lib/workbench/context'
import { routes } from '@/lib/workbench/routes'
import { cn } from '@/lib/utils'

// 所有接入入口只导航；签发令牌、目录授权仍由用户在各自步骤操作。
export function ConnectComputerLink({ className }: { className?: string }) {
  const t = useTranslations('computerConnection')
  const { locale } = useWorkbench()
  return (
    <Link href={routes.machines(locale)} className={cn(buttonVariants({ size: 'sm' }), className)}>
      {t('action')}
    </Link>
  )
}
