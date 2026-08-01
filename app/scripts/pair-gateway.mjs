import { createServer, request as proxyRequest } from 'node:http'

const host = '127.0.0.1'
const port = Number(process.env.PAIR_GATEWAY_PORT ?? 3009)
const nextPort = Number(process.env.NEXT_UPSTREAM_PORT ?? 3008)
const backendPort = Number(process.env.PAIR_FIXTURE_PORT ?? 18080)

const server = createServer((request, response) => {
  if (request.url === '/__gateway_health') {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('ok')
    return
  }

  const backendRequest = request.url?.startsWith('/api/') ?? false
  const upstreamPort = backendRequest ? backendPort : nextPort
  const upstream = proxyRequest(
    {
      hostname: host,
      port: upstreamPort,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: request.headers.host,
        'x-forwarded-host': request.headers.host ?? '',
        'x-forwarded-proto': 'http',
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    },
  )
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' })
    response.end('upstream unavailable')
  })
  request.pipe(upstream)
})

server.listen(port, host, () => {
  process.stdout.write(`pair gateway listening on http://${host}:${port}\n`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
