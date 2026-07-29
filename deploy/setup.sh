#!/bin/bash
# Aswini Makeover Artist Server Setup Script
# Run once on a fresh Ubuntu VPS: bash setup.sh
set -e

APP_DIR="/var/www/aswini-makeover"
REPO="https://github.com/your-username/aswini-makeover-artist.git"  # TODO: replace with your repo URL

echo "===== [1/8] Installing system packages ====="
apt-get update -y
apt-get install -y software-properties-common nginx git curl build-essential python3-pip

if ! command -v python3.12 &> /dev/null; then
    add-apt-repository ppa:deadsnakes/ppa -y
    apt-get update -y
    apt-get install -y python3.12 python3.12-venv python3.12-dev
fi
echo "Python: $(python3.12 --version)"

echo "===== [2/8] Installing Node.js 20 ====="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

echo "===== [3/8] Cloning repository ====="
mkdir -p $APP_DIR
if [ -d "$APP_DIR/.git" ]; then
    echo "Repo already exists, pulling latest..."
    git -C $APP_DIR pull
else
    git clone $REPO $APP_DIR
fi

echo "===== [4/8] Setting up Python backend ====="
cd $APP_DIR/backend
python3.12 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo ""
echo "===== [5/8] Create backend .env file ====="
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env
    echo ""
    echo "!!! ACTION REQUIRED: Edit /var/www/aswini-makeover/backend/.env with your real Supabase/Razorpay keys"
    echo "    Run: nano /var/www/aswini-makeover/backend/.env"
    echo "    Then re-run: bash /var/www/aswini-makeover/deploy/setup.sh"
    exit 0
else
    echo ".env already exists, skipping..."
fi

echo "===== [6/8] Building React frontend ====="
cd $APP_DIR/frontend
if [ ! -f ".env.production" ]; then
    cp .env.example .env.production
    echo "!!! ACTION REQUIRED: Edit frontend/.env.production with your real Supabase anon key and API URL"
fi
npm install
npm run build
echo "Frontend built at $APP_DIR/frontend/dist"

echo "===== [7/8] Configuring Nginx ====="
cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/aswini-makeover
ln -sf /etc/nginx/sites-available/aswini-makeover /etc/nginx/sites-enabled/aswini-makeover
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "===== [8/8] Starting backend service ====="
cp $APP_DIR/deploy/aswini-makeover.service /etc/systemd/system/aswini-makeover.service
systemctl daemon-reload
systemctl enable aswini-makeover
systemctl restart aswini-makeover
sleep 2
systemctl status aswini-makeover --no-pager

echo ""
echo "====================================================="
echo "  Aswini Makeover Artist deployed"
echo "====================================================="
