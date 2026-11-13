@echo off
:: Sky Runner 3D - Setup Local Domain (sky-runner-3d.com)
:: Requests Administrator privileges to update C:\Windows\System32\drivers\etc\hosts

net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Requesting Administrator privileges to configure sky-runner-3d.com...
    powershell -Command "Start-Process '%~dp0setup_local_domain.bat' -Verb RunAs"
    exit /b
)

:admin
echo ========================================================
echo    Configuring Local Domain: sky-runner-3d.com
echo ========================================================

findstr /i "sky-runner-3d.com" "%WINDIR%\System32\drivers\etc\hosts" >nul
if %errorLevel% == 0 (
    echo Domain 'sky-runner-3d.com' is already configured in your hosts file!
) else (
    echo. >> "%WINDIR%\System32\drivers\etc\hosts"
    echo # Sky Runner 3D Local Domain >> "%WINDIR%\System32\drivers\etc\hosts"
    echo 127.0.0.1 sky-runner-3d.com >> "%WINDIR%\System32\drivers\etc\hosts"
    echo 127.0.0.1 www.sky-runner-3d.com >> "%WINDIR%\System32\drivers\etc\hosts"
    echo Successfully added sky-runner-3d.com to %WINDIR%\System32\drivers\etc\hosts!
)

ipconfig /flushdns >nul
echo DNS Cache Flushed.
echo.
echo ========================================================
echo  Setup Complete! You can now access:
echo  https://sky-runner-3d.com
echo ========================================================
echo.
pause
