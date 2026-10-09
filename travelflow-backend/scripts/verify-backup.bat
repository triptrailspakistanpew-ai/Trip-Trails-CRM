@echo off
REM TravelFlow Backup Verification Script
REM Usage: verify-backup.bat backup_file.sql.gz

setlocal

if "%~1"=="" (
    echo Usage: verify-backup.bat ^<backup_file.sql.gz^>
    exit /b 1
)

set BACKUP_FILE=%~1

if not exist "%BACKUP_FILE%" (
    echo ERROR: File not found: %BACKUP_FILE%
    exit /b 1
)

echo Verifying backup: %BACKUP_FILE%
echo.

REM Check file size
for %%F in ("%BACKUP_FILE%") do (
    set SIZE=%%~zF
    if !SIZE! LSS 100 (
        echo WARNING: File is very small (!SIZE! bytes), may be corrupted
    ) else (
        echo File size: !SIZE! bytes - OK
    )
)

REM Try to decompress and check for SQL content
echo Checking gzip integrity...
gunzip -t "%BACKUP_FILE%" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Gzip integrity: OK
) else (
    echo ERROR: Gzip file is corrupted!
    exit /b 1
)

REM Check for key SQL markers
echo Checking SQL content...
gunzip -c "%BACKUP_FILE%" | findstr /C:"CREATE TABLE" /C:"INSERT INTO" /C:"PostgreSQL" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo SQL content: OK (contains CREATE TABLE / INSERT statements)
) else (
    echo WARNING: No typical SQL markers found
)

echo.
echo Backup appears valid.
