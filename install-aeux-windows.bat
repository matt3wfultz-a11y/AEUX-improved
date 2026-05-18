@echo off
echo Enabling unsigned CEP extensions for After Effects...

reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f

echo.
echo Done! Now do the following:
echo 1. Copy the AEUX folder to: %APPDATA%\Adobe\CEP\extensions\
echo 2. Restart After Effects
echo 3. Go to Windows - Extensions - AEUX
echo.
pause
