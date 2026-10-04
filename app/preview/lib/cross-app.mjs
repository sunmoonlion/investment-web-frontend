// 预览里的跨应用跳转：和后端 app/domain/cross_app.py 同一套规则。
// 这两条和 contracts/cross-app.ts 里的逐字相同；有测试核对
export const crossAppNamePattern = /^[a-z][a-z0-9-]{0,31}$/
export const crossAppRefPattern = /^[A-Za-z0-9._:-]{1,128}$/

export function linksAnswer(config) {
  const targets = {}
  for (const name of config.targets) {
    if (config.apps[name]) targets[name] = { web_base_url: config.apps[name] }
  }
  return { app: config.app, targets }
}

export function originAnswer(config, search) {
  const params = new URLSearchParams(search ?? '')
  const from = params.get('from')
  if (from === null || !crossAppNamePattern.test(from)) return null
  if (!Object.hasOwn(config.sources, from)) return null
  const given = params.get('ref')
  const ref = given !== null && crossAppRefPattern.test(given) ? given : null
  const template = config.sources[from]?.return_url ?? null
  return {
    app: from,
    ref,
    return_url: template === null ? null : template.replace('{ref}', encodeURIComponent(ref ?? '')),
  }
}
