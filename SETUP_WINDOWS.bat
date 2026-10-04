@echo off
setlocal
cd /d %~dp0

if not exist .env copy .env.example .env
if not exist node_modules (
  echo Menginstall dependency NexaNet...
  call npm install
  if %errorlevel% neq 0 goto failed
)

echo.
echo ==================================================
echo Menyiapkan database NexaNet...
echo ==================================================
call npm run setup-db
if %errorlevel% neq 0 goto dbfailed

echo.
echo ==================================================
echo NexaNet siap dijalankan.
echo Jalankan START.bat atau: npm start
echo ==================================================
echo.
pause
exit /b 0

dbfailed:
echo.
echo Gagal menyiapkan database. Pastikan MySQL/XAMPP aktif
dan username/password pada .env sudah benar.
pause
exit /b 1

:failed
echo npm install gagal. Pastikan Node.js sudah terpasang.
pause
exit /b 1
