@echo off
REM TravelFlow Database Restore Script
REM Usage: restore-db.bat backup_file.sql.gz
REM Example: restore-db.bat ..\backups\tf_db_manual_20260830_120000.sql.gz

setlocal

set DB_HOST=localhost
set DB_PORT=5433
set DB_USER=tfuser
set DB_NAME=tf_db

if "%~1"=="" (
    echo Usage: restore-db.bat ^<backup_file.sql.gz^>
    echo.
    echo Available backups:
    dir /b /o-d %~dp0..\backups\%DB_NAME%_*.sql.gz 2>nul
    exit /b 1
)

set BACKUP_FILE=%~1

if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    exit /b 1
)

echo WARNING: This will OVERWRITE the current database!
echo Database: %DB_NAME%
echo Backup: %BACKUP_FILE%
echo.
set /p CONFIRM="Are you sure? (YES to confirm): "
if /i not "%CONFIRM%"=="YES" (
    echo Aborted.
    exit /b 0
)

echo Dropping existing connections...
docker exec postgres psql -U %DB_USER% -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '%DB_NAME%' AND pid <> pg_backend_pid();" >nul 2>&1

echo Dropping and recreating database...
docker exec postgres psql -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;" >nul 2>&1
docker exec postgres psql -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" >nul 2>&1

echo Restoring from backup...
gunzip -c "%BACKUP_FILE%" | docker exec -i postgres psql -U %DB_USER% -d %DB_NAME% --single-transaction 2>&1

if %ERRORLEVEL% EQU 0 (
    echo Restore successful!
    echo.
    echo Running Prisma migrations to ensure schema is up to date...
    cd /d "%~dp0.."
    npx prisma migrate deploy
    echo.
    echo Done. Database restored from: %BACKUP_FILE%
) else (
    echo ERROR: Restore failed!
    exit /b 1
)
