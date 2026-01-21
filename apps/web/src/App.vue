
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
