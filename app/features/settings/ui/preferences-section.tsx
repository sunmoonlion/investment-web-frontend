'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { locales } from '@/i18n'
import {
  ACCENTS,
  APPEARANCES,
  EXPAND_LEVELS,
  SIDEBAR_WIDTHS,
  usePreferences,
  type Preferences,
} from '@/lib/preferences'
import { useWorkbench } from '@/lib/workbench/context'
import { cn } from '@/lib/utils'

const SWATCH: Record<Preferences['accent'], string> = {
  ink: 'bg-neutral-800',
  blue: 'bg-blue-600',
  green: 'bg-green-700',
  orange: 'bg-orange-500',
}

// 个人偏好（0021 §二之 1）：语言、外观、主题色、侧边栏。只存浏览器本地。
export function PreferencesSection() {
  const t = useTranslations('settings.preferences')
  const { locale } = useWorkbench()
  const pathname = usePathname()
  const { preferences, restore, update } = usePreferences()
  useEffect(() => restore(), [restore])
  const rest = pathname.replace(/^\/[^/]+/, '')

  const choice = <K extends keyof Preferences>(
    key: K,
    options: readonly Preferences[K][],
    label: (value: Preferences[K]) => string,
  ) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t(key as 'appearance')}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
              preferences[key] === value && 'border-primary ring-primary/30 ring-2',
            )}
          >
            <input
              type="radio"
              name={key}
              className="sr-only"
              checked={preferences[key] === value}
              onChange={() => update({ [key]: value } as Partial<Preferences>)}
            />
            {key === 'accent' ? (
              <span className={cn('size-3 rounded-full', SWATCH[value as Preferences['accent']])} />
            ) : null}
            {label(value)}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <section className="space-y-6 rounded-xl border p-5" aria-labelledby="settings-preferences">
      <div>
        <h2 id="settings-preferences" className="text-base font-semibold">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('language')}</legend>
        <div className="flex flex-wrap gap-2">
          {locales.map((each) => (
            <Link
              key={each}
              href={`/${each}${rest}`}
              aria-current={each === locale ? 'page' : undefined}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm',
                each === locale && 'border-primary ring-primary/30 ring-2',
              )}
            >
              {t(`languageOf.${each}` as 'languageOf.en')}
            </Link>
          ))}
        </div>
      </fieldset>
      {choice('appearance', APPEARANCES, (v) => t(`appearanceOf.${v}`))}
      {choice('accent', ACCENTS, (v) => t(`accentOf.${v}`))}
      {choice('sidebar', SIDEBAR_WIDTHS, (v) => t(`sidebarOf.${v}`))}
      {choice('expand', EXPAND_LEVELS, (v) => t(`expandOf.${v}`))}
    </section>
  )
}
