<script setup lang="ts">
// ============================================
// 管理員後台 - 主頁 (功能導航)
// ============================================
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { useRateStore } from '../../stores/rate'
import { orderApi } from '../../api/order'
import { packageApi } from '../../api/package'

const router = useRouter()
const authStore = useAuthStore()
const rateStore = useRateStore()

// 權限檢查
onMounted(() => {
  if (!authStore.isAdmin) {
    showToast({ type: 'fail', message: '需要管理員權限' })
    router.push('/dashboard')
    return
  }
  fetchStats()
  rateStore.fetchRate()
})

// 統計數據
const orderStats = ref({ PENDING: 0, PAID: 0, COMPLETED: 0, REJECTED: 0 })
const packageStats = ref({ PREDICTED: 0, IN_WAREHOUSE: 0, PACKED: 0, SHIPPED: 0 })

async function fetchStats() {
  try {
    const [ordersRes, packagesRes] = await Promise.all([
      orderApi.getAllOrders({ limit: 1 }),
      packageApi.getAllPackages({ limit: 1 }),
    ])
    if (ordersRes.data.success && ordersRes.data.data.stats) {
      orderStats.value = ordersRes.data.data.stats
    }
    if (packagesRes.data.success && packagesRes.data.data.stats) {
      packageStats.value = packagesRes.data.data.stats
    }
  } catch (error) {
    console.error('獲取統計失敗:', error)
  }
}

// 匯率管理
const newRate = ref('')
const rateLoading = ref(false)

async function updateRate() {
  const rate = parseFloat(newRate.value)
  if (isNaN(rate) || rate <= 0 || rate > 100) {
    showToast({ type: 'fail', message: '請輸入有效的匯率' })
    return
  }

  try {
    await showConfirmDialog({
      title: '確認更新匯率',
      message: `將匯率更新為 ${rate}？`,
    })

    rateLoading.value = true
    const result = await rateStore.updateRate(rate)
    if (result.success) {
      showToast({ type: 'success', message: '匯率已更新' })
      newRate.value = ''
    }
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  } finally {
    rateLoading.value = false
  }
}

function handleLogout() {
  showConfirmDialog({
    title: '確認登出',
    message: '確定要登出嗎？',
  }).then(() => {
    authStore.logout()
    router.push('/login')
  }).catch(() => {})
}
</script>

<template>
  <div class="admin-home">
    <!-- 導航欄 -->
    <van-nav-bar title="管理後台" fixed placeholder>
      <template #right>
        <van-icon name="setting-o" size="20" @click="handleLogout" />
      </template>
    </van-nav-bar>

    <!-- ============================================ -->
    <!-- 歡迎區 -->
    <!-- ============================================ -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h2>歡迎，{{ authStore.userName }}</h2>
        <p>叁通速達管理後台</p>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 快捷功能 -->
    <!-- ============================================ -->
    <div class="quick-actions">
      <div class="action-card" @click="router.push('/admin/warehouse')">
        <div class="action-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
          <van-icon name="scan" size="28" />
        </div>
        <div class="action-info">
          <span class="action-title">倉庫操作台</span>
          <span class="action-desc">掃碼入庫、包裹管理</span>
        </div>
        <div class="action-badge" v-if="packageStats.PREDICTED > 0">
          {{ packageStats.PREDICTED }}
        </div>
      </div>

      <div class="action-card" @click="router.push('/admin/products')">
        <div class="action-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
          <van-icon name="shop-o" size="28" />
        </div>
        <div class="action-info">
          <span class="action-title">商品管理</span>
          <span class="action-desc">發布商品、物流設置</span>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 統計概覽 -->
    <!-- ============================================ -->
    <div class="stats-section">
      <h3>代付訂單</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num" style="color: #ff976a">{{ orderStats.PENDING }}</span>
          <span class="stat-label">待審核</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #1989fa">{{ orderStats.PAID }}</span>
          <span class="stat-label">已付款</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #07c160">{{ orderStats.COMPLETED }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #ee0a24">{{ orderStats.REJECTED }}</span>
          <span class="stat-label">已駁回</span>
        </div>
      </div>
    </div>

    <div class="stats-section">
      <h3>集運包裹</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num" style="color: #ff976a">{{ packageStats.PREDICTED }}</span>
          <span class="stat-label">待入庫</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #07c160">{{ packageStats.IN_WAREHOUSE }}</span>
          <span class="stat-label">已入庫</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #1989fa">{{ packageStats.PACKED }}</span>
          <span class="stat-label">已打包</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" style="color: #7232dd">{{ packageStats.SHIPPED }}</span>
          <span class="stat-label">已發貨</span>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 匯率設置 -->
    <!-- ============================================ -->
    <div class="rate-section">
      <h3>匯率設置</h3>
      <div class="rate-card">
        <div class="current-rate">
          <span class="rate-label">當前匯率</span>
          <span class="rate-value">{{ rateStore.rate }}</span>
          <span class="rate-unit">TWD/RMB</span>
        </div>
        <van-field
          v-model="newRate"
          type="number"
          placeholder="輸入新匯率"
          :disabled="rateLoading"
        >
          <template #button>
            <van-button type="primary" size="small" :loading="rateLoading" @click="updateRate">
              更新
            </van-button>
          </template>
        </van-field>
        <div class="quick-rates">
          <van-button size="small" plain @click="newRate = '4.3'">4.3</van-button>
          <van-button size="small" plain @click="newRate = '4.5'">4.5</van-button>
          <van-button size="small" plain @click="newRate = '4.6'">4.6</van-button>
          <van-button size="small" plain @click="newRate = '4.8'">4.8</van-button>
          <van-button size="small" plain @click="newRate = '5.0'">5.0</van-button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar active-color="#1989fa" fixed>
      <van-tabbar-item icon="shop-o" @click="router.push('/mall')">商城</van-tabbar-item>
      <van-tabbar-item icon="cart-o" @click="router.push('/dashboard')">代採</van-tabbar-item>
      <van-tabbar-item icon="logistics" @click="router.push('/warehouse')">集運</van-tabbar-item>
      <van-tabbar-item icon="manager-o" :dot="orderStats.PENDING > 0">管理</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.admin-home {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

/* 歡迎區 */
.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 16px;
  color: white;
}

.welcome-text h2 {
  font-size: 20px;
  margin: 0 0 4px;
}

.welcome-text p {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
}

/* 快捷功能 */
.quick-actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.action-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
}

.action-desc {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.action-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ee0a24;
  color: white;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* 統計區 */
.stats-section {
  padding: 0 16px 16px;
}

.stats-section h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-card {
  background: white;
  padding: 12px 8px;
  border-radius: 10px;
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 22px;
  font-weight: bold;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* 匯率設置 */
.rate-section {
  padding: 0 16px 16px;
}

.rate-section h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.rate-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
}

.current-rate {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.current-rate .rate-label {
  font-size: 13px;
  color: #999;
}

.current-rate .rate-value {
  font-size: 32px;
  font-weight: bold;
  color: #1989fa;
}

.current-rate .rate-unit {
  font-size: 12px;
  color: #999;
}

.quick-rates {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
