@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0frontend-manager.ps1" restart %*
exit /b %ERRORLEVEL%
