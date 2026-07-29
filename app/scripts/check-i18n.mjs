import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceLocale = 'en'
const locales = ['en', 'zh-CN']

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenKeys(child, current)
    }
    return [current]
  })
}

async function readMessages(locale) {
  const path = resolve('messages', `${locale}.json`)
  return JSON.parse(await readFile(path, 'utf8'))
}

const sourceKeys = new Set(flattenKeys(await readMessages(sourceLocale)))
const failures = []

for (const locale of locales) {
  const localeKeys = new Set(flattenKeys(await readMessages(locale)))
  const missing = [...sourceKeys].filter((key) => !localeKeys.has(key))
  const extra = [...localeKeys].filter((key) => !sourceKeys.has(key))

  if (missing.length || extra.length) {
    failures.push({ locale, missing, extra })
  }
}

if (failures.length) {
  console.error(JSON.stringify({ result: 'failed', failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(
    JSON.stringify({
      result: 'passed',
      sourceLocale,
      locales,
      keyCount: sourceKeys.size,
    }),
  )
}
