@echo off
rem Daily catalog run for Task Scheduler. Writes to the host database using .env in the project folder.
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ==== %date% %time% ==== >> logs\catalog.log
node src\catalog.js >> logs\catalog.log 2>&1
echo exit code %errorlevel% >> logs\catalog.log
