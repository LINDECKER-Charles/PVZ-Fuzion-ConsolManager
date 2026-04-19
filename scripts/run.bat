@echo off
REM Launch pvzf-console from source (no install required).
setlocal
cd /d "%~dp0\.."
set PYTHONPATH=src
where python >nul 2>&1 && (python -m pvz_console %* & exit /b %errorlevel%)
where py >nul 2>&1 && (py -m pvz_console %* & exit /b %errorlevel%)
echo error: Python not found on PATH. 1>&2
echo        install Python 3.10+ from https://www.python.org/downloads/ 1>&2
exit /b 1
