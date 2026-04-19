@echo off
REM Build dist\pvzf_console.pyz with bundled data\.
setlocal
cd /d "%~dp0\.."

set PY=
where python >nul 2>&1 && set PY=python
if "%PY%"=="" where py >nul 2>&1 && set PY=py
if "%PY%"=="" (
    echo error: Python not found on PATH. 1>&2
    echo        install Python 3.10+ from https://www.python.org/downloads/ 1>&2
    exit /b 1
)

set STAGING=%TEMP%\pvzf-build-%RANDOM%
if exist "%STAGING%" rmdir /s /q "%STAGING%"
mkdir "%STAGING%"

xcopy /E /I /Y src\pvz_console "%STAGING%\pvz_console" >nul
if not exist "%STAGING%\pvz_console\data" mkdir "%STAGING%\pvz_console\data"
xcopy /E /I /Y data "%STAGING%\pvz_console\data" >nul

if not exist dist mkdir dist
%PY% -m zipapp "%STAGING%" -m "pvz_console.__main__:main" -o dist\pvzf_console.pyz
set RC=%errorlevel%

rmdir /s /q "%STAGING%"

if %RC% neq 0 exit /b %RC%

if exist README.dist.md copy /Y README.dist.md dist\README.md >nul

echo built: dist\pvzf_console.pyz
echo doc:   dist\README.md
