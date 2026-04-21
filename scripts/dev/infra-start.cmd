@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra-manager.ps1" start %*
exit /b %ERRORLEVEL%

