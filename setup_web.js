/**
 * 叁通速达 - 前端页面快速生成脚本
 * 作用：填充 apps/web 的代码，配置 Vue3 + Vant + UnoCSS
 */
const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, 'apps/web');
const srcDir = path.join(webRoot, 'src');

// 1. 定义要生成的文件内容
const files = {
  // === 配置文件 ===
  'package.json': JSON.stringify({
    "name": "web",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "vite",
      "build": "vue-tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "vue": "^3.4.0",
      "vant": "^4.8.0",
      "vue-router": "^4.2.0",
      "pinia": "^2.1.0"
    },
    "devDependencies": {
      "@vitejs/plugin-vue": "^5.0.0",
      "typescript": "^5.3.0",
      "vite": "^5.0.0",
      "vue-tsc": "^1.8.0",
      "unocss": "^0.58.0",
      "@iconify-json/carbon": "^1.1.0"
    }
  }, null, 2),

  'vite.config.ts': `
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  server: {
    port: 5173,
    host: true
  }
})
`,

  'uno.config.ts': `
import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.2 })
  ],
  theme: {
    colors: {
      brand: '#1989fa', // 叁通速达蓝
      accent: '#ff976a', // 活力橙
    }
  }
})
`,

  // === 页面入口 ===
  'index.html': `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>叁通速达 H5</title>
  </head>
  <body class="bg-gray-50">
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,

  'src/main.ts': `
import { createApp } from 'vue'
import 'virtual:uno.css'
import 'vant/lib/index.css'
import { Tabbar, TabbarItem, Button, Card, Tag, Icon } from 'vant'
import App from './App.vue'

const app = createApp(App)
// 注册常用组件
app.use(Tabbar).use(TabbarItem).use(Button).use(Card).use(Tag).use(Icon)
app.mount('#app')
`,

  // === 首页 UI (核心业务展示) ===
  'src/App.vue': `
<script setup lang="ts">
import { ref } from 'vue'

const active = ref(0)
const packages = ref([
  { id: 'PKG001', name: '宜家沙发三件套', status: '待入库', date: '2024-01-21' },
  { id: 'PKG002', name: '淘宝集运包裹', status: '运输中', date: '2024-01-20' }
])
</script>

<template>
  <div class="pb-20">
    <div class="bg-brand text-white p-4 pt-12 rounded-b-xl shadow-lg relative overflow-hidden">
      <div class="relative z-10 flex justify-between items-center">
        <div>
          <h1 class="text-xl font-bold">叁通速达</h1>
          <p class="text-xs opacity-80 mt-1">您专业的跨境物流管家</p>
        </div>
        <div class="bg-white/20 p-2 rounded-full backdrop-blur-sm">
          <div class="i-carbon-notification text-xl"></div>
        </div>
      </div>
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
    </div>

    <div class="grid grid-cols-4 gap-2 p-4 -mt-6">
      <div class="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center gap-2" v-for="item in ['集运预报', '包裹查询', '运费估算', '地址管理']" :key="item">
        <div class="bg-blue-50 text-brand p-2 rounded-full text-xl">
           <div class="i-carbon-delivery" v-if="item==='集运预报'"></div>
           <div class="i-carbon-search" v-if="item==='包裹查询'"></div>
           <div class="i-carbon-calculator" v-if="item==='运费估算'"></div>
           <div class="i-carbon-map" v-if="item==='地址管理'"></div>
        </div>
        <span class="text-xs text-gray-600">{{ item }}</span>
      </div>
    </div>

    <div class="px-4 mt-2">
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-gray-800">最新包裹动态</h2>
        <span class="text-xs text-brand">查看全部 ></span>
      </div>
      
      <div v-for="pkg in packages" :key="pkg.id" class="bg-white p-4 rounded-xl shadow-sm mb-3 border-l-4 border-brand flex justify-between items-center">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-800">{{ pkg.name }}</span>
            <van-tag type="primary" plain size="medium">{{ pkg.status }}</van-tag>
          </div>
          <p class="text-xs text-gray-400 mt-1">单号: {{ pkg.id }} | 更新: {{ pkg.date }}</p>
        </div>
        <div class="i-carbon-chevron-right text-gray-300"></div>
      </div>
    </div>

    <div class="px-4 mt-4">
      <h2 class="font-bold text-gray-800 mb-2">优选商城 <span class="text-xs font-normal text-red-500 bg-red-50 px-1 rounded ml-1">HOT</span></h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-lg overflow-hidden shadow-sm">
          <div class="h-24 bg-gray-200 w-full relative">
             <div class="absolute inset-0 flex items-center justify-center text-gray-400">商品图</div>
          </div>
          <div class="p-2">
            <p class="text-sm truncate">北欧简约实木餐桌椅组合</p>
            <div class="flex justify-between items-end mt-2">
              <span class="text-red-600 font-bold text-sm">¥899</span>
              <span class="text-xs text-gray-400">已售 200+</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-sm">
           <div class="h-24 bg-gray-200 w-full relative">
             <div class="absolute inset-0 flex items-center justify-center text-gray-400">商品图</div>
          </div>
          <div class="p-2">
            <p class="text-sm truncate">轻奢岩板茶几客厅家用</p>
            <div class="flex justify-between items-end mt-2">
              <span class="text-red-600 font-bold text-sm">¥450</span>
              <span class="text-xs text-gray-400">免运费</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-tabbar v-model="active" active-color="#1989fa">
      <van-tabbar-item icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item icon="logistics">集运</van-tabbar-item>
      <van-tabbar-item icon="bag-o">商城</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style>
/* 简单的重置样式 */
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif; }
</style>
`
};

// 2. 执行写入
console.log('🚀 正在配置前端环境 & 生成页面...');

try {
  // 确保 src 目录存在
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  Object.keys(files).forEach(fileName => {
    const filePath = path.join(webRoot, fileName);
    fs.writeFileSync(filePath, files[fileName]);
    console.log(`✅ 已更新: ${fileName}`);
  });

  console.log('\n✨ 页面代码已就绪！');
  console.log('-------------------------------------------');
  console.log('请务必执行以下两步来启动项目：');
  console.log('1. 安装新添加的依赖 (Vite, Vue, Vant...)');
  console.log('   pnpm install');
  console.log('');
  console.log('2. 再次尝试启动');
  console.log('   pnpm dev');
  console.log('-------------------------------------------');

} catch (err) {
  console.error('❌ 发生错误:', err);
}