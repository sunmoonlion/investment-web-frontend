'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useWorkbench } from '@/lib/workbench/context'
import { usePersonalPreferences } from '../model/personal-preferences'

const selectClass = 'bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm'

export function PersonalPreferencesSection() {
  const t = useTranslations('workbench.settings')
  const { locale } = useWorkbench()
  const pathname = usePathname()
  const router = useRouter()
  const preferences = usePersonalPreferences()

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold">{t('preferences.title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('preferences.hint')}</p>
      </header>
      <div className="rounded-xl border p-5">
        <label className="block text-sm font-medium">
          {t('preferences.language')}
          <select
            className={selectClass}
            value={locale}
            onChange={(event) => {
              const language = event.target.value === 'en' ? 'en' : 'zh-CN'
              preferences.update({ language })
              router.replace(pathname, { locale: language })
            }}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t('preferences.appearance')}
          <select
            className={selectClass}
            value={preferences.appearance}
            onChange={(event) =>
              preferences.update({
                appearance: event.target.value as typeof preferences.appearance,
              })
            }
          >
            {(['system', 'light', 'dark'] as const).map((option) => (
              <option key={option} value={option}>
                {t(`preferences.appearanceOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">{t('preferences.theme')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['neutral', 'blue', 'green', 'violet'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={preferences.theme === theme}
                onClick={() => preferences.update({ theme })}
                className="rounded-lg border px-3 py-2 text-sm aria-pressed:ring-2 aria-pressed:ring-ring"
                data-theme-option={theme}
              >
                {t(`preferences.themeOptions.${theme}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-medium">
          {t('preferences.sidebarWidth')}
          <select
            className={selectClass}
            value={preferences.sidebarWidth}
            onChange={(event) =>
              preferences.update({
                sidebarWidth: event.target.value as typeof preferences.sidebarWidth,
              })
            }
          >
            {(['compact', 'standard', 'wide'] as const).map((option) => (
              <option key={option} value={option}>
                {t(`preferences.sidebarWidthOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t('preferences.expandedLevel')}
          <select
            className={selectClass}
            value={preferences.expandedLevel}
            onChange={(event) =>
              preferences.update({
                expandedLevel: event.target.value as typeof preferences.expandedLevel,
              })
            }
          >
            {(['computer', 'workspace', 'project'] as const).map((option) => (
              <option key={option} value={option}>
                {t(`preferences.expandedLevelOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
