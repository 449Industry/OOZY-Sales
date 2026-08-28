$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$logPath = Join-Path $PSScriptRoot 'github_deploy.log'
$repoOwner = '449Industry'
$repoName = 'OOZY-Sales'
$repoFull = "$repoOwner/$repoName"

function Write-Log([string]$Text) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$stamp $Text" | Out-File -LiteralPath $logPath -Append -Encoding utf8
}

function Run-External {
    param(
        [Parameter(Mandatory=$true)][string]$File,
        [Parameter(Mandatory=$false)][string[]]$Arguments = @(),
        [switch]$AllowFailure
    )
    Write-Host "> $File $($Arguments -join ' ')"
    & $File @Arguments
    $code = $LASTEXITCODE
    if (($code -ne 0) -and (-not $AllowFailure)) {
        throw "$File failed with exit code $code"
    }
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user = [Environment]::GetEnvironmentVariable('Path','User')
    $env:Path = "$machine;$user;$env:Path"
    $extra = @(
        'C:\Program Files\Git\cmd',
        'C:\Program Files\Git\bin',
        'C:\Program Files\GitHub CLI'
    )
    foreach ($p in $extra) {
        if ((Test-Path -LiteralPath $p) -and ($env:Path -notlike "*$p*")) {
            $env:Path += ";$p"
        }
    }
}

function Ensure-Command {
    param(
        [Parameter(Mandatory=$true)][string]$Command,
        [Parameter(Mandatory=$true)][string]$WingetId,
        [Parameter(Mandatory=$true)][string]$DisplayName
    )
    Refresh-Path
    if (Get-Command $Command -ErrorAction SilentlyContinue) { return }

    Write-Host "[INFO] $DisplayName is missing. Trying winget install..."
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "$DisplayName is missing and winget.exe is not available. Install $DisplayName manually and run again."
    }

    Run-External -File 'winget.exe' -Arguments @('install','--id',$WingetId,'-e','--accept-source-agreements','--accept-package-agreements')
    Refresh-Path
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "$DisplayName was installed but $Command is not available yet. Close this window and run again."
    }
}

function Copy-CanonicalWeb([string]$Destination) {
    $files = @(
        'index.html',
        'app.js',
        'styles.css',
        'config.js',
        'login_aliases.js',
        'README_KO.txt',
        'DEPLOY_README.txt',
        'VERSION.txt',
        'RUN_LOCAL.bat',
        'GITHUB_DEPLOY.bat',
        'GITHUB_DEPLOY.ps1',
        'GITHUB_DEPLOY_OOZY.bat',
        '00_DEPLOY_OOZY_SALES.bat'
    )
    foreach ($name in $files) {
        $src = Join-Path $PSScriptRoot $name
        if (Test-Path -LiteralPath $src) {
            Copy-Item -LiteralPath $src -Destination (Join-Path $Destination $name) -Force
        }
    }

    $githubSrc = Join-Path $PSScriptRoot '.github'
    if (Test-Path -LiteralPath $githubSrc) {
        Copy-Item -LiteralPath $githubSrc -Destination $Destination -Recurse -Force
    }

    $supabaseSrc = Join-Path $PSScriptRoot 'supabase'
    if (Test-Path -LiteralPath $supabaseSrc) {
        Copy-Item -LiteralPath $supabaseSrc -Destination $Destination -Recurse -Force
    }
}

try {
    Set-Content -LiteralPath $logPath -Value "OOZY Sales GitHub Pages Deploy v1.0.7`r`nStarted: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`nFolder: $PSScriptRoot`r`nRepository: $repoFull" -Encoding UTF8

    Write-Host '============================================================'
    Write-Host ' OOZY Sales - GitHub Pages Deploy v1.0.7'
    Write-Host '============================================================'
    Write-Host "Local folder : $PSScriptRoot"
    Write-Host "Repository   : https://github.com/$repoFull"
    Write-Host "Expected web : https://449industry.github.io/OOZY-Sales/"
    Write-Host "Log          : $logPath"
    Write-Host ''

    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'index.html'))) {
        throw 'index.html was not found. Run this script from C:\449INDUSTRIES\oozySales\v1\web.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot '.github\workflows\pages.yml'))) {
        throw '.github\workflows\pages.yml was not found. Apply the v1.0.7 web update first.'
    }

    Write-Host '[1/8] Checking Git...'
    Ensure-Command -Command 'git.exe' -WingetId 'Git.Git' -DisplayName 'Git for Windows'
    Run-External -File 'git.exe' -Arguments @('--version')

    Write-Host ''
    Write-Host '[2/8] Checking GitHub CLI...'
    Ensure-Command -Command 'gh.exe' -WingetId 'GitHub.cli' -DisplayName 'GitHub CLI'
    Run-External -File 'gh.exe' -Arguments @('--version')

    Write-Host ''
    Write-Host '[3/8] Checking GitHub login...'
    & gh.exe auth status -h github.com *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[INFO] Browser login will open. Complete GitHub login and return here.'
        Run-External -File 'gh.exe' -Arguments @('auth','login','--hostname','github.com','--git-protocol','https','--web')
    }
    Run-External -File 'gh.exe' -Arguments @('auth','setup-git')
    $login = (& gh.exe api user --jq '.login').Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($login)) {
        throw 'Could not read the GitHub login after authentication.'
    }
    Write-Host "Signed in as: $login"
    if ($login.ToLowerInvariant() -ne $repoOwner.ToLowerInvariant()) {
        Write-Host "[WARN] Signed-in account is '$login', but target repository owner is '$repoOwner'."
        Write-Host '[WARN] The signed-in account must have push/admin permission on the target repository.'
    }

    Write-Host ''
    Write-Host '[4/8] Checking target repository...'
    & gh.exe repo view $repoFull *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Repository $repoFull was not found or the current account cannot access it."
    }
    Write-Host "[OK] Repository found: $repoFull"

    Write-Host ''
    Write-Host '[5/8] Preparing clean deployment clone...'
    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('OOZY_Sales_Deploy_' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempRoot | Out-Null
    $cloneDir = Join-Path $tempRoot 'repo'
    Run-External -File 'git.exe' -Arguments @('clone',"https://github.com/$repoFull.git",$cloneDir)

    Get-ChildItem -LiteralPath $cloneDir -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
    Copy-CanonicalWeb -Destination $cloneDir

    if (-not (Test-Path -LiteralPath (Join-Path $cloneDir '.github\workflows\pages.yml'))) {
        throw 'pages.yml was not copied into the clean deployment clone.'
    }

    Push-Location $cloneDir
    try {
        Run-External -File 'git.exe' -Arguments @('config','user.name',$login)
        & git.exe config user.email *> $null
        if ($LASTEXITCODE -ne 0) {
            Run-External -File 'git.exe' -Arguments @('config','user.email',"$login@users.noreply.github.com")
        }
        Run-External -File 'git.exe' -Arguments @('add','--all')
        & git.exe diff --cached --quiet
        if ($LASTEXITCODE -ne 0) {
            Run-External -File 'git.exe' -Arguments @('commit','-m','Deploy OOZY integrated admin web v1.0.7')
            Run-External -File 'git.exe' -Arguments @('push','origin','main')
        } else {
            Write-Host '[INFO] Repository already matches v1.0.7 deployment files.'
        }
    }
    finally {
        Pop-Location
    }

    Write-Host ''
    Write-Host '[6/8] Enabling GitHub Pages with GitHub Actions...'
    & gh.exe api "repos/$repoFull/pages" *> $null
    if ($LASTEXITCODE -ne 0) {
        & gh.exe api --method POST "repos/$repoFull/pages" -f build_type=workflow
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not enable GitHub Pages automatically. Open repository Settings > Pages and choose GitHub Actions.'
        }
        Write-Host '[OK] GitHub Pages enabled.'
    } else {
        $buildType = (& gh.exe api "repos/$repoFull/pages" --jq '.build_type' 2>> $logPath).Trim()
        if ($buildType -ne 'workflow') {
            Write-Host "[INFO] Current Pages build type is '$buildType'. Switching to workflow..."
            & gh.exe api --method PUT "repos/$repoFull/pages" -f build_type=workflow *> $null
            if ($LASTEXITCODE -ne 0) {
                Write-Host '[WARN] Could not switch Pages build type automatically.'
                Write-Host '[WARN] Open Settings > Pages and choose GitHub Actions.'
            }
        } else {
            Write-Host '[INFO] GitHub Pages is already configured for GitHub Actions.'
        }
    }

    Write-Host ''
    Write-Host '[7/8] Waiting for Pages workflow...'
    $runId = $null
    for ($i = 0; $i -lt 12; $i++) {
        $json = (& gh.exe run list --repo $repoFull --workflow pages.yml --limit 1 --json databaseId,status,conclusion,url 2>> $logPath)
        if ($LASTEXITCODE -eq 0 -and $json) {
            try {
                $runs = $json | ConvertFrom-Json
                if ($runs.Count -gt 0) {
                    $runId = $runs[0].databaseId
                    Write-Host "Workflow: $($runs[0].url)"
                    break
                }
            } catch {}
        }
        Start-Sleep -Seconds 2
    }

    if ($runId) {
        & gh.exe run watch $runId --repo $repoFull --exit-status
        if ($LASTEXITCODE -ne 0) {
            throw 'GitHub Pages workflow failed. Open the Actions URL shown above.'
        }
        Write-Host '[OK] GitHub Pages workflow completed.'
    } else {
        Write-Host '[WARN] Workflow run was not visible yet. The push succeeded, so GitHub may still be starting it.'
    }

    Write-Host ''
    Write-Host '[8/8] Reading final Pages URL...'
    $pageUrl = (& gh.exe api "repos/$repoFull/pages" --jq '.html_url' 2>> $logPath)
    if ($LASTEXITCODE -eq 0 -and $pageUrl) {
        $pageUrl = $pageUrl.Trim()
    } else {
        $pageUrl = 'https://449industry.github.io/OOZY-Sales/'
    }

    Write-Host ''
    Write-Host '============================================================'
    Write-Host '[OK] Deployment completed.'
    Write-Host "Repository: https://github.com/$repoFull"
    Write-Host "Web page  : $pageUrl"
    Write-Host 'If a previous 404 page is cached, press Ctrl+F5 once.'
    Write-Host '============================================================'
    Write-Log "SUCCESS repository=$repoFull page=$pageUrl"

    try { Start-Process $pageUrl } catch {}
    try { Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    exit 0
}
catch {
    $message = $_.Exception.Message
    Write-Host ''
    Write-Host '============================================================'
    Write-Host "[ERROR] $message"
    Write-Host "Log: $logPath"
    Write-Host '============================================================'
    try { Write-Log "ERROR $message" } catch {}
    exit 1
}
