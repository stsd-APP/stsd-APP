#!/bin/bash
# ============================================
# SANTONG 叁通速達 - 一鍵部署腳本
# 服務器: Ubuntu 22.04 (騰訊雲香港)
# ============================================

set -e

echo "=========================================="
echo "  🚀 叁通速達 - 一鍵部署"
echo "=========================================="

# ============================================
# 第一階段: 環境配置
# ============================================
echo ""
echo "[1/8] 更新系統..."
apt update && apt upgrade -y

echo "[2/8] 安裝必要工具..."
apt install -y curl wget git unzip nginx certbot python3-certbot-nginx

echo "[3/8] 安裝 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "[4/8] 安裝 pnpm 和 PM2..."
npm install -g pnpm pm2

echo "[5/8] 安裝 PostgreSQL..."
apt install -y postgresql postgresql-contrib

# 配置數據庫
echo "[6/8] 配置數據庫..."
sudo -u postgres psql -c "CREATE USER santong WITH PASSWORD 'SanTong2026HK';" 2>/dev/null || echo "用戶已存在"
sudo -u postgres psql -c "CREATE DATABASE santong_db OWNER santong;" 2>/dev/null || echo "數據庫已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE santong_db TO santong;"

# ============================================
# 第二階段: 拉取代碼
# ============================================
echo "[7/8] 拉取代碼..."
mkdir -p /var/www
cd /var/www
rm -rf santong
git clone https://github.com/stsd-APP/stsd-APP.git santong
cd santong

# ============================================
# 第三階段: 部署應用
# ============================================
echo "[8/8] 部署應用..."

# 創建目錄
mkdir -p /var/www/santong-app/{api,web}
mkdir -p /var/log/pm2

# 部署後端
cp -r apps/api/dist/* /var/www/santong-app/api/ 2>/dev/null || echo "後端 dist 不存在，需要構建"
cp apps/api/package.json /var/www/santong-app/api/

# 創建 .env 文件
cat > /var/www/santong-app/api/.env << 'ENVEOF'
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://santong:SanTong2026HK@localhost:5432/santong_db"
JWT_SECRET="santong-jwt-secret-2026-production-change-this"
JWT_EXPIRES_IN="7d"
ENVEOF

# 部署前端
cp -r apps/web/dist/* /var/www/santong-app/web/ 2>/dev/null || echo "前端 dist 不存在"

# 安裝依賴
cd /var/www/santong-app/api
npm install --production

# Prisma
cp -r /var/www/santong/packages/database/prisma ./
npx prisma generate
npx prisma migrate deploy || npx prisma db push

# 創建 PM2 配置
cat > /var/www/santong-app/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'santong-api',
    script: './dist/main.js',
    cwd: '/var/www/santong-app/api',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
PMEOF

# 配置 Nginx
cat > /etc/nginx/sites-available/santong << 'NGINXEOF'
server {
    listen 80;
    server_name santonglogistic.com www.santonglogistic.com _;

    root /var/www/santong-app/web;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 50M;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/santong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 啟動 PM2
cd /var/www/santong-app
pm2 delete santong-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 防火牆
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "🌐 網站地址: http://santonglogistic.com"
echo "🌐 或使用 IP: http://43.128.1.14"
echo ""
echo "📋 常用命令:"
echo "   pm2 status          - 查看狀態"
echo "   pm2 logs            - 查看日誌"
echo "   pm2 restart all     - 重啟服務"
echo ""
echo "🔒 配置 HTTPS:"
echo "   certbot --nginx -d santonglogistic.com"
echo "=========================================="
