# 🚀 SANTONG 叁通速達 - 部署指南

## 服務器信息
- **服務器**: 騰訊雲香港 (43.128.1.14)
- **系統**: Ubuntu 22.04
- **域名**: santonglogistic.com

---

## 📋 部署步驟

### 步驟 1: 上傳文件到服務器

在本地 Windows 電腦執行:

```powershell
# 方法 A: 使用 SCP 上傳整個項目
scp -r "D:\node install" root@43.128.1.14:/tmp/santong-deploy

# 方法 B: 只上傳必要文件 (推薦)
# 先打包
cd "D:\node install"
tar -czvf santong-deploy.tar.gz apps/api/dist apps/web/dist deploy packages/database/prisma

# 上傳
scp santong-deploy.tar.gz root@43.128.1.14:/tmp/
```

### 步驟 2: SSH 連接服務器

```bash
ssh root@43.128.1.14
```

### 步驟 3: 初始化服務器環境

```bash
cd /tmp
# 如果用方法 B，先解壓
tar -xzvf santong-deploy.tar.gz -C santong-deploy

cd santong-deploy
chmod +x deploy/*.sh
./deploy/setup-server.sh
```

### 步驟 4: 部署應用

```bash
# 創建應用目錄
mkdir -p /var/www/santong/{api,web}
mkdir -p /var/log/pm2

# 複製後端
cp -r apps/api/dist/* /var/www/santong/api/
cp apps/api/package.json /var/www/santong/api/
cp deploy/env.production.example /var/www/santong/api/.env
cp deploy/ecosystem.config.js /var/www/santong/

# 複製前端
cp -r apps/web/dist/* /var/www/santong/web/

# 安裝後端依賴
cd /var/www/santong/api
npm install --production

# 運行數據庫遷移
npx prisma migrate deploy
npx prisma db seed

# 配置 Nginx
cp /tmp/santong-deploy/deploy/nginx.conf /etc/nginx/sites-available/santong
ln -sf /etc/nginx/sites-available/santong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 啟動 PM2
cd /var/www/santong
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 步驟 5: 配置 SSL 證書 (HTTPS)

```bash
# 確保域名已解析到服務器 IP
sudo certbot --nginx -d santonglogistic.com -d www.santonglogistic.com

# 自動續期測試
sudo certbot renew --dry-run
```

---

## 🔧 常用運維命令

### PM2 管理

```bash
pm2 status              # 查看狀態
pm2 logs santong-api    # 查看日誌
pm2 restart santong-api # 重啟應用
pm2 stop santong-api    # 停止應用
pm2 monit               # 監控面板
```

### Nginx 管理

```bash
sudo nginx -t                    # 測試配置
sudo systemctl reload nginx      # 重載配置
sudo systemctl restart nginx     # 重啟服務
sudo tail -f /var/log/nginx/santong_error.log  # 查看錯誤日誌
```

### 數據庫管理

```bash
# 進入 PostgreSQL
sudo -u postgres psql santong_db

# 備份數據庫
pg_dump -U santong santong_db > backup_$(date +%Y%m%d).sql

# 恢復數據庫
psql -U santong santong_db < backup_20260121.sql
```

---

## 🌐 DNS 配置

在域名註冊商後台添加以下 DNS 記錄:

| 類型 | 主機記錄 | 記錄值 |
|------|----------|--------|
| A | @ | 43.128.1.14 |
| A | www | 43.128.1.14 |

---

## 📁 目錄結構

```
/var/www/santong/
├── api/                    # 後端 API
│   ├── dist/               # 編譯後的代碼
│   ├── node_modules/       # 依賴
│   ├── package.json
│   └── .env                # 環境配置
├── web/                    # 前端靜態文件
│   ├── index.html
│   └── assets/
└── ecosystem.config.js     # PM2 配置
```

---

## ⚠️ 安全建議

1. **修改數據庫密碼**: 編輯 `/var/www/santong/api/.env` 中的 `DATABASE_URL`
2. **修改 JWT Secret**: 編輯 `.env` 中的 `JWT_SECRET`
3. **配置防火牆**: `ufw status` 檢查防火牆規則
4. **定期備份**: 設置 crontab 定時備份數據庫
5. **監控告警**: 使用 PM2 Plus 或其他監控服務

---

## 📞 快速故障排查

| 問題 | 檢查命令 |
|------|----------|
| 網站無法訪問 | `systemctl status nginx` |
| API 返回 502 | `pm2 status` 和 `pm2 logs` |
| 數據庫連接失敗 | `systemctl status postgresql` |
| SSL 證書過期 | `sudo certbot renew` |

---

**部署完成後訪問**: https://santonglogistic.com
