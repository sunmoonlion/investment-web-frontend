import type { MetadataRoute } from 'next'
import { locales } from '@/i18n'
import { serverEnv } from '@/env/server'

export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: new URL(`/${locale}`, serverEnv.APP_ORIGIN).toString(),
    changeFrequency: 'weekly',
    priority: locale === 'zh-CN' ? 1 : 0.8,
  }))
}
