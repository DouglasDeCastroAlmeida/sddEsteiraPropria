<#
.SYNOPSIS
    Dispara e gerencia o Runner Autônomo SDD 24/7 na VPS Hostinger via SSH.

.DESCRIPTION
    Conecta remotamente na VPS Hostinger e controla o ciclo de vida da sessão tmux
    do runner autônomo. Todas as credenciais são lidas do arquivo .env local.

.PARAMETER Action
    Ação desejada: start, stop, status, attach ou logs (Padrão: status).

.PARAMETER Project
    Nome da pasta do projeto em /opt/ (ex: botImobiliario). Se omitido, usa o nome do diretório atual.

.EXAMPLE
    .\scripts\sdd_runner.ps1 -Action start
    .\scripts\sdd_runner.ps1 -Action status
    .\scripts\sdd_runner.ps1 -Action stop
#>

param (
    [ValidateSet("start", "stop", "status", "attach", "logs")]
    [string]$Action = "status",

    [string]$Project = ""
)

$RootDir = Split-Path -Parent $PSScriptRoot
if (-not $Project) {
    $Project = Split-Path -Leaf $RootDir
}

# 1. Carrega variáveis do arquivo .env se existir
$EnvFile = Join-Path $RootDir ".env"
$SshHost = $env:HOSTINGER_SSH_HOST
$SshUser = $env:HOSTINGER_SSH_USER
$SshPort = $env:HOSTINGER_SSH_PORT
$BaseDir = $env:HOSTINGER_PROJECT_BASE_DIR

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            if ($key -eq "HOSTINGER_SSH_HOST" -and -not $SshHost) { $SshHost = $val }
            if ($key -eq "HOSTINGER_SSH_USER" -and -not $SshUser) { $SshUser = $val }
            if ($key -eq "HOSTINGER_SSH_PORT" -and -not $SshPort) { $SshPort = $val }
            if ($key -eq "HOSTINGER_PROJECT_BASE_DIR" -and -not $BaseDir) { $BaseDir = $val }
        }
    }
}

# Fallbacks padrão se não definidos no .env
if (-not $SshHost) {
    Write-Error "❌ HOSTINGER_SSH_HOST não configurado no .env ou via parâmetro -SshHost."
    exit 1
}
if (-not $SshUser) { $SshUser = "root" }
if (-not $SshPort) { $SshPort = "22" }
if (-not $BaseDir) { $BaseDir = "/opt" }

$RemoteProjectPath = "$BaseDir/$Project"
Write-Host "🌐 Conectando à Hostinger VPS: $SshUser@$SshHost (Porta: $SshPort)..." -ForegroundColor Cyan
Write-Host "📂 Projeto Alvo: $RemoteProjectPath | Ação: $Action" -ForegroundColor Yellow

if ($Action -eq "attach") {
    # No attach, abre o terminal SSH interativo direto no tmux
    ssh -t -p $SshPort -o StrictHostKeyChecking=no "$SshUser@$SshHost" "cd '$RemoteProjectPath' && bash scripts/sdd_runner.sh attach"
} else {
    $RemoteCommand = "cd '$RemoteProjectPath' && bash scripts/sdd_runner.sh $Action"
    ssh -p $SshPort -o StrictHostKeyChecking=no "$SshUser@$SshHost" $RemoteCommand
}
