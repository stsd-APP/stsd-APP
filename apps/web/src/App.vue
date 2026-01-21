<script setup lang="ts">
// ============================================
// 叁通速達 - 根組件
// ============================================
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRateStore } from './stores/rate'

const authStore = useAuthStore()
const rateStore = useRateStore()

onMounted(() => {
  // 初始化認證狀態
  authStore.initAuth()
  
  // 預加載匯率
  rateStore.fetchRate()
})
</script>

<template>
  <router-view />
</template>

<style>
/* 全局樣式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 全局按鈕樣式 */
.van-button--primary {
  font-weight: 500;
}

/* 全局卡片樣式 */
.van-card {
  background: white;
  border-radius: 12px;
}

/* 隱藏滾動條但保留功能 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
