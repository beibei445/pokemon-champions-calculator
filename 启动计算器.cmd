@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
echo 请打开 http://127.0.0.1:5173
echo 关闭此窗口即可停止计算器。
call npm run dev -- --port 5173
