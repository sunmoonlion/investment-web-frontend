import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { defaultLocale, locales } from '@/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const safeLocale = locales.includes(locale as (typeof locales)[number]) ? locale : defaultLocale
  const messages = (await import(`../../messages/${safeLocale}.json`)).default

  return {
    title: {
      default: messages.meta.title,
      template: `%s | ${messages.meta.title}`,
    },
    description: messages.meta.description,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = (await import(`../../messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale} className="contents">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
