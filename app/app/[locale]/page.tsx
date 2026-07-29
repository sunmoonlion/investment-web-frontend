import { getTranslations, setRequestLocale } from 'next-intl/server'
import { PublicHome } from '@/components/platform/public-home'

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('public')

  return (
    <PublicHome
      locale={locale}
      title={t('title')}
      description={t('description')}
      loginLabel={t('login')}
      workspaceLabel={t('workspace')}
    />
  )
}
