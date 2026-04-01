@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-health.ps1" %*
exit /b %ERRORLEVEL%
