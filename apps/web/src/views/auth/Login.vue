<script setup lang="ts">
// ============================================
// 登錄頁面
// ============================================
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
})
const loading = ref(false)

// 快速填充演示帳號
function fillDemo(type: 'admin' | 'user') {
  if (type === 'admin') {
    form.value.email = 'admin@3links.com'
    form.value.password = 'admin123'
  } else {
    form.value.email = 'user@3links.com'
    form.value.password = 'user123'
  }
}

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    showToast({ type: 'fail', message: '請填寫完整資訊' })
    return
  }

  loading.value = true
  
  try {
    const result = await authStore.login(form.value.email, form.value.password)
    
    if (result.success) {
      showToast({ type: 'success', message: '登錄成功' })
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    } else {
      showToast({ type: 'fail', message: result.message || '登錄失敗' })
    }
  } catch (error: any) {
    console.error('登錄錯誤:', error)
    showToast({ type: 'fail', message: '登錄失敗，請稍後再試' })
  } finally {
    loading.value = false
  }
}

function goRegister() {
  router.push('/register')
}
</script>

<template>
  <div class="login-page">
    <!-- 頂部裝飾 -->
    <div class="header-bg">
      <div class="brand-area">
        <div class="logo">
          <div class="i-carbon-delivery text-4xl"></div>
        </div>
        <h1 class="brand-name">叁通速達</h1>
        <p class="brand-slogan">您專業的跨境物流管家</p>
      </div>
    </div>

    <!-- 登錄卡片 -->
    <div class="login-card">
      <h2 class="card-title">歡迎回來</h2>
      
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="form.email"
            name="email"
            label="郵箱"
            placeholder="請輸入郵箱"
            :rules="[{ required: true, message: '請輸入郵箱' }]"
            clearable
            :disabled="loading"
          >
            <template #left-icon>
              <div class="i-carbon-email text-lg text-gray-400"></div>
            </template>
          </van-field>
          
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密碼"
            placeholder="請輸入密碼"
            :rules="[{ required: true, message: '請輸入密碼' }]"
            :disabled="loading"
          >
            <template #left-icon>
              <div class="i-carbon-locked text-lg text-gray-400"></div>
            </template>
          </van-field>
        </van-cell-group>

        <div class="px-4 mt-6">
          <van-button 
            block 
            type="primary" 
            native-type="submit"
            :loading="loading"
            :disabled="loading"
            color="#1989fa"
            size="large"
          >
            {{ loading ? '登錄中...' : '登 錄' }}
          </van-button>
        </div>
      </van-form>

      <div class="register-link">
        還沒有帳號？
        <span class="link" @click="goRegister">立即註冊</span>
      </div>

      <!-- 演示帳號提示 -->
      <div class="demo-hint">
        <van-divider>快速登錄</van-divider>
        <div class="demo-accounts">
          <div class="demo-item" @click="fillDemo('admin')">
            <div class="demo-icon admin">
              <div class="i-carbon-user-admin"></div>
            </div>
            <div class="demo-info">
              <span class="demo-role">管理員</span>
              <span class="demo-email">admin@3links.com</span>
            </div>
            <div class="demo-arrow">
              <div class="i-carbon-chevron-right"></div>
            </div>
          </div>
          <div class="demo-item" @click="fillDemo('user')">
            <div class="demo-icon user">
              <div class="i-carbon-user"></div>
            </div>
            <div class="demo-info">
              <span class="demo-role">測試用戶</span>
              <span class="demo-email">user@3links.com</span>
            </div>
            <div class="demo-arrow">
              <div class="i-carbon-chevron-right"></div>
            </div>
          </div>
        </div>
        <p class="demo-tip">點擊上方卡片可快速填入帳號密碼</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1989fa 0%, #e6f4ff 50%, #f5f5f5 100%);
}

.header-bg {
  padding: 60px 20px 80px;
  text-align: center;
}

.brand-area {
  color: white;
}

.logo {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  backdrop-filter: blur(10px);
}

.brand-name {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}

.brand-slogan {
  font-size: 14px;
  opacity: 0.9;
}

.login-card {
  background: white;
  margin: -40px 16px 0;
  border-radius: 16px;
  padding: 24px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card-title {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 24px;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.register-link .link {
  color: #1989fa;
  cursor: pointer;
}

/* 演示帳號 */
.demo-hint {
  margin: 20px 16px 0;
  padding: 0 0 8px;
}

.demo-accounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f8f8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-item:active {
  background: #f0f0f0;
  transform: scale(0.98);
}

.demo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.demo-icon.admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.demo-icon.user {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.demo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.demo-role {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.demo-email {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.demo-arrow {
  color: #ccc;
}

.demo-tip {
  text-align: center;
  font-size: 11px;
  color: #bbb;
  margin-top: 12px;
}
</style>
