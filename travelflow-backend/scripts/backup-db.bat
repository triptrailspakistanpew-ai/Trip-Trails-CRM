@echo off
REM TravelFlow Database Backup Script (Windows)
REM Usage: backup-db.bat [backup_name]

setlocal

set DB_USER=tfuser
set DB_NAME=tf_db
set BACKUP_DIR=%~dp0..\backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_NAME=%1
if "%BACKUP_NAME%"=="" set BACKUP_NAME=manual

REM Use PowerShell to generate timestamp
for /f %%I in ('powershell -command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set TIMESTAMP=%%I

set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_%BACKUP_NAME%_%TIMESTAMP%.sql

echo Backing up %DB_NAME%...
docker exec postgres pg_dump -U %DB_USER% -d %DB_NAME% --no-owner --no-privileges > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    for %%F in ("%BACKUP_FILE%") do echo Backup successful: %%~zF bytes
) else (
    echo ERROR: Backup failed!
    if exist "%BACKUP_FILE%" del "%BACKUP_FILE%"
    exit /b 1
)

REM Clean up old backups (keep last 10)
cd /d "%BACKUP_DIR%"
set COUNT=0
for /f "tokens=*" %%F in ('dir /b /o-d %DB_NAME%_*.sql 2^>nul') do (
    set /a COUNT+=1
    if !COUNT! GTR 10 (
        echo   Deleting old: %%F
        del "%%F"
    )
)

echo Done.
