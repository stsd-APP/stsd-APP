<script setup lang="ts">
// ============================================
// 基礎佈局 - 用戶端
// ============================================
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const active = ref(0)

function onTabChange(index: number) {
  const routes = ['/', '/orders', '/admin']
  if (index === 2 && !authStore.isAdmin) {
    // 非管理員跳轉到個人中心
    router.push('/')
    return
  }
  router.push(routes[index])
}
</script>

<template>
  <div class="basic-layout">
    <main class="layout-content">
      <slot />
    </main>
    
    <van-tabbar v-model="active" @change="onTabChange" active-color="#1989fa">
      <van-tabbar-item icon="home-o">首頁</van-tabbar-item>
      <van-tabbar-item icon="orders-o">訂單</van-tabbar-item>
      <van-tabbar-item v-if="authStore.isAdmin" icon="setting-o">管理</van-tabbar-item>
      <van-tabbar-item v-else icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
  padding-bottom: 60px;
}

.layout-content {
  min-height: calc(100vh - 60px);
}
</style>
