@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OOZY Sales GitHub Pages Deploy

if not exist "index.html" goto :FAILED
where git >nul 2>&1 || goto :NEED_TOOLS
where gh >nul 2>&1 || goto :NEED_TOOLS

gh auth status -h github.com >nul 2>&1
if errorlevel 1 gh auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto :FAILED
gh auth setup-git >nul 2>&1
for /f "delims=" %%A in ('gh api user --jq ".login" 2^>nul') do set "GH_OWNER=%%A"
if not defined GH_OWNER goto :FAILED

set "REPO_NAME=OOZY-Sales"
set /p "REPO_INPUT=Repository name [OOZY-Sales]: "
if defined REPO_INPUT set "REPO_NAME=%REPO_INPUT%"
if not exist ".git" git init
git branch -M main
git config user.name >nul 2>&1 || git config user.name "%GH_OWNER%"
git config user.email >nul 2>&1 || git config user.email "%GH_OWNER%@users.noreply.github.com"
git add .
git diff --cached --quiet || git commit -m "Deploy OOZY Sales Dashboard"
gh repo view "%GH_OWNER%/%REPO_NAME%" >nul 2>&1
if errorlevel 1 (
  gh repo create "%GH_OWNER%/%REPO_NAME%" --public --source=. --remote=origin
) else (
  git remote get-url origin >nul 2>&1
  if errorlevel 1 (git remote add origin "https://github.com/%GH_OWNER%/%REPO_NAME%.git") else (git remote set-url origin "https://github.com/%GH_OWNER%/%REPO_NAME%.git")
)
if errorlevel 1 goto :FAILED
git push -u origin main
if errorlevel 1 goto :FAILED
gh api "repos/%GH_OWNER%/%REPO_NAME%/pages" >nul 2>&1
if errorlevel 1 (gh api --method POST "repos/%GH_OWNER%/%REPO_NAME%/pages" -f build_type=workflow >nul 2>&1) else (gh api --method PUT "repos/%GH_OWNER%/%REPO_NAME%/pages" -f build_type=workflow >nul 2>&1)
timeout /t 2 /nobreak >nul
gh workflow run pages.yml --ref main -R "%GH_OWNER%/%REPO_NAME%" >nul 2>&1
echo Upload complete: https://%GH_OWNER%.github.io/%REPO_NAME%/
start "" "https://github.com/%GH_OWNER%/%REPO_NAME%/actions"
pause
exit /b 0

:NEED_TOOLS
echo Git or GitHub CLI was not found. Run KCEM deploy BAT once or install Git and GitHub CLI.
pause
exit /b 1
:FAILED
echo DEPLOY FAILED
pause
exit /b 1
