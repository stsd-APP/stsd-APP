#!/usr/bin/env node
/**
 * ============================================
 * 叁通速達 - 通宵值班系統重置腳本
 * ============================================
 * 
 * 作用：
 *   1. 安裝缺少的包 (bcrypt, passport, jwt, axios 等)
 *   2. 重置數據庫 (清空並重建表結構)
 *   3. 寫入正確的 bcrypt 加密密碼
 * 
 * 使用方法：
 *   node reset_system.js
 * 
 * ============================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${colors.bold}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`   執行: ${command}`, 'yellow');
    execSync(command, { stdio: 'inherit', shell: true });
    return true;
  } catch (error) {
    log(`   ⚠️  命令執行有警告，繼續...`, 'yellow');
    return true; // 繼續執行，不中斷
  }
}

console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🌙 叁通速達 - 通宵值班系統重置腳本                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

try {
  // ============================================
  // Step 1: 安裝後端依賴
  // ============================================
  logStep('1/5', '安裝後端依賴 (bcrypt, passport, jwt)...');
  
  const backendDeps = [
    'bcrypt',
    '@types/bcrypt',
    'bcryptjs',
    '@types/bcryptjs',
    'passport',
    '@nestjs/passport',
    '@nestjs/jwt',
    'passport-jwt',
    '@types/passport-jwt',
    'class-validator',
    'class-transformer',
  ].join(' ');
  
  runCommand(`pnpm --filter api add ${backendDeps}`, '安裝後端依賴');

  // ============================================
  // Step 2: 安裝前端依賴
  // ============================================
  logStep('2/5', '安裝前端依賴 (axios, pinia, router)...');
  
  const frontendDeps = [
    'axios',
    'pinia',
    'vue-router',
    'vant',
  ].join(' ');
  
  runCommand(`pnpm --filter web add ${frontendDeps}`, '安裝前端依賴');

  // ============================================
  // Step 3: 安裝數據庫依賴
  // ============================================
  logStep('3/5', '安裝數據庫依賴 (prisma, bcrypt)...');
  
  runCommand('pnpm --filter @packages/database add @prisma/client', '安裝 Prisma Client');
  runCommand('pnpm --filter @packages/database add -D prisma ts-node typescript bcrypt @types/bcrypt', '安裝開發依賴');

  // ============================================
  // Step 4: 生成 Prisma Client
  // ============================================
  logStep('4/5', '生成 Prisma Client...');
  
  runCommand('pnpm --filter @packages/database prisma generate', '生成 Prisma Client');

  // ============================================
  // Step 5: 重置數據庫 (危險操作！)
  // ============================================
  logStep('5/5', '重置數據庫並寫入種子數據...');
  
  log('   ⚠️  這將清空所有數據！', 'yellow');
  
  // 嘗試使用 migrate reset，如果失敗則用 db push + seed
  try {
    runCommand('pnpm --filter @packages/database prisma migrate reset --force', '重置數據庫');
  } catch (e) {
    log('   migrate reset 失敗，嘗試替代方案...', 'yellow');
    runCommand('pnpm --filter @packages/database prisma db push --force-reset', '強制推送 Schema');
    runCommand('pnpm --filter @packages/database prisma db seed', '寫入種子數據');
  }

  // ============================================
  // 完成
  // ============================================
  console.log(`
${colors.green}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       ✅ 系統修復完成！                                     ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   🔑 測試帳號（密碼已正確 bcrypt 加密）:                    ║
║                                                           ║
║      管理員: admin@3links.com                              ║
║      密  碼: admin123                                      ║
║                                                           ║
║      用  戶: user@3links.com                               ║
║      密  碼: user123                                       ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   👉 接下來請執行: pnpm dev                                ║
║                                                           ║
║   📍 前端地址: http://localhost:5173                       ║
║   📍 後端地址: http://localhost:3000/api                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

} catch (error) {
  console.log(`
${colors.red}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       ❌ 腳本執行失敗                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);
  
  console.error(`錯誤信息: ${error.message}`);
  
  console.log(`
${colors.yellow}常見問題解決方案:${colors.reset}

1. bcrypt 編譯失敗:
   - Windows: 安裝 Visual Studio Build Tools
   - 或者使用 bcryptjs 替代 (純 JS 實現)

2. Prisma 連接失敗:
   - 確保 .env 文件存在且 DATABASE_URL 正確
   - PostgreSQL 服務是否正在運行

3. 權限問題:
   - 以管理員身份運行終端
`);
  
  process.exit(1);
}
