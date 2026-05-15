param(
  [string]$CertPath = "build\certs\dnd-character-balance-tester-local.cer"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$certFullPath = Join-Path $repoRoot $CertPath

if (-not (Test-Path $certFullPath)) {
  throw "Certificate file not found: $CertPath. Run npm.cmd run desktop:sign:selfsigned first."
}

$imported = Import-Certificate -FilePath $certFullPath -CertStoreLocation "Cert:\CurrentUser\Root"
Write-Host "Trusted self-signed certificate for Current User:"
Write-Host "  Subject: $($imported.Subject)"
Write-Host "  Thumbprint: $($imported.Thumbprint)"
