import type { AgentDownload } from '@/contracts/workbench-settings'

// Only validated backend fields reach these commands. Quote even those fields;
// the credential is entered later in the native terminal and never interpolated.
const ps = (value: string) => `'${value.replaceAll("'", "''")}'`

export function initCommand(relay: string, user: string) {
  return String.raw`& "$env:LOCALAPPDATA\Programs\sunmoon-agent\sunmoon-agent.cmd" init --relay ${ps(relay)} --user ${ps(user)} --token-prompt`
}

export const startCommands = String.raw`& "$env:LOCALAPPDATA\Programs\sunmoon-agent\sunmoon-agent.cmd" tray
& "$env:LOCALAPPDATA\Programs\sunmoon-agent\sunmoon-agent.cmd" start --background`

export function installCommands(release: AgentDownload) {
  return String.raw`$ErrorActionPreference = 'Stop'
$Zip = Join-Path $HOME 'Downloads\windows-x64.zip'
if ((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne ${ps(release.zip_sha256)}) { throw 'ZIP SHA256 mismatch' }
$Package = Join-Path $HOME ${ps(`Downloads/sunmoon-agent-${release.version}`)}
if (Test-Path -LiteralPath $Package) { throw 'Destination exists; choose an empty directory' }
Expand-Archive -LiteralPath $Zip -DestinationPath $Package
if ((Get-FileHash -LiteralPath (Join-Path $Package 'bundle-manifest.json') -Algorithm SHA256).Hash.ToLowerInvariant() -ne ${ps(release.manifest_sha256)}) { throw 'Manifest SHA256 mismatch' }
& (Join-Path $Package 'install.cmd') --manifest-sha256 ${ps(release.manifest_sha256)}
if ($LASTEXITCODE -ne 0) { throw 'Install preview failed' }
& (Join-Path $Package 'install.cmd') --manifest-sha256 ${ps(release.manifest_sha256)} --apply
if ($LASTEXITCODE -ne 0) { throw 'Install failed' }`
}
