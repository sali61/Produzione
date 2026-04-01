@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend-manager.ps1" logs %*
exit /b %ERRORLEVEL%
