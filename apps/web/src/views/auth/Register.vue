<script setup lang="ts">
// ============================================
// 註冊頁面 (含推薦碼綁定)
// ============================================
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { getStoredRefCode } from '../../router'
import { agentApi } from '../../api/agent'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  refCode: '',
})
const loading = ref(false)
const refAgentName = ref<string | null>(null)
const verifyingRef = ref(false)

// 是否有推薦碼
const hasRefCode = computed(() => !!form.value.refCode)

// 初始化時讀取推薦碼
onMounted(async () => {
  // 優先從 URL 參數獲取
  const urlRef = route.query.ref as string
  if (urlRef) {
    form.value.refCode = urlRef.toUpperCase()
    await verifyRefCode()
    return
  }
  
  // 其次從 localStorage 獲取
  const storedRef = getStoredRefCode()
  if (storedRef) {
    form.value.refCode = storedRef
    await verifyRefCode()
  }
})

// 驗證推薦碼
async function verifyRefCode() {
  if (!form.value.refCode) {
    refAgentName.value = null
    return
  }

  verifyingRef.value = true
  try {
    const res = await agentApi.verifyCode(form.value.refCode)
    if (res.data.success && res.data.data) {
      refAgentName.value = res.data.data.agentName
    } else {
      refAgentName.value = null
    }
  } catch (error) {
    refAgentName.value = null
  } finally {
    verifyingRef.value = false
  }
}

async function handleRegister() {
  if (!form.value.email || !form.value.password) {
    showToast({ type: 'fail', message: '請填寫完整資訊' })
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    showToast({ type: 'fail', message: '兩次密碼輸入不一致' })
    return
  }

  if (form.value.password.length < 6) {
    showToast({ type: 'fail', message: '密碼至少需要 6 個字符' })
    return
  }

  loading.value = true
  const result = await authStore.register(
    form.value.email,
    form.value.password,
    form.value.name,
    form.value.refCode || undefined
  )
  loading.value = false

  if (result.success) {
    // 清除存儲的推薦碼
    localStorage.removeItem('3links_ref_code')
    localStorage.removeItem('3links_ref_code_expiry')
    
    showToast({ type: 'success', message: result.message || '註冊成功' })
    router.push('/')
  } else {
    showToast({ type: 'fail', message: result.message })
  }
}

function goLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="register-page">
    <!-- 頂部裝飾 -->
    <div class="header-bg">
      <div class="brand-area">
        <div class="logo">
          <van-icon name="user-o" size="36" color="white" />
        </div>
        <h1 class="brand-name">創建帳號</h1>
        <p class="brand-slogan">加入叁通速達，開啟跨境之旅</p>
      </div>
    </div>

    <!-- 註冊卡片 -->
    <div class="register-card">
      <!-- 推薦人提示 -->
      <div class="referral-banner" v-if="hasRefCode">
        <div class="referral-icon">🎁</div>
        <div class="referral-info">
          <span class="referral-label">{{ refAgentName ? '推薦人' : '推薦碼' }}</span>
          <span class="referral-value">{{ refAgentName || form.refCode }}</span>
        </div>
        <van-loading v-if="verifyingRef" size="16" />
        <van-icon v-else-if="refAgentName" name="success" color="#07c160" />
      </div>

      <van-form @submit="handleRegister">
        <van-cell-group inset>
          <van-field
            v-model="form.name"
            name="name"
            label="暱稱"
            placeholder="請輸入暱稱（選填）"
            clearable
          >
            <template #left-icon>
              <van-icon name="user-o" color="#999" />
            </template>
          </van-field>
          
          <van-field
            v-model="form.email"
            name="email"
            label="郵箱"
            placeholder="請輸入郵箱"
            :rules="[{ required: true, message: '請輸入郵箱' }]"
            clearable
          >
            <template #left-icon>
              <van-icon name="envelop-o" color="#999" />
            </template>
          </van-field>
          
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密碼"
            placeholder="請輸入密碼（至少6位）"
            :rules="[{ required: true, message: '請輸入密碼' }]"
          >
            <template #left-icon>
              <van-icon name="lock" color="#999" />
            </template>
          </van-field>
          
          <van-field
            v-model="form.confirmPassword"
            type="password"
            name="confirmPassword"
            label="確認密碼"
            placeholder="請再次輸入密碼"
            :rules="[{ required: true, message: '請確認密碼' }]"
          >
            <template #left-icon>
              <van-icon name="passed" color="#999" />
            </template>
          </van-field>

          <!-- 推薦碼輸入 (如果沒有自動填入) -->
          <van-field
            v-if="!hasRefCode"
            v-model="form.refCode"
            name="refCode"
            label="推薦碼"
            placeholder="選填，如有推薦人請填寫"
            clearable
            @blur="verifyRefCode"
          >
            <template #left-icon>
              <van-icon name="coupon-o" color="#999" />
            </template>
            <template #right-icon>
              <van-loading v-if="verifyingRef" size="16" />
              <van-icon v-else-if="refAgentName" name="success" color="#07c160" />
            </template>
          </van-field>
        </van-cell-group>

        <div class="px-4 mt-6">
          <van-button 
            block 
            type="primary" 
            native-type="submit"
            :loading="loading"
            color="linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)"
            size="large"
          >
            註 冊
          </van-button>
        </div>
      </van-form>

      <div class="login-link">
        已有帳號？
        <span class="link" @click="goLogin">立即登錄</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #C0392B 0%, #fbe9e7 50%, #F7F8FA 100%);
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

.register-card {
  background: white;
  margin: -40px 16px 0;
  border-radius: 16px;
  padding: 24px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 推薦人橫幅 */
.referral-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 16px 20px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe4b5 100%);
  border-radius: 12px;
  border: 1px solid #ffe0b2;
}

.referral-icon {
  font-size: 24px;
}

.referral-info {
  flex: 1;
}

.referral-label {
  display: block;
  font-size: 11px;
  color: #999;
}

.referral-value {
  font-size: 15px;
  font-weight: 600;
  color: #C0392B;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.login-link .link {
  color: #C0392B;
  cursor: pointer;
  font-weight: 500;
}
</style>
