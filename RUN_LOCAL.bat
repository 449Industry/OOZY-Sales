@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OOZY Admin Web - Local Server
where py >nul 2>&1
if not errorlevel 1 (
  py -m http.server 8765
  goto :end
)
where python >nul 2>&1
if not errorlevel 1 (
  python -m http.server 8765
  goto :end
)
echo [ERROR] Python was not found.
echo Install Python or use GitHub Pages deployment.
:end
echo.
pause
