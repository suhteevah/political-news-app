# =============================================================================
# Automated Supabase Setup for The Right Wire (Windows PowerShell)
# =============================================================================
# Usage:
#   1. Create a free Supabase account at https://supabase.com/dashboard
#   2. Go to https://supabase.com/dashboard/account/tokens
#   3. Click "Generate New Token", name it "the-right-wire", copy the token
#   4. Run: powershell -ExecutionPolicy Bypass -File scripts\setup-supabase.ps1 -Token YOUR_TOKEN
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $ProjectDir "apps\web\.env.local"
$ProjectName = "the-right-wire"
$Region = "us-east-1"

# Generate random passwords
$DbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_})
$CronSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host ""
Write-Host "=== The Right Wire - Supabase Setup ===" -ForegroundColor Blue
Write-Host ""

# Get token
if (-not $Token) {
    $Token = $env:SUPABASE_ACCESS_TOKEN
}
if (-not $Token) {
    Write-Host "Error: No access token provided." -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your token:"
    Write-Host "  1. Sign up/in at https://supabase.com/dashboard"
    Write-Host "  2. Go to https://supabase.com/dashboard/account/tokens"
    Write-Host "  3. Generate a new token"
    Write-Host ""
    Write-Host "Usage: .\scripts\setup-supabase.ps1 -Token YOUR_TOKEN"
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $Token

# Test auth
Write-Host "[1/5] Checking authentication..." -ForegroundColor Green
try {
    $null = npx supabase projects list 2>&1
    Write-Host "  ✓ Authenticated successfully" -ForegroundColor Green
} catch {
    Write-Host "  Error: Invalid token." -ForegroundColor Red
    exit 1
}

# Get org ID
Write-Host "[2/5] Creating project '$ProjectName'..." -ForegroundColor Green
$orgsRaw = npx supabase orgs list 2>&1 | Out-String
$orgLines = $orgsRaw -split "`n" | Where-Object { $_ -match '^\s*\S' } | Select-Object -Skip 1
$OrgId = ($orgLines | Select-Object -First 1) -replace '\s.*',''

if (-not $OrgId) {
    Write-Host "  Error: No organization found." -ForegroundColor Red
    Write-Host "  Please create one at https://supabase.com/dashboard"
    exit 1
}
Write-Host "  Using org: $OrgId"

# Check if project exists
$existingProjects = npx supabase projects list 2>&1 | Out-String
if ($existingProjects -match $ProjectName) {
    Write-Host "  ! Project already exists, using existing" -ForegroundColor Yellow
    $ProjectRef = ($existingProjects -split "`n" | Where-Object { $_ -match $ProjectName } | Select-Object -First 1) -replace '\s.*',''
} else {
    $createOutput = npx supabase projects create $ProjectName --region $Region --db-password $DbPassword --org-id $OrgId 2>&1 | Out-String
    Write-Host $createOutput
    Start-Sleep -Seconds 5
    $projectsList = npx supabase projects list 2>&1 | Out-String
    $ProjectRef = ($projectsList -split "`n" | Where-Object { $_ -match $ProjectName } | Select-Object -First 1) -replace '\s.*',''
}

if (-not $ProjectRef) {
    Write-Host "Error: Could not determine project reference." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Project ref: $ProjectRef" -ForegroundColor Green

# Wait for provisioning
Write-Host "[3/5] Waiting for project to provision (~2 minutes)..." -ForegroundColor Green
for ($i = 1; $i -le 30; $i++) {
    $statusLine = npx supabase projects list 2>&1 | Out-String
    if ($statusLine -match "ACTIVE_HEALTHY|ACTIVE.*$ProjectRef") {
        Write-Host "  ✓ Project is ready!" -ForegroundColor Green
        break
    }
    Write-Host "  Waiting... ($i/30)"
    Start-Sleep -Seconds 10
}

# Get API keys
Write-Host "[4/5] Fetching API credentials..." -ForegroundColor Green
$apiKeysRaw = npx supabase projects api-keys --project-ref $ProjectRef 2>&1 | Out-String
$lines = $apiKeysRaw -split "`n"

$AnonKey = ""
$ServiceKey = ""
foreach ($line in $lines) {
    if ($line -match "anon") {
        $AnonKey = ($line -split '\s+' | Select-Object -Last 1).Trim()
    }
    if ($line -match "service_role") {
        $ServiceKey = ($line -split '\s+' | Select-Object -Last 1).Trim()
    }
}

$ProjectUrl = "https://${ProjectRef}.supabase.co"

if (-not $AnonKey -or -not $ServiceKey) {
    Write-Host "Error: Could not retrieve API keys." -ForegroundColor Red
    Write-Host "Get them manually: https://supabase.com/dashboard/project/${ProjectRef}/settings/api"
    exit 1
}
Write-Host "  ✓ Got API keys" -ForegroundColor Green

# Run migration
Write-Host "[5/5] Linking project and pushing migration..." -ForegroundColor Green
try {
    npx supabase link --project-ref $ProjectRef 2>&1 | Out-Null
    npx supabase db push 2>&1
    Write-Host "  ✓ Migration complete" -ForegroundColor Green
} catch {
    Write-Host "  ! Could not push migration via CLI" -ForegroundColor Yellow
    Write-Host "  Go to: https://supabase.com/dashboard/project/${ProjectRef}/sql/new"
    Write-Host "  Paste contents of: supabase\migrations\001_initial_schema.sql"
}

# Write .env.local
Write-Host ""
Write-Host "Writing .env.local..." -ForegroundColor Blue
$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=${ProjectUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${AnonKey}
SUPABASE_SERVICE_ROLE_KEY=${ServiceKey}
CRON_SECRET=${CronSecret}
# SearXNG instance URL (leave empty to skip SearXNG and use Nitter RSS only)
SEARXNG_URL=
# Nitter instance for RSS fallback
NITTER_INSTANCE_URL=https://xcancel.com
"@
Set-Content -Path $EnvFile -Value $envContent
Write-Host "  ✓ Written to $EnvFile" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Project URL:    $ProjectUrl"
Write-Host "  Dashboard:      https://supabase.com/dashboard/project/${ProjectRef}"
Write-Host "  CRON_SECRET:    $($CronSecret.Substring(0,10))..."
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. cd `"$ProjectDir`""
Write-Host "    2. npm run dev:web"
Write-Host "    3. Open http://localhost:3000"
Write-Host "    4. Go to http://localhost:3000/admin to add X sources"
Write-Host "    5. Test scraper:"
Write-Host "       curl -H `"Authorization: Bearer $CronSecret`" http://localhost:3000/api/cron/fetch-posts"
Write-Host ""
