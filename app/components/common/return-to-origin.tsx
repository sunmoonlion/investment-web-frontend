'use client'

import { useCrossAppOrigin } from '@/lib/cross-app/use-cross-app'

type ReturnToOriginProps = {
  className?: string
  children: React.ReactNode
}

// 「回到原处」。只有别的应用带过来、而且那个应用登记了回跳地址时才显示。
// 地址是后端按配置给的；地址栏里带的任何地址都不用。
export function ReturnToOrigin({ className, children }: ReturnToOriginProps) {
  const origin = useCrossAppOrigin()
  const href = origin.data?.return_url
  if (!href) return null
  return (
    <a href={href} className={className} rel="noopener noreferrer">
      {children}
    </a>
  )
}
