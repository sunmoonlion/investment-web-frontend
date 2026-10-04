// 预览的目录页：有哪些情景，每个情景里有哪些页面。点一下就切到那个情景并打开那一页。
function escape(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}

export function indexPage({ config, scenarios, current, signedIn, missing }) {
  // 默认的情景排最前面
  const listed = [...scenarios.values()].sort(
    (a, b) =>
      Number(b.id === config.defaultScenario) - Number(a.id === config.defaultScenario) ||
      a.id.localeCompare(b.id),
  )
  const blocks = listed.map((scenario) => {
    const pages = scenario.pages.length
      ? scenario.pages
          .map(
            (page) =>
              `<li><a href="/__preview/use/${escape(scenario.id)}?to=${encodeURIComponent(page.path)}">${escape(page.title)}</a> <code>${escape(page.path)}</code></li>`,
          )
          .join('')
      : '<li class="muted">这个情景没有登记页面</li>'
    const mark = scenario.id === current ? ' <span class="now">正在用</span>' : ''
    return `<section><h2>${escape(scenario.title)}${mark}</h2><p>${escape(scenario.description)}</p><p class="muted">${scenario.responses.length} 个接口的样例，${scenario.streams.length} 条事件流</p><ul>${pages}</ul></section>`
  })
  const gaps = missing.length
    ? `<section><h2>没有样例的请求</h2><p class="muted">页面要了、样例里没有的。最近 ${missing.length} 条：</p><ul>${missing
        .map((m) => `<li><code>${escape(m)}</code></li>`)
        .join('')}</ul></section>`
    : ''
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>预览 · ${escape(config.app)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font:15px/1.6 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 20px;color:#1c1c1c}
h1{font-size:22px} h2{font-size:17px;margin:0 0 4px} section{border:1px solid #ddd;border-radius:10px;padding:14px 18px;margin:14px 0}
code{background:#f3f3f3;border-radius:4px;padding:1px 5px;font-size:13px} .muted{color:#777} .now{font-size:12px;background:#0a7;color:#fff;border-radius:10px;padding:1px 8px;margin-left:6px}
.bar{background:#fff7d6;border:1px solid #e6d27a;border-radius:10px;padding:10px 14px}
</style></head><body>
<h1>预览：${escape(config.app)}</h1>
<p class="bar">这里的数据都是样例，不是真实数据。没有连后端，没有连集群；登录、权限、实时推送、沙箱都是替身。</p>
<p>现在${signedIn ? '已登录' : '没有登录'}。
<a href="/__preview/sign/${signedIn ? 'out' : 'in'}">${signedIn ? '看看没登录的样子' : '登录'}</a></p>
${blocks.join('\n') || '<p class="muted">还没有任何情景。</p>'}
${gaps}
</body></html>`
}
