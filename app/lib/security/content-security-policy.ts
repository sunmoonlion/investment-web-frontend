// 本机代理的回环口（0022 乙案，账 87 / 92）：网页直接问 127.0.0.1 上的代理，文件不经云端。
// 五个候选口与代理、`lib/workbench/local-agent.ts` 的 LOCAL_PORTS 一致；2026-10-13 真机发现 CSP 把它拦了。
export const LOCAL_AGENT_ORIGINS = [47811, 47812, 47813, 47814, 47815].map(
  (port) => `http://127.0.0.1:${port}`,
)

const STATIC_DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self' ${LOCAL_AGENT_ORIGINS.join(' ')}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]

export function createContentSecurityPolicy(
  nonce: string,
  development = process.env.NODE_ENV === 'development',
): string {
  if (!/^[A-Za-z0-9+/=_-]{16,128}$/.test(nonce)) {
    throw new Error('CSP nonce format is invalid')
  }
  const script = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(development ? ["'unsafe-eval'"] : []),
  ].join(' ')
  const style = development
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self' 'nonce-${nonce}'`

  return [script, style, ...STATIC_DIRECTIVES].join('; ').concat(';')
}
