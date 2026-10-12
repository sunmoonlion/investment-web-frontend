'use client'

import { create } from 'zustand'

export type PersonalPreferences = {
  language: 'zh-CN' | 'en'
  appearance: 'system' | 'light' | 'dark'
  theme: 'neutral' | 'blue' | 'green' | 'violet'
  sidebarWidth: 'compact' | 'standard' | 'wide'
  expandedLevel: 'computer' | 'workspace' | 'project'
}

type PreferenceStore = PersonalPreferences & {
  restore: (language: PersonalPreferences['language']) => void
  update: (patch: Partial<PersonalPreferences>) => void
}

export const DEFAULT_PERSONAL_PREFERENCES: PersonalPreferences = {
  language: 'zh-CN',
  appearance: 'system',
  theme: 'neutral',
  sidebarWidth: 'standard',
  expandedLevel: 'project',
}

const STORAGE_KEY = 'workbench.personal-preferences.v1'

function validPreferences(value: unknown): Partial<PersonalPreferences> {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  return {
    ...(input.language === 'zh-CN' || input.language === 'en'
      ? { language: input.language }
      : {}),
    ...(input.appearance === 'system' || input.appearance === 'light' || input.appearance === 'dark'
      ? { appearance: input.appearance }
      : {}),
    ...(input.theme === 'neutral' ||
    input.theme === 'blue' ||
    input.theme === 'green' ||
    input.theme === 'violet'
      ? { theme: input.theme }
      : {}),
    ...(input.sidebarWidth === 'compact' ||
    input.sidebarWidth === 'standard' ||
    input.sidebarWidth === 'wide'
      ? { sidebarWidth: input.sidebarWidth }
      : {}),
    ...(input.expandedLevel === 'computer' ||
    input.expandedLevel === 'workspace' ||
    input.expandedLevel === 'project'
      ? { expandedLevel: input.expandedLevel }
      : {}),
  }
}

function applyPreferences(preferences: PersonalPreferences) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const systemDark =
    preferences.appearance === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  root.classList.toggle('dark', preferences.appearance === 'dark' || systemDark)
  root.dataset.theme = preferences.theme
  root.dataset.sidebarWidth = preferences.sidebarWidth
}

export const usePersonalPreferences = create<PreferenceStore>((set, get) => ({
  ...DEFAULT_PERSONAL_PREFERENCES,
  restore: (language) => {
    let saved: Partial<PersonalPreferences> = {}
    try {
      saved = validPreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'))
    } catch {
      // Invalid or unavailable browser storage falls back to safe defaults.
    }
    const next = { ...DEFAULT_PERSONAL_PREFERENCES, ...saved, language }
    set(next)
    applyPreferences(next)
  },
  update: (patch) => {
    const next = { ...get(), ...patch }
    set(next)
    applyPreferences(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The setting remains active for this page load when storage is unavailable.
    }
  },
}))

export function applySystemAppearance() {
  const preferences = usePersonalPreferences.getState()
  if (preferences.appearance === 'system') applyPreferences(preferences)
}
