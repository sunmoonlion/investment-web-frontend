// 登录之后回到哪。没登录的人打开一个要登录的页，先去登录，登录完回到原来要去的那一页，参数还在。
// 只认本站、本语言下的路径：地址栏里的东西不可信，别的一律回默认页。

const MAX = 2000

export function nextPath(locale: string, wanted: string | null | undefined, fallback: string) {
  if (typeof wanted !== 'string' || wanted.length === 0 || wanted.length > MAX) return fallback
  // 必须是本语言下的路径；不许 //（会被当成别的站）、反斜杠、控制字符
  if (!wanted.startsWith(`/${locale}/`)) return fallback
  if (wanted.includes('//') || wanted.includes('\\') || /[\u0000-\u001f\u007f]/.test(wanted)) {
    return fallback
  }
  // 回到登录页自己没有意义
  if (wanted.startsWith(`/${locale}/login`)) return fallback
  return wanted
}

// 去登录，并记下登录完回到哪
export function loginPath(locale: string, next?: string | null) {
  const base = `/${locale}/login`
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}
