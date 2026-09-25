@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "EXIT_CODE=0"
set "AUTO_YES="
set "COMMIT_MSG="

rem Klik ganda dari File Explorer (tanpa argumen) menutup jendela begitu script
rem selesai, jadi perlu pause di akhir agar hasilnya sempat dibaca.
set "DOUBLE_CLICKED="
if "%~1"=="" (
  echo !cmdcmdline! | find /i "/c" >nul && set "DOUBLE_CLICKED=1"
)

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--help" goto :usage
if /i "%~1"=="-h" goto :usage
if /i "%~1"=="--yes" ( set "AUTO_YES=1" & shift & goto :parse_args )
if /i "%~1"=="-y" ( set "AUTO_YES=1" & shift & goto :parse_args )
if /i "%~1"=="--message" goto :arg_message
if /i "%~1"=="-m" goto :arg_message
echo [GAGAL] Argumen tidak dikenal: %~1
echo.
goto :usage_error

:arg_message
if "%~2"=="" (
  echo [GAGAL] %~1 membutuhkan teks pesan commit.
  goto :usage_error
)
set "COMMIT_MSG=%~2"
shift
shift
goto :parse_args

:args_done

echo.
echo ============================================================
echo  KE Digital Signage - Commit, Deploy, dan Push
echo ============================================================
echo.

call :require_command git.exe || goto :failed
if not exist "%~dp0deploy-production.cmd" (
  echo [GAGAL] deploy-production.cmd tidak ditemukan di folder ini.
  goto :failed
)

for /f "usebackq delims=" %%B in (`git branch --show-current`) do set "BRANCH=%%B"
if not defined BRANCH (
  echo [GAGAL] Repository sedang dalam detached HEAD. Pindah ke sebuah branch dulu.
  goto :failed
)
echo Branch : !BRANCH!
echo.

rem next-env.d.ts ditulis ulang otomatis oleh `next dev` (isinya menunjuk ke
rem .next-dev yang tidak ada di CI), jadi tidak pernah ikut di-commit.
set "PATHSPEC=. :(exclude)next-env.d.ts"

echo Perubahan yang akan di-commit:
echo ------------------------------------------------------------
git status --short -- !PATHSPEC!
echo ------------------------------------------------------------
echo.

set "HAS_CHANGES="
for /f "usebackq delims=" %%L in (`git status --porcelain -- !PATHSPEC!`) do set "HAS_CHANGES=1"

if not defined HAS_CHANGES (
  echo Tidak ada perubahan baru. Langkah commit dilewati, deploy tetap dijalankan.
  echo.
)

if not defined AUTO_YES (
  if defined HAS_CHANGES (
    echo Semua perubahan di atas akan di-commit, lalu deploy production, lalu push.
  ) else (
    echo Deploy production akan dijalankan, lalu push.
  )
  choice /c YN /n /m "Lanjut? [Y/N] "
  if errorlevel 2 (
    echo Dibatalkan. Tidak ada commit, deploy, atau push.
    goto :cleanup
  )
)

rem Stage sekarang supaya commit nanti persis berisi daftar yang tadi ditampilkan,
rem walau ada file yang berubah selama proses deploy.
if defined HAS_CHANGES (
  git add -A -- !PATHSPEC!
  if errorlevel 1 (
    echo [GAGAL] git add gagal.
    goto :failed
  )
)

if defined HAS_CHANGES if not defined COMMIT_MSG (
  for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"`) do set "STAMP=%%D"
  if not defined STAMP set "STAMP=%DATE% %TIME%"
  set "DEFAULT_MSG=chore(deploy): deploy production !STAMP!"
  if defined AUTO_YES (
    set "COMMIT_MSG=!DEFAULT_MSG!"
  ) else (
    echo.
    echo Pesan commit ^(Enter untuk memakai: !DEFAULT_MSG!^)
    set /p "COMMIT_MSG=> "
    if not defined COMMIT_MSG set "COMMIT_MSG=!DEFAULT_MSG!"
  )
)

rem Tanda petik di pesan akan memutus argumen git, jadi dibuang.
if defined COMMIT_MSG set "COMMIT_MSG=!COMMIT_MSG:"=!"

rem Dev server yang masih hidup membuat `npm ci` di deploy-production.cmd gagal;
rem dengan --yes proses itu dihentikan tanpa bertanya lagi.
if defined AUTO_YES set "KE_DEPLOY_ASSUME_YES=1"

echo.
echo [1/3] Verifikasi dan deploy production...
call "%~dp0deploy-production.cmd"
if errorlevel 1 (
  echo.
  echo [GAGAL] Deploy production tidak berhasil. Tidak ada commit dan tidak ada push.
  echo         Perubahan tetap ter-stage; jalankan deploy.cmd lagi setelah masalahnya diperbaiki.
  set "EXIT_CODE=1"
  goto :cleanup
)

echo.
if defined HAS_CHANGES (
  echo [2/3] Commit perubahan...
  git commit -m "!COMMIT_MSG!"
  if errorlevel 1 (
    echo [GAGAL] git commit gagal. Deploy sudah berhasil, tetapi perubahan belum ter-commit.
    set "EXIT_CODE=1"
    goto :cleanup
  )
) else (
  echo [2/3] Tidak ada perubahan untuk di-commit.
)

echo.
echo [3/3] Push ke origin/!BRANCH!...
git push -u origin HEAD
if errorlevel 1 (
  echo.
  echo [GAGAL] git push gagal. Deploy dan commit lokal sudah berhasil.
  echo         Jika remote punya commit baru, jalankan: git pull --rebase
  echo         lalu: git push
  set "EXIT_CODE=1"
  goto :cleanup
)

echo.
echo [BERHASIL] Perubahan sudah di-commit, di-deploy ke production, dan di-push
echo ke origin/!BRANCH!.
goto :cleanup

:require_command
where.exe %~1 >nul 2>&1
if errorlevel 1 (
  echo [GAGAL] Command "%~1" tidak ditemukan pada PATH.
  exit /b 1
)
exit /b 0

:usage
echo Penggunaan:
echo   deploy.cmd                     Tanya konfirmasi dan pesan commit, lalu proses
echo   deploy.cmd --yes               Tanpa pertanyaan, pesan commit otomatis
echo   deploy.cmd -m "pesan commit"   Pakai pesan commit sendiri
echo   deploy.cmd --help              Tampilkan bantuan
echo.
echo Urutan: stage semua perubahan ^(git add -A, kecuali next-env.d.ts^), verifikasi + deploy production
echo ^(deploy-production.cmd^), commit, lalu push ke origin. Commit dan push hanya
echo terjadi bila deploy berhasil. File di .gitignore ^(.env, *.db, dsb.^) tidak ikut.
goto :cleanup

:usage_error
set "EXIT_CODE=64"
goto :cleanup

:failed
set "EXIT_CODE=1"
goto :cleanup

:cleanup
if defined DOUBLE_CLICKED (
  echo.
  pause
)
endlocal & exit /b %EXIT_CODE%
