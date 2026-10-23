@echo off
REM Inicia el totem en modo kiosco (Windows). Requiere Python 3 y Google Chrome.
cd /d "%~dp0"
start "" /min python -m http.server 8080 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --incognito http://127.0.0.1:8080/index.html
