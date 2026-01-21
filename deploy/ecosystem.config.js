// ============================================
// PM2 生態系統配置 - SANTONG 叁通速達
// ============================================

module.exports = {
  apps: [
    {
      name: 'santong-api',
      script: './dist/main.js',
      cwd: '/var/www/santong/api',
      instances: 'max',  // 使用所有 CPU 核心
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://santong:SanTong2026@HK@localhost:5432/santong_db',
        JWT_SECRET: 'santong-jwt-secret-2026-production-key',
        JWT_EXPIRES_IN: '7d',
      },
      // 日誌配置
      error_file: '/var/log/pm2/santong-api-error.log',
      out_file: '/var/log/pm2/santong-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 優雅重啟
      kill_timeout: 5000,
      listen_timeout: 10000,
      // 健康檢查
      exp_backoff_restart_delay: 100,
    },
  ],

  // 部署配置 (可選，用於 pm2 deploy)
  deploy: {
    production: {
      user: 'root',
      host: '43.128.1.14',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/santong.git',
      path: '/var/www/santong',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
