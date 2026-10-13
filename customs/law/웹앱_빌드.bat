@echo off
chcp 65001 >nul
set PYTHONUTF8=1
python -I "%~dp0tools\lawappuild_app.py" %*
pause
