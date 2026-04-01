@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0frontend-manager.ps1" logs %*
exit /b %ERRORLEVEL%
