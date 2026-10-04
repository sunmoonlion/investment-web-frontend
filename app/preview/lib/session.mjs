// 预览里的登录：没有身份服务，点「登录」就算登录了。
const EIGHT_HOURS = 8 * 60 * 60 * 1000

export const PREVIEW_ACTOR = '00000000-0000-4000-8000-00000000a001'
export const PREVIEW_CSRF = 'preview-csrf-token-0000000000000000000000'

export function parseCookies(header) {
  const found = {}
  for (const part of String(header ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0) found[part.slice(0, at).trim()] = part.slice(at + 1).trim()
  }
  return found
}

export function isSignedIn(cookies, scenario) {
  if (cookies.preview_signed_in === '0') return false
  if (cookies.preview_signed_in === '1') return true
  return scenario ? scenario.signedIn : true
}

export function browserSession(app, scenario, now = Date.now()) {
  const user = scenario?.user ?? {}
  return {
    contract_version: 1,
    authenticated: true,
    user: {
      actor_id: user.actor_id ?? PREVIEW_ACTOR,
      app,
      surface: 'web',
      display_name: user.display_name ?? '样例用户',
      email: user.email ?? null,
      roles: user.roles ?? [],
      scopes: user.scopes ?? [],
      expires_at: new Date(now + EIGHT_HOURS).toISOString(),
    },
    csrf_token: PREVIEW_CSRF,
  }
}

// 登录之后回到哪：只认本站的路径
export function safeReturnTo(value, fallback) {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.includes('://') &&
    value.length <= 1024
  ) {
    return value
  }
  return fallback
}
