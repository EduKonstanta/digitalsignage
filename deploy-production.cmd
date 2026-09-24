@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "EXPECTED_TEAM_NAME=Konstanta Education"
set "VERCEL_SCOPE=konstanta-education"
set "VERCEL_PROJECT=digitalsignage"
set "RUN_MODE=deploy"
set "EXIT_CODE=0"

if /i "%~1"=="--check" set "RUN_MODE=check"
if /i "%~1"=="--help" goto :usage
if /i "%~1"=="-h" goto :usage
if not "%~1"=="" if /i not "%~1"=="--check" goto :invalid_argument

set "SCOPE_FILE=%TEMP%\ke-digital-signage-vercel-scope-!RANDOM!-!RANDOM!.txt"
set "ENV_FILE=%TEMP%\ke-digital-signage-vercel-env-!RANDOM!-!RANDOM!.txt"
set "VERCEL_CLI=npx.cmd --yes vercel@latest"

echo.
echo ============================================================
echo  KE Digital Signage - Deployment Production Vercel
echo ============================================================
echo  Team wajib : %EXPECTED_TEAM_NAME%
echo  Scope       : %VERCEL_SCOPE%
echo  Project     : %VERCEL_PROJECT%
echo.

call :require_command node.exe || goto :failed
call :require_command npm.cmd || goto :failed
call :require_command npx.cmd || goto :failed
call :require_command git.exe || goto :failed

for /f "usebackq delims=" %%R in (`git -c safe.directory^="%CD%" config --get remote.origin.url`) do set "GIT_REMOTE=%%R"
echo(!GIT_REMOTE!| findstr /i /c:"github.com/EduKonstanta/digitalsignage" >nul
if errorlevel 1 (
  echo [GAGAL] Remote origin bukan EduKonstanta/digitalsignage.
  echo         Remote saat ini: !GIT_REMOTE!
  set "EXIT_CODE=1"
  goto :cleanup
)
echo [OK] Repository GitHub: !GIT_REMOTE!

echo.
echo [1/5] Memeriksa login Vercel...
call %VERCEL_CLI% whoami
if errorlevel 1 (
  echo.
  echo Sesi Vercel belum aktif. Silakan login dengan akun yang memiliki
  echo akses ke team "%EXPECTED_TEAM_NAME%".
  call %VERCEL_CLI% login
  if errorlevel 1 (
    echo [GAGAL] Login Vercel tidak berhasil.
    set "EXIT_CODE=1"
    goto :cleanup
  )
)

echo.
echo [2/5] Memastikan team Vercel "%EXPECTED_TEAM_NAME%" tersedia...
call %VERCEL_CLI% project ls --scope "%VERCEL_SCOPE%" > "%SCOPE_FILE%" 2>&1
if errorlevel 1 (
  echo.
  type "%SCOPE_FILE%"
  echo [DIBATALKAN] Scope "%VERCEL_SCOPE%" tidak tersedia pada sesi ini.
  echo Deployment dihentikan agar tidak masuk ke akun pribadi atau team lain.
  echo.
  echo Scope yang tersedia:
  call %VERCEL_CLI% teams list
  echo.
  echo Login atau minta undangan ke team "%EXPECTED_TEAM_NAME%", lalu ulangi.
  set "EXIT_CODE=2"
  goto :cleanup
)
echo [OK] Scope Vercel terverifikasi: %VERCEL_SCOPE%

if /i "%RUN_MODE%"=="check" (
  echo.
  echo [OK] Pemeriksaan akun selesai. Tidak ada project yang di-link atau di-deploy.
  goto :cleanup
)

echo.
echo [3/5] Menghubungkan project ke scope %VERCEL_SCOPE%...
call %VERCEL_CLI% link --yes --project "%VERCEL_PROJECT%" --scope "%VERCEL_SCOPE%"
if errorlevel 1 (
  echo [GAGAL] Project tidak dapat di-link ke team "%EXPECTED_TEAM_NAME%".
  set "EXIT_CODE=1"
  goto :cleanup
)

echo.
echo [4/5] Memeriksa environment variable production...
call %VERCEL_CLI% env ls production --scope "%VERCEL_SCOPE%" > "%ENV_FILE%" 2>&1
if errorlevel 1 (
  type "%ENV_FILE%"
  echo [GAGAL] Environment production tidak dapat diperiksa.
  set "EXIT_CODE=1"
  goto :cleanup
)

set "MISSING_ENV="
for %%E in (TURSO_DATABASE_URL TURSO_AUTH_TOKEN AUTH_SECRET APP_URL) do (
  findstr /i /c:"%%E" "%ENV_FILE%" >nul
  if errorlevel 1 set "MISSING_ENV=!MISSING_ENV! %%E"
)

rem Fitur presensi kartu dan notifikasi WhatsApp gagal diam-diam bila secret ini
rem belum diisi, jadi diperiksa sebagai peringatan (tidak memblokir deployment).
set "MISSING_OPTIONAL="
for %%E in (ATTENDANCE_DEVICE_TOKEN FONNTE_TOKEN FONNTE_ENABLED FONNTE_WEBHOOK_SECRET) do (
  findstr /i /c:"%%E" "%ENV_FILE%" >nul
  if errorlevel 1 set "MISSING_OPTIONAL=!MISSING_OPTIONAL! %%E"
)

if defined MISSING_OPTIONAL (
  echo [PERINGATAN] Environment opsional berikut belum tersedia:
  echo!MISSING_OPTIONAL!
  echo             Presensi kartu / notifikasi WhatsApp tidak akan aktif.
)

if defined MISSING_ENV (
  echo [DIBATALKAN] Environment variable production berikut belum tersedia:
  echo!MISSING_ENV!
  echo.
  echo Tambahkan variable tersebut ke project "%VERCEL_PROJECT%" pada team
  echo "%EXPECTED_TEAM_NAME%", lalu jalankan script ini kembali.
  set "EXIT_CODE=3"
  goto :cleanup
)
echo [OK] Environment production wajib tersedia.

echo.
echo [5/5] Menjalankan verifikasi lokal dan deployment production...
call npm.cmd ci
if errorlevel 1 (
  echo [GAGAL] npm ci gagal.
  set "EXIT_CODE=1"
  goto :cleanup
)

call npm.cmd run verify
if errorlevel 1 (
  echo [GAGAL] Verifikasi project gagal. Deployment dibatalkan.
  set "EXIT_CODE=1"
  goto :cleanup
)

echo.
echo Target final:
echo   Team    : %EXPECTED_TEAM_NAME% ^(%VERCEL_SCOPE%^)
echo   Project : %VERCEL_PROJECT%
echo   Mode    : Production
echo.

call %VERCEL_CLI% deploy --prod --yes --scope "%VERCEL_SCOPE%"
if errorlevel 1 (
  echo [GAGAL] Deployment production Vercel gagal.
  set "EXIT_CODE=1"
  goto :cleanup
)

echo.
echo [BERHASIL] KE Digital Signage sudah di-deploy ke production
echo pada team "%EXPECTED_TEAM_NAME%".
goto :cleanup

:require_command
where.exe %~1 >nul 2>&1
if errorlevel 1 (
  echo [GAGAL] Command "%~1" tidak ditemukan pada PATH.
  exit /b 1
)
exit /b 0

:invalid_argument
echo [GAGAL] Argumen tidak dikenal: %~1
echo.
goto :usage_error

:usage
echo Penggunaan:
echo   deploy-production.cmd          Verifikasi dan deploy production
echo   deploy-production.cmd --check  Hanya cek akses team, tanpa link/deploy
echo   deploy-production.cmd --help   Tampilkan bantuan
echo.
echo Script hanya mengizinkan deployment ke team "%EXPECTED_TEAM_NAME%".
goto :cleanup

:usage_error
set "EXIT_CODE=64"
goto :cleanup

:failed
set "EXIT_CODE=1"

:cleanup
if defined SCOPE_FILE if exist "%SCOPE_FILE%" del /q "%SCOPE_FILE%" >nul 2>&1
if defined ENV_FILE if exist "%ENV_FILE%" del /q "%ENV_FILE%" >nul 2>&1
endlocal & exit /b %EXIT_CODE%
