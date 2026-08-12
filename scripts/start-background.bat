@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "PID_FILE=%ROOT%\app.pid"
set "LOG_DIR=%ROOT%\logs"
set "OUT_LOG=%LOG_DIR%\app.out.log"
set "ERR_LOG=%LOG_DIR%\app.err.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if exist "%PID_FILE%" (
  set /p EXISTING_PID=<"%PID_FILE%"
  if defined EXISTING_PID (
    tasklist /FI "PID eq !EXISTING_PID!" | findstr /R /C:"^[a-zA-Z].* !EXISTING_PID! " >nul 2>nul
    if not errorlevel 1 (
      echo Application is already running with PID !EXISTING_PID!
      exit /b 0
    )
  )
)

set "COMMAND=cmd /c cd /d ""%ROOT%"" ^&^& node src/server.js ^>^> ""%OUT_LOG%"" 2^>^> ""%ERR_LOG%"""
for /f "tokens=2 delims==; " %%P in ('wmic process call create "%COMMAND%" ^| find "ProcessId"') do set "APP_PID=%%P"

if not defined APP_PID (
  echo Failed to start application.
  exit /b 1
)

echo %APP_PID%>"%PID_FILE%"
echo Started application with PID %APP_PID%
