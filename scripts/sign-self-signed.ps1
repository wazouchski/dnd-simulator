param(
  [string]$Subject = "CN=D&D Character Balance Tester Local Code Signing",
  [string]$CertPath = "build\certs\dnd-character-balance-tester-local.cer",
  [switch]$TrustForCurrentUser,
  [string]$TimestampServer = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$certStorePath = "Cert:\CurrentUser\My"
$trustedRootStorePath = "Cert:\CurrentUser\Root"
$now = Get-Date

$cert = Get-ChildItem $certStorePath |
  Where-Object {
    $_.Subject -eq $Subject -and
    $_.HasPrivateKey -and
    $_.NotAfter -gt $now.AddMonths(3) -and
    ($_.EnhancedKeyUsageList | Where-Object { $_.FriendlyName -eq "Code Signing" })
  } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $cert) {
  Write-Host "Creating self-signed code-signing certificate: $Subject"
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $Subject `
    -CertStoreLocation $certStorePath `
    -KeyAlgorithm RSA `
    -KeyLength 3072 `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature `
    -NotAfter $now.AddYears(5)
} else {
  Write-Host "Reusing self-signed code-signing certificate: $($cert.Thumbprint)"
}

$certOutputPath = Join-Path $repoRoot $CertPath
New-Item -ItemType Directory -Force -Path (Split-Path $certOutputPath) | Out-Null
Export-Certificate -Cert $cert -FilePath $certOutputPath -Force | Out-Null
Write-Host "Exported public certificate to $CertPath"

if ($TrustForCurrentUser) {
  $trusted = Get-ChildItem $trustedRootStorePath |
    Where-Object { $_.Thumbprint -eq $cert.Thumbprint } |
    Select-Object -First 1

  if (-not $trusted) {
    Write-Host "Trusting certificate for Current User only."
    Import-Certificate -FilePath $certOutputPath -CertStoreLocation $trustedRootStorePath | Out-Null
  } else {
    Write-Host "Certificate is already trusted for Current User."
  }
} else {
  Write-Host "Certificate was not added to Trusted Root. Use -TrustForCurrentUser to trust it on this Windows account."
}

$filesToSign = @(
  "release\win-unpacked\D&D Character Balance Tester.exe",
  "release\D&D Character Balance Tester-0.1.0-x64-Setup.exe",
  "release\D&D Character Balance Tester-0.1.0-x64-Portable.exe",
  "release-current\D&D Character Balance Tester-0.1.0-x64-Setup.exe"
)

foreach ($relativePath in $filesToSign) {
  $filePath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $filePath)) {
    Write-Warning "Skipping missing file: $relativePath"
    continue
  }

  Write-Host "Signing $relativePath"
  if ($TimestampServer.Trim()) {
    $signature = Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -HashAlgorithm SHA256 -TimestampServer $TimestampServer
  } else {
    $signature = Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -HashAlgorithm SHA256
  }

  $isExpectedUntrustedRoot = $signature.Status -eq "UnknownError" -and $signature.StatusMessage -like "*root certificate*not trusted*"
  if ($signature.Status -ne "Valid" -and -not $isExpectedUntrustedRoot) {
    throw "Signing failed for $relativePath. Status: $($signature.Status). $($signature.StatusMessage)"
  }

  $status = Get-AuthenticodeSignature -FilePath $filePath
  Write-Host "  Status: $($status.Status)"
}

Write-Host "Self-signed signing complete."
