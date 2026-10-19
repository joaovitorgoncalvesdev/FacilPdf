$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskUrl = 'https://joaovitorgoncalvesdev.github.io/FacilPdf/'
$taskOrigin = ([Uri]$taskUrl).GetLeftPart([System.UriPartial]::Authority)
$taskNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $taskNode) {
    $taskBundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $taskBundled) { $taskNode = $taskBundled }
}
if (-not $taskNode) { throw 'Instale Node.js 22 LTS ou mais recente e abra novamente.' }
if (-not (Test-Path -LiteralPath 'node_modules')) {
    $taskNpm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $taskNpm) { throw 'Instale Node.js 22 LTS com npm e abra novamente: https://nodejs.org/' }
    if (Test-Path -LiteralPath 'package-lock.json') { & $taskNpm ci } else { & $taskNpm install --omit=dev --ignore-scripts }
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências.' }
}
New-Item -ItemType Directory -Path '.local' -Force | Out-Null
ConvertTo-Json -InputObject @($taskOrigin) | Set-Content -LiteralPath '.local\allowed-origins.json' -Encoding UTF8
$taskConverter = $null
try {
    $taskRunning = $false
    try {
        $taskHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8788/health' -TimeoutSec 2
        if ($taskHealth.app -eq 'facilpdf' -and $taskHealth.ready) { $taskRunning = $true }
    } catch { }
    if (-not $taskRunning) {
        $taskConverter = Start-Process -FilePath $taskNode -ArgumentList @('server/server.mjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
        $taskReady = $false
        for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
            try {
                $taskHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8788/health' -TimeoutSec 2
                if ($taskHealth.app -eq 'facilpdf' -and $taskHealth.ready) { $taskReady = $true; break }
            } catch { }
            if ($taskConverter.HasExited) { break }
            Start-Sleep -Seconds 1
        }
        if (-not $taskReady) { throw 'O conversor não iniciou. Confira se o Word está instalado e se a porta 8788 está livre.' }
    }
    Write-Host 'Word pronto para gerar os PDFs.' -ForegroundColor Green
    Write-Host 'Mantenha esta janela aberta. Se o navegador pedir acesso à rede local ao gerar PDF, permita para este site.'
    Start-Process $taskUrl
    Read-Host 'Pressione Enter para encerrar o conversor iniciado nesta janela'
} finally {
    if ($taskConverter -and -not $taskConverter.HasExited) { Stop-Process -Id $taskConverter.Id -ErrorAction SilentlyContinue }
}
