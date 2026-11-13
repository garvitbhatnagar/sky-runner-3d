@echo off
echo ========================================================
echo   Building Sky Runner 3D Windows Executable (.exe)
echo ========================================================

python -m PyInstaller --noconfirm --onedir --windowed ^
    --name "SkyRunner3D" ^
    --add-data "static;static" ^
    main.py

echo.
echo ========================================================
echo   Build complete! Output is in the 'dist\SkyRunner3D' folder.
echo   You can launch the game via 'dist\SkyRunner3D\SkyRunner3D.exe'.
echo ========================================================
pause
