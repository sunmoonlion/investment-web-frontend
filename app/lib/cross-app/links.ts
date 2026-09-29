import {
  crossAppNamePattern,
  crossAppRefPattern,
  isPlainWebAddress,
  type CrossAppLinks,
} from '@/contracts/cross-app'

// 一个应用把用户带到另一个应用的某个页面：整个网页端只在这里拼链接。
//
// 链接里带：业务参数、from（从哪个应用来）、ref（来处的引用）。
// 链接里不带：身份、令牌、回去的地址。用户是谁由他在目标应用的登录决定；
// 回去的地址由目标应用在自己的配置里查。

export type CrossAppDestination = {
  // 去哪个应用
  target: string
  // 语言之后的路径，一段一段写。以冒号开头的是要填的，例如 ['catalog', ':dataset']
  segments: readonly string[]
  // 这个页面认哪几个业务参数。没登记的不许带
  params?: readonly string[]
}

const NEVER_IN_A_LINK = new Set([
  'from',
  'ref',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'session',
  'sid',
  'csrf',
  'csrf_token',
  'return_to',
  'return_url',
  'redirect',
  'redirect_uri',
  'next',
])

const NAME = /^[a-z][a-z0-9_]{0,31}$/
const SEGMENT = /^[A-Za-z0-9._~-]{1,128}$/
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/

export function defineDestinations<const T extends Record<string, CrossAppDestination>>(
  destinations: T,
): T {
  for (const [key, destination] of Object.entries(destinations)) {
    if (!crossAppNamePattern.test(destination.target)) {
      throw new Error(`cross-app destination ${key}: invalid target`)
    }
    if (destination.segments.length === 0) {
      throw new Error(`cross-app destination ${key}: no path`)
    }
    for (const segment of destination.segments) {
      const name = segment.startsWith(':') ? segment.slice(1) : null
      if (name === null ? !SEGMENT.test(segment) : !NAME.test(name)) {
        throw new Error(`cross-app destination ${key}: invalid path segment`)
      }
    }
    const slots = destination.segments.filter((s) => s.startsWith(':')).map((s) => s.slice(1))
    for (const name of [...(destination.params ?? []), ...slots]) {
      if (!NAME.test(name) || NEVER_IN_A_LINK.has(name)) {
        throw new Error(`cross-app destination ${key}: "${name}" must not be in a link`)
      }
    }
  }
  return destinations
}

export type CrossAppHrefInput = {
  links: CrossAppLinks
  destination: CrossAppDestination
  locale: string
  values?: Record<string, string | null | undefined>
  // 来处的引用。不合规则的当作没带
  ref?: string | null
}

// 目标应用没有配置时返回 null：页面不显示这个链接，不显示一个点不动的。
export function crossAppHref(input: CrossAppHrefInput): string | null {
  const { links, destination, locale } = input
  const target = links.targets[destination.target]
  if (!target || !isPlainWebAddress(target.web_base_url)) return null
  if (!LOCALE.test(locale)) throw new Error('cross-app link: invalid locale')

  const values = input.values ?? {}
  const slots = new Set(
    destination.segments.filter((s) => s.startsWith(':')).map((s) => s.slice(1)),
  )
  const allowed = new Set(destination.params ?? [])
  for (const name of Object.keys(values)) {
    if (!slots.has(name) && !allowed.has(name)) {
      throw new Error(`cross-app link: "${name}" is not registered for this destination`)
    }
  }

  const path = destination.segments.map((segment) => {
    if (!segment.startsWith(':')) return segment
    const value = values[segment.slice(1)]
    if (typeof value !== 'string' || value === '' || value.length > 256) {
      throw new Error(`cross-app link: "${segment.slice(1)}" is required`)
    }
    return encodeURIComponent(value)
  })

  const query = new URLSearchParams()
  for (const name of destination.params ?? []) {
    const value = values[name]
    if (typeof value === 'string' && value !== '' && value.length <= 256) query.set(name, value)
  }
  query.set('from', links.app)
  if (typeof input.ref === 'string' && crossAppRefPattern.test(input.ref)) {
    query.set('ref', input.ref)
  }

  const base = target.web_base_url.replace(/\/+$/, '')
  return `${base}/${locale}/${path.join('/')}?${query.toString()}`
}

// 新标签页打开；不把来处的地址、窗口的引用交给对方
export const crossAppAnchorProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
