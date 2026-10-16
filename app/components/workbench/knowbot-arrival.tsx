'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { useWorkbench } from '@/lib/workbench/context'
import { WorkbenchError } from '@/lib/workbench/http'
import { KNOWBOT_REF, usePinKnowbot } from '@/lib/workbench/knowbots'
import { routes } from '@/lib/workbench/routes'

// 从 knowmart「我的分身」选定回来（链接带 knowbot=<分身>@<版本>）：后端按会话核验、钉住，
// 然后换到「专家」并选好这一位；链接上的 knowbot 随之去掉，刷新不会再请一次。
export function KnowbotArrival() {
  const t = useTranslations('home.knowbot')
  const router = useRouter()
  const { locale } = useWorkbench()
  const given = useSearchParams().get('knowbot')
  const ref = given && KNOWBOT_REF.test(given) ? given : null
  const pin = usePinKnowbot()
  const started = useRef(false)

  useEffect(() => {
    if (ref === null || started.current) return
    started.current = true
    pin.mutate(ref, {
      onSuccess: (pack) =>
        router.replace(`${routes.home(locale, 'expert')}&expert=${encodeURIComponent(pack.id)}`),
    })
  }, [ref, pin, router, locale])

  if (ref === null) return null
  if (pin.isError) {
    const code = pin.error instanceof WorkbenchError ? pin.error.code : ''
    const said =
      code === 'no_such_expert'
        ? t('notFound')
        : code === 'knowbot_unavailable'
          ? t('unavailable')
          : code === 'knowbot_invalid'
            ? t('invalid')
            : t('failed')
    return (
      <section role="alert" className="space-y-2 rounded-xl border border-amber-300 p-4 text-sm">
        <p>{said}</p>
        <CrossAppLink
          to="knowmart.knowbots"
          refValue="expert"
          className="underline underline-offset-3"
        >
          {t('again')}
        </CrossAppLink>
      </section>
    )
  }
  return (
    <p className="text-muted-foreground text-center text-sm" role="status">
      {t('checking')}
    </p>
  )
}
