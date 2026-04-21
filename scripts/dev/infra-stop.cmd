@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra-manager.ps1" stop %*
exit /b %ERRORLEVEL%

