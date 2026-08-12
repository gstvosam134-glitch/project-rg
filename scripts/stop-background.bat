@echo off
setlocal

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "PID_FILE=%ROOT%\app.pid"

if not exist "%PID_FILE%" (
  echo No PID file found.
  exit /b 0
)

set /p APP_PID=<"%PID_FILE%"
if not defined APP_PID (
  del /f /q "%PID_FILE%" >nul 2>nul
  echo PID file was empty.
  exit /b 0
)

tasklist /FI "PID eq %APP_PID%" | findstr /R /C:"^[a-zA-Z].* %APP_PID% " >nul 2>nul
if errorlevel 1 (
  echo Process %APP_PID% is not running.
) else (
  taskkill /PID %APP_PID% /F >nul
  echo Stopped application with PID %APP_PID%
)

del /f /q "%PID_FILE%" >nul 2>nul
