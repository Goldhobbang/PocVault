param(
  [Parameter(Mandatory = $true)]
  [string]$ApiKey,
  [string]$BaseUrl = "https://panel.tapie.kr/api/claude-code"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host "[TAPIE] $msg"
}

Write-Step "Checking Claude Code..."
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm not found. Please install Node.js first: https://nodejs.org/"
  }
  Write-Step "Claude Code not found. Installing with npm..."
  npm install -g @anthropic-ai/claude-code
} else {
  Write-Step "Claude Code already installed."
}

Write-Step "Configuring environment variables in ~/.claude/settings.json..."
$settingsDir = Join-Path $env:USERPROFILE ".claude"
$settingsFile = Join-Path $settingsDir "settings.json"

if (-not (Test-Path $settingsDir)) {
  New-Item -ItemType Directory -Path $settingsDir | Out-Null
}

$data = @{}
if (Test-Path $settingsFile) {
  try {
    $content = Get-Content -Path $settingsFile -Raw
    $data = $content | ConvertFrom-Json -AsHashtable
  } catch {
    $data = @{}
  }
}

if (-not $data.ContainsKey("env")) {
  $data["env"] = @{}
}

$data["env"]["ANTHROPIC_BASE_URL"] = $BaseUrl
$data["env"]["ANTHROPIC_AUTH_TOKEN"] = $ApiKey

$data | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsFile

Write-Step "Done. Claude Code configuration updated."
Write-Step "Run: claude"