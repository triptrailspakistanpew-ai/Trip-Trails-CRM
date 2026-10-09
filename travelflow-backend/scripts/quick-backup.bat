@echo off
REM TravelFlow Quick Backup (for dev - structure + seed data only)
REM Usage: quick-backup.bat

setlocal

set DB_HOST=localhost
set DB_PORT=5433
set DB_USER=tfuser
set DB_NAME=tf_db
set BACKUP_DIR=%~dp0..\backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set TIMESTAMP=%DATE:~-4%%DATE:~4,2%%DATE:~7,2%
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_quick_%TIMESTAMP%.sql

echo Creating quick backup (structure only)...

docker exec postgres pg_dump -U %DB_USER% -d %DB_NAME% --schema-only --no-owner --no-privileges > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo Structure backup saved: %BACKUP_FILE%
) else (
    echo ERROR: Backup failed!
    exit /b 1
)

echo.
echo To restore structure + seed, run:
echo   npx prisma migrate reset
echo   npx tsx prisma/seed.ts
echo.
echo Done.
