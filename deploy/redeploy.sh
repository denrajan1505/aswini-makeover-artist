#!/bin/bash
# Aswini Makeover Artist Redeploy Script — run after pushing new code to GitHub
set -e

APP_DIR="/var/www/aswini-makeover"

echo "===== Pulling latest code ====="
git -C $APP_DIR pull

echo "===== Updating Python dependencies ====="
cd $APP_DIR/backend
./venv/bin/pip install -r requirements.txt

echo "===== Rebuilding frontend ====="
cd $APP_DIR/frontend
npm install
npm run build

echo "===== Restarting backend ====="
systemctl restart aswini-makeover
sleep 2
systemctl status aswini-makeover --no-pager

echo "===== Done ====="
