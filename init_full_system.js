#!/usr/bin/env node
// ============================================
// 叁通速達 - 一鍵初始化系統腳本
// ============================================
// 
// 使用方法:
//   node init_full_system.js
//
// 此腳本會自動執行:
//   1. 安裝所有依賴
//   2. 生成 Prisma Client
//   3. 推送數據庫結構
//   4. 寫入初始數據
//
// ============================================

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

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function runCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd,
      shell: true
    });
    return true;
  } catch (error) {
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    logWarning('.env 文件不存在，正在創建...');
    
    const envContent = `# 叁通速達 - 環境配置
# =====================================

# 數據庫連接 (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/three_links?schema=public"

# JWT 密鑰 (生產環境請修改)
JWT_SECRET="three-links-super-secret-key-2024"

# API 端口
PORT=3000

# 前端 API 地址
VITE_API_URL="http://localhost:3000/api"
`;
    
    fs.writeFileSync(envPath, envContent);
    logSuccess('.env 文件已創建');
    logWarning('請在繼續之前修改 DATABASE_URL 為您的數據庫連接字符串！');
    return false;
  }
  return true;
}

async function main() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🚀 叁通速達 - 一鍵初始化系統                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Step 0: 檢查環境配置
  logStep('0/5', '檢查環境配置...');
  const envExists = checkEnvFile();
  if (!envExists) {
    logWarning('請配置 .env 文件後重新運行此腳本');
    process.exit(1);
  }
  logSuccess('環境配置檢查完成');

  // Step 1: 安裝依賴
  logStep('1/5', '安裝項目依賴...');
  if (!runCommand('pnpm install')) {
    logError('依賴安裝失敗');
    process.exit(1);
  }
  logSuccess('依賴安裝完成');

  // Step 2: 生成 Prisma Client
  logStep('2/5', '生成 Prisma Client...');
  if (!runCommand('pnpm --filter @packages/database db:generate')) {
    logError('Prisma Client 生成失敗');
    process.exit(1);
  }
  logSuccess('Prisma Client 生成完成');

  // Step 3: 推送數據庫結構
  logStep('3/5', '推送數據庫結構...');
  if (!runCommand('pnpm --filter @packages/database db:push')) {
    logError('數據庫推送失敗，請確認 DATABASE_URL 配置正確');
    process.exit(1);
  }
  logSuccess('數據庫結構推送完成');

  // Step 4: 初始化種子數據
  logStep('4/5', '初始化種子數據...');
  if (!runCommand('pnpm --filter @packages/database db:seed')) {
    logError('種子數據初始化失敗');
    process.exit(1);
  }
  logSuccess('種子數據初始化完成');

  // Step 5: 完成
  logStep('5/5', '系統初始化完成！');

  console.log(`
${colors.green}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🎉 初始化成功！                                      ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   📝 測試帳號:                                             ║
║      管理員: admin@3links.com / admin123                   ║
║      用  戶: user@test.com / user123                       ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   🚀 啟動服務:                                             ║
║      啟動 API:    pnpm --filter api dev                   ║
║      啟動前端:    pnpm --filter web dev                   ║
║      同時啟動:    pnpm dev                                 ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   📍 訪問地址:                                             ║
║      前端: http://localhost:5173                           ║
║      API:  http://localhost:3000/api                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);
}

main().catch((error) => {
  logError(`初始化失敗: ${error.message}`);
  process.exit(1);
});
