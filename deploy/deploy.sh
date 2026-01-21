#!/bin/bash
# ============================================
# SANTONG 叁通速達 - 應用部署腳本
# ============================================

set -e

APP_DIR="/var/www/santong"
DEPLOY_DIR="$APP_DIR/deploy"

echo "=========================================="
echo "  叁通速達 - 應用部署"
echo "=========================================="

# 創建目錄結構
echo "[1/6] 創建目錄結構..."
mkdir -p $APP_DIR/{api,web}
mkdir -p /var/log/pm2

# 複製後端文件
echo "[2/6] 部署後端 API..."
cp -r ./apps/api/dist $APP_DIR/api/
cp ./apps/api/package.json $APP_DIR/api/
cp ./deploy/.env.production $APP_DIR/api/.env

# 安裝後端依賴
echo "[3/6] 安裝後端依賴..."
cd $APP_DIR/api
pnpm install --prod

# 複製前端文件
echo "[4/6] 部署前端..."
cp -r ./apps/web/dist/* $APP_DIR/web/

# 配置 Nginx
echo "[5/6] 配置 Nginx..."
sudo cp ./deploy/nginx.conf /etc/nginx/sites-available/santong
sudo ln -sf /etc/nginx/sites-available/santong /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 啟動 PM2
echo "[6/6] 啟動應用服務..."
cd $APP_DIR
pm2 delete santong-api 2>/dev/null || true
pm2 start ./deploy/ecosystem.config.js --env production
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "檢查狀態:"
echo "  pm2 status"
echo "  pm2 logs santong-api"
echo ""
echo "網站地址:"
echo "  http://santonglogistic.com"
echo ""
echo "下一步 - 配置 SSL 證書:"
echo "  sudo certbot --nginx -d santonglogistic.com -d www.santonglogistic.com"
echo "=========================================="
