@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OOZY Sales GitHub Pages Deploy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0GITHUB_DEPLOY.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo [OK] Deployment script finished.
) else (
  echo [ERROR] Deployment failed. Exit code: %RC%
  echo Check github_deploy.log in this folder.
)
echo.
pause
exit /b %RC%
