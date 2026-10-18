$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Instale o Node.js 22 LTS ou mais recente e execute novamente.' }
if (-not (Test-Path -LiteralPath 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências.' }
}
if (-not (Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
if (-not (Test-Path -LiteralPath 'public\ocr\v3\por.traineddata.gz')) { & node.exe scripts/prepare-ocr.mjs }
$taskProcesses = @()
try {
    foreach ($taskPort in @(8788, 5174)) {
        if (Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue) {
            throw "A porta $taskPort já está em uso. Se o FácilPDF já estiver aberto, acesse http://127.0.0.1:5174."
        }
    }
    $taskProcesses += Start-Process -FilePath 'node.exe' -ArgumentList @('server/server.mjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    $taskProcesses += Start-Process -FilePath 'node.exe' -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        try {
            $taskPage = Invoke-WebRequest -Uri 'http://127.0.0.1:5174' -TimeoutSec 2 -UseBasicParsing
            if ($taskPage.StatusCode -eq 200) { $taskReady = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $taskReady) { throw 'Não foi possível iniciar o site. Veja README.md.' }
    Write-Host 'FácilPDF pronto em http://127.0.0.1:5174' -ForegroundColor Green
    Write-Host 'Mantenha esta janela aberta durante o uso.'
    Start-Process 'http://127.0.0.1:5174'
    Read-Host 'Pressione Enter para encerrar o site e o conversor'
} finally {
    foreach ($taskProcess in $taskProcesses) {
        Stop-Process -Id $taskProcess.Id -ErrorAction SilentlyContinue
    }
}
