@echo off
setlocal

echo === AEUX Installer for Windows ===
echo.

:: ── After Effects extension ──────────────────────────────────────────────────

set "SRC=%~dp0AEUX"
set "DEST=%APPDATA%\Adobe\CEP\extensions\AEUX"

if not exist "%SRC%" (
  echo Error: AEUX folder not found next to this script.
  echo Make sure you extracted the full AEUX zip before running this installer.
  pause
  exit /b 1
)

echo Installing After Effects extension...

:: Enable CEP debug mode so unsigned extensions load
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo   Enabled CEP debug mode for unsigned extensions.

:: Remove old installation if present
if exist "%DEST%" (
  echo   Removing old installation...
  rmdir /s /q "%DEST%"
)

:: Create the extensions folder and copy
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"
xcopy /e /i /q "%SRC%" "%DEST%" >nul
echo   Copied to: %DEST%

echo.
echo After Effects: done.
echo   Restart After Effects, then open Window ^> Extensions ^> AEUX.
echo.

:: ── Figma plugin ─────────────────────────────────────────────────────────────

if exist "%~dp0AEUX-Figma" (
  echo Figma plugin:
  echo   1. In Figma, go to Plugins ^> Development ^> Import plugin from manifest...
  echo   2. Navigate to: %~dp0AEUX-Figma
  echo   3. Select manifest.json
  echo.
)

echo Installation complete!
echo.
pause
