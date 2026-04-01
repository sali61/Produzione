@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-manager.ps1" logs %*
exit /b %ERRORLEVEL%
