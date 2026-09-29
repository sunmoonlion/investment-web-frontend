'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'

import { fetchCrossAppLinks, fetchCrossAppOrigin } from '@/lib/cross-app/client'

const FIVE_MINUTES = 5 * 60 * 1000

export function useCrossAppLinks() {
  return useQuery({
    queryKey: ['web', 'cross-app', 'links'] as const,
    queryFn: fetchCrossAppLinks,
    staleTime: FIVE_MINUTES,
  })
}

// 这个页面是不是别的应用带过来的。读的是地址栏里的 from 与 ref。
export function useCrossAppOrigin() {
  const search = useSearchParams()
  const from = search.get('from')
  const ref = search.get('ref')
  return useQuery({
    queryKey: ['web', 'cross-app', 'origin', from, ref] as const,
    queryFn: () => fetchCrossAppOrigin(from, ref),
    enabled: from !== null,
    staleTime: FIVE_MINUTES,
  })
}
