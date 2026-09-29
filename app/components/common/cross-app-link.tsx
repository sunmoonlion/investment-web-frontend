'use client'

import { useLocale } from 'next-intl'

import { destinations, type DestinationKey } from '@/lib/cross-app/destinations'
import { crossAppAnchorProps, crossAppHref } from '@/lib/cross-app/links'
import { useCrossAppLinks } from '@/lib/cross-app/use-cross-app'

type CrossAppLinkProps = {
  to: DestinationKey
  values?: Record<string, string | null | undefined>
  // 来处的引用，例如委托的编号。对方只存、只原样显示
  refValue?: string | null
  className?: string
  children: React.ReactNode
  // 目标应用没有配置、或者地址还没取到时显示什么。默认什么都不显示
  fallback?: React.ReactNode
}

// 去别的应用的某个页面。新标签页打开；链接里不带身份、令牌、回去的地址。
export function CrossAppLink({
  to,
  values,
  refValue,
  className,
  children,
  fallback = null,
}: CrossAppLinkProps) {
  const locale = useLocale()
  const links = useCrossAppLinks()
  if (!links.data) return <>{fallback}</>
  const href = crossAppHref({
    links: links.data,
    destination: destinations[to],
    locale,
    values,
    ref: refValue,
  })
  if (href === null) return <>{fallback}</>
  return (
    <a href={href} className={className} {...crossAppAnchorProps}>
      {children}
    </a>
  )
}
