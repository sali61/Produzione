@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-manager.ps1" status %*
exit /b %ERRORLEVEL%
