#!/bin/bash
# /app/scripts/deploy.sh
# Script deploy manual untuk VPS — jalankan di VPS: bash deploy.sh
set -e

APP_DIR="/var/www/seaipc2026"

echo "🚀 Deploying SEAIPC 2026 OJS..."
cd "$APP_DIR"

echo "📥 Pull from GitHub..."
git fetch origin
git reset --hard origin/main

echo "🐍 Backend: install deps..."
cd backend
source venv/bin/activate
pip install -q -r requirements.txt

echo "🔄 Restart backend..."
if pm2 describe seaipc-backend > /dev/null 2>&1; then
    pm2 restart seaipc-backend
else
    pm2 start "uvicorn server:app --host 127.0.0.1 --port 8001" --name seaipc-backend --interpreter none
    pm2 save
fi
deactivate

echo "⚛️  Frontend: rebuild..."
cd "$APP_DIR/frontend"
yarn install --silent --frozen-lockfile
yarn build --silent

echo "🔁 Reload Nginx..."
sudo systemctl reload nginx

echo "✅ Deploy selesai. Cek: https://seaipc2026.imz.or.id"
echo ""
echo "📊 Status:"
pm2 list | grep seaipc-backend || true
