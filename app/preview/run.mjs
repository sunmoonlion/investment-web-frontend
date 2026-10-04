// 起预览：一条命令。
//   pnpm preview            开发模式（改了页面马上看到）
//   pnpm preview --built    用构建好的那一份（先 pnpm build）
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { previewConfig } from './preview.config.mjs'
import { createPreviewServer, fixturesRootOf } from './server.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '..')
const built = process.argv.includes('--built')
const origin = `http://localhost:${previewConfig.port}`

const env = {
  ...process.env,
  NODE_ENV: built ? 'production' : 'development',
  DEPLOYMENT_ENV: 'development',
  AUTH_APP: previewConfig.app,
  APP_ORIGIN: origin,
  BACKEND_INTERNAL_URL: `http://127.0.0.1:${previewConfig.port}`,
  DEPLOYMENT_ID: 'preview',
  NEXT_PUBLIC_APP_NAME: previewConfig.app,
  NEXT_PUBLIC_API_URL: '/api',
  HOSTNAME: '127.0.0.1',
  PORT: String(previewConfig.nextPort),
}

const next = spawn(
  'pnpm',
  [
    'exec',
    'next',
    built ? 'start' : 'dev',
    '--port',
    String(previewConfig.nextPort),
    '--hostname',
    '127.0.0.1',
  ],
  { cwd: appRoot, env, stdio: 'inherit' },
)

const server = createPreviewServer({
  config: previewConfig,
  fixturesRoot: fixturesRootOf(here),
  log: (line) => process.stdout.write(`[预览] ${line}\n`),
})

server.listen(previewConfig.port, '127.0.0.1', () => {
  process.stdout.write(
    `[预览] ${previewConfig.app}：${origin}/__preview\n[预览] 数据都是样例；没有连后端\n`,
  )
})

function stop() {
  server.close()
  next.kill('SIGTERM')
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop)
next.on('exit', (code) => {
  server.close()
  process.exit(code ?? 0)
})
