import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { agentDownloadSchema } from '@/contracts/workbench-settings'
import { initCommand } from '@/features/machines/model/onboarding'

describe('agent release contract and commands', () => {
  const release = {
    url: 'https://example.test/fixed/a.zip',
    version: '0.2.0',
    zip_sha256: 'a'.repeat(64),
    manifest_sha256: 'b'.repeat(64),
    codex_version: '0.155.1',
    size_bytes: 1,
  }
  it('accepts unavailable and the complete backend descriptor', () => {
    expect(agentDownloadSchema.parse({ contract_version: 2, download: null }).download).toBeNull()
    expect(agentDownloadSchema.parse({ contract_version: 2, download: release }).download).toEqual(
      release,
    )
  })
  it.each(['full', 'empty', 'offline'])(
    'accepts the real recorded download response: %s',
    (scenario) => {
      const directory = join(process.cwd(), 'preview/fixtures', scenario)
      const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))
      const entry = manifest.responses.find(
        (r: { method: string; path: string }) =>
          r.method === 'GET' && r.path === '/api/workbench/agent/download',
      )
      expect(entry.status).toBe(200)
      const body = agentDownloadSchema.parse(
        JSON.parse(readFileSync(join(directory, entry.file), 'utf8')),
      )
      expect(body.download === null).toBe(scenario === 'empty')
    },
  )
  it('uses the same public contract for a same-origin backend download', () => {
    const download = { ...release, url: 'https://investment.example/api/workbench/agent/package' }
    expect(agentDownloadSchema.parse({ contract_version: 2, download }).download).toEqual(download)
  })
  for (const patch of [
    { url: 'javascript:alert(1)' },
    { url: 'http://x/a' },
    { url: 'https://x/a?token=x' },
    { url: 'https://user:secret@x/a' },
    { size_bytes: 0 },
    { zip_sha256: 'bad' },
    { extra: 'value' },
  ]) {
    it(`rejects an unsafe descriptor ${Object.keys(patch)}`, () => {
      expect(
        agentDownloadSchema.safeParse({ contract_version: 2, download: { ...release, ...patch } })
          .success,
      ).toBe(false)
    })
  }
  it('uses the installed wrapper and hidden prompt; quotes PowerShell values', () => {
    const command = initCommand("wss://example/'quoted'", 'u-fixture')
    expect(command).toContain('--token-prompt')
    expect(command).toContain("--relay 'wss://example/''quoted''' ")
    expect(command).toContain(
      String.raw`$env:LOCALAPPDATA\Programs\sunmoon-agent\sunmoon-agent.cmd`,
    )
  })
})
