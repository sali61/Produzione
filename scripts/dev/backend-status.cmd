@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend-manager.ps1" status %*
exit /b %ERRORLEVEL%
