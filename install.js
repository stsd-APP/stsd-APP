/**
 * 叁通速达 (Three Links Express) - 项目初始化脚本
 * 运行方式: node install.js
 */
const fs = require('fs');
const path = require('path');

// 1. 定义项目文件结构
const structure = {
  // 根目录配置
  'package.json': JSON.stringify({
    "name": "three-links-platform",
    "private": true,
    "packageManager": "pnpm@8.15.0",
    "scripts": {
      "build": "turbo run build",
      "dev": "turbo run dev",
      "lint": "turbo run lint",
      "db:push": "pnpm --filter @packages/database db:push"
    },
    "devDependencies": {
      "turbo": "^1.12.0",
      "typescript": "^5.3.0",
      "prettier": "^3.2.0"
    },
    "engines": { "node": ">=20.0.0" }
  }, null, 2),

  'pnpm-workspace.yaml': `packages:\n  - 'apps/*'\n  - 'packages/*'`,

  'turbo.json': JSON.stringify({
    "$schema": "https://turbo.build/schema.json",
    "pipeline": {
      "build": { "outputs": ["dist/**"], "dependsOn": ["^build"] },
      "dev": { "cache": false, "persistent": true }
    }
  }, null, 2),

  '.gitignore': `node_modules\ndist\n.env\n.DS_Store\n`,

  // 开发手册 (你的全栈文档)
  'README.md': `# 叁通速达 (Three Links Express) - 全栈开发手册 v1.0

## 1. 项目愿景
打造集**跨境物流（集运/搬家）**与**家具电商**于一体的综合服务平台。

## 2. 核心架构
本项目采用 Monorepo 架构。
- **Apps**: 
  - \`apps/web\`: 客户端 H5
  - \`apps/admin\`: 管理后台
  - \`apps/api\`: NestJS 后端
- **Packages**:
  - \`packages/database\`: Prisma 模型
  - \`packages/ui\`: 共享组件库

## 3. 快速开始
1. 安装依赖: \`pnpm install\`
2. 启动服务: \`pnpm dev\`
`,

  // 目录与占位文件
  'apps/web/package.json': JSON.stringify({ name: "web", version: "0.0.0", scripts: { "dev": "vite" } }, null, 2),
  'apps/web/README.md': '# 客户端 H5 项目',
  
  'apps/admin/package.json': JSON.stringify({ name: "admin", version: "0.0.0" }, null, 2),
  
  'apps/api/package.json': JSON.stringify({ name: "api", version: "0.0.0" }, null, 2),
  'apps/api/.env.example': 'DATABASE_URL="postgresql://..."',

  'packages/ui/package.json': JSON.stringify({ name: "@packages/ui", main: "index.ts" }, null, 2),
  
  'packages/database/package.json': JSON.stringify({ name: "@packages/database", main: "index.ts" }, null, 2),
  'packages/database/schema.prisma': `// Prisma Database Schema
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}
`
};

// 2. 执行文件写入
console.log('🚀 正在初始化叁通速达 (Three Links) 项目结构...');

try {
  Object.keys(structure).forEach(fileName => {
    const filePath = path.join(__dirname, fileName);
    const dirName = path.dirname(filePath);

    // 递归创建文件夹
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(filePath, structure[fileName]);
    console.log(`✅ 已创建: ${fileName}`);
  });

  console.log('\n✨ 项目结构生成完毕！');
  console.log('-------------------------------------------');
  console.log('下一步操作：');
  console.log('1. 打开终端运行: pnpm install');
  console.log('2. 推送到 GitHub:');
  console.log('   git init');
  console.log('   git add .');
  console.log('   git commit -m "feat: init project structure"');
  console.log('   git branch -M main');
  console.log('   git remote add origin https://github.com/stsd-APP/h5-expense-tracker.git');
  console.log('   git push -u origin main');
  console.log('-------------------------------------------');

} catch (err) {
  console.error('❌ 发生错误:', err);
}