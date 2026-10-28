#!/usr/bin/env bash
# Inicia el tótem en modo kiosco (Linux). Requiere Python 3 y Chromium/Chrome.
cd "$(dirname "$0")"
PORT=8080
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
BROWSER=$(command -v chromium || command -v chromium-browser || command -v google-chrome)
"$BROWSER" --kiosk --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 \
  --incognito "http://127.0.0.1:$PORT/index.html"
