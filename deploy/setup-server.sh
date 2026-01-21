#!/bin/bash
# ============================================
# SANTONG 叁通速達 - 服務器初始化腳本
# 適用於: Ubuntu 22.04 (騰訊雲香港)
# ============================================

set -e

echo "=========================================="
echo "  叁通速達 - 服務器環境配置"
echo "=========================================="

# 更新系統
echo "[1/7] 更新系統包..."
sudo apt update && sudo apt upgrade -y

# 安裝必要工具
echo "[2/7] 安裝必要工具..."
sudo apt install -y curl wget git unzip nginx certbot python3-certbot-nginx

# 安裝 Node.js 20.x LTS
echo "[3/7] 安裝 Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安裝 pnpm
echo "[4/7] 安裝 pnpm..."
sudo npm install -g pnpm

# 安裝 PM2
echo "[5/7] 安裝 PM2..."
sudo npm install -g pm2

# 安裝 PostgreSQL
echo "[6/7] 安裝 PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# 配置 PostgreSQL
echo "[7/7] 配置 PostgreSQL..."
sudo -u postgres psql -c "CREATE USER santong WITH PASSWORD 'SanTong2026@HK';" 2>/dev/null || echo "用戶已存在"
sudo -u postgres psql -c "CREATE DATABASE santong_db OWNER santong;" 2>/dev/null || echo "數據庫已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE santong_db TO santong;"

# 創建應用目錄
echo "創建應用目錄..."
sudo mkdir -p /var/www/santong
sudo chown -R $USER:$USER /var/www/santong

# 設置防火牆
echo "配置防火牆..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# 顯示版本信息
echo ""
echo "=========================================="
echo "  環境配置完成！"
echo "=========================================="
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo "pnpm: $(pnpm -v)"
echo "PM2: $(pm2 -v)"
echo "PostgreSQL: $(psql --version)"
echo ""
echo "數據庫連接字符串:"
echo "postgresql://santong:SanTong2026@HK@localhost:5432/santong_db"
echo ""
echo "下一步: 上傳代碼並執行 deploy.sh"
echo "=========================================="
