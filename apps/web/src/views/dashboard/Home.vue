<script setup lang="ts">
// ============================================
// 用戶首頁 - 智能儀表盤
// ============================================
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { useRateStore } from '../../stores/rate'
import { orderApi } from '../../api/order'

const router = useRouter()
const authStore = useAuthStore()
const rateStore = useRateStore()

// ============================================
// 狀態變量
// ============================================
const showPaymentForm = ref(false)
const recentOrders = ref<any[]>([])
const stats = ref({
  totalOrders: 0,
  pendingOrders: 0,
  totalAmount: 0,
})
const loading = ref(false)
const refreshing = ref(false)

// 代付表單
const orderForm = ref({
  taobaoUrl: '',
  rmbAmount: '',
  remark: '',
})
const submitting = ref(false)

// ============================================
// 計算屬性
// ============================================

// 問候語
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早安'
  if (hour < 14) return '午安'
  if (hour < 18) return '下午好'
  return '晚安'
})

// 自動計算台幣金額
const twdAmount = computed(() => {
  const rmb = parseFloat(orderForm.value.rmbAmount)
  if (isNaN(rmb) || rmb <= 0) return 0
  return Math.round(rmb * rateStore.rate * 100) / 100
})

// 狀態配置
const statusConfig: Record<string, { text: string; color: string; bgColor: string }> = {
  PENDING: { text: '待審核', color: '#ff976a', bgColor: '#fff7e6' },
  PAID: { text: '已付款', color: '#1989fa', bgColor: '#e6f4ff' },
  COMPLETED: { text: '已完成', color: '#07c160', bgColor: '#e6fff0' },
  REJECTED: { text: '已駁回', color: '#ee0a24', bgColor: '#fff0f0' },
}

// ============================================
// API 調用
// ============================================

// 獲取統計數據
async function fetchStats() {
  try {
    const res = await orderApi.getStats()
    if (res.data.success) {
      stats.value = res.data.data
    }
  } catch (error) {
    console.error('獲取統計失敗:', error)
  }
}

// 獲取最近訂單
async function fetchRecentOrders() {
  loading.value = true
  try {
    const res = await orderApi.getMyOrders({ page: 1, limit: 5 })
    if (res.data.success) {
      recentOrders.value = res.data.data.orders
    }
  } catch (error) {
    console.error('獲取訂單失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 刷新所有數據
async function refresh() {
  refreshing.value = true
  await Promise.all([
    rateStore.fetchRate(),
    fetchStats(),
    fetchRecentOrders(),
  ])
  refreshing.value = false
}

// ============================================
// 代付申請
// ============================================
function openPaymentForm() {
  // 打開前先刷新匯率
  rateStore.fetchRate()
  showPaymentForm.value = true
}

function resetForm() {
  orderForm.value = {
    taobaoUrl: '',
    rmbAmount: '',
    remark: '',
  }
}

async function submitOrder() {
  // 表單驗證
  if (!orderForm.value.taobaoUrl.trim()) {
    showToast({ type: 'fail', message: '請輸入商品連結' })
    return
  }

  const rmbAmount = parseFloat(orderForm.value.rmbAmount)
  if (isNaN(rmbAmount) || rmbAmount <= 0) {
    showToast({ type: 'fail', message: '請輸入有效的金額' })
    return
  }

  if (rmbAmount > 100000) {
    showToast({ type: 'fail', message: '單筆金額不能超過 ¥100,000' })
    return
  }

  submitting.value = true

  try {
    const res = await orderApi.create({
      taobaoUrl: orderForm.value.taobaoUrl.trim(),
      rmbAmount,
      remark: orderForm.value.remark,
    })

    if (res.data.success) {
      showToast({ 
        type: 'success', 
        message: `✅ 申請已提交！\n需支付 NT$ ${twdAmount.value.toLocaleString()}`,
        duration: 3000,
      })
      showPaymentForm.value = false
      resetForm()
      // 刷新數據
      await refresh()
    }
  } catch (error: any) {
    console.error('提交失敗:', error)
  } finally {
    submitting.value = false
  }
}

// ============================================
// 登出
// ============================================
function handleLogout() {
  showDialog({
    title: '確認登出',
    message: '確定要登出嗎？',
    showCancelButton: true,
  }).then(() => {
    authStore.logout()
    router.push('/login')
    showToast('已登出')
  }).catch(() => {})
}

// ============================================
// 格式化
// ============================================
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return url.substring(0, 20) + '...'
  }
}

// ============================================
// 生命週期
// ============================================
onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="home-page">
    <!-- ============================================ -->
    <!-- 頂部歡迎區 -->
    <!-- ============================================ -->
    <div class="header-section">
      <div class="header-content">
        <div class="user-info">
          <div class="greeting">{{ greeting }}，{{ authStore.userName }}</div>
          <div class="subtitle">歡迎使用叁通速達</div>
        </div>
        <div class="header-actions">
          <div class="action-btn" @click="handleLogout">
            <div class="i-carbon-logout text-xl"></div>
          </div>
        </div>
      </div>
      
      <!-- 匯率卡片 -->
      <div class="rate-card" @click="rateStore.fetchRate()">
        <div class="rate-icon">
          <div class="i-carbon-currency-dollar text-2xl"></div>
        </div>
        <div class="rate-info">
          <span class="rate-label">今日匯率</span>
          <span class="rate-value">1 RMB = {{ rateStore.rate }} TWD</span>
        </div>
        <div class="rate-refresh" :class="{ spinning: rateStore.loading }">
          <div class="i-carbon-renew"></div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 統計區域 -->
    <!-- ============================================ -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon blue">
          <div class="i-carbon-document"></div>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">總訂單</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">
          <div class="i-carbon-pending"></div>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingOrders }}</div>
          <div class="stat-label">待處理</div>
        </div>
      </div>
      <div class="stat-card wide">
        <div class="stat-icon green">
          <div class="i-carbon-wallet"></div>
        </div>
        <div class="stat-content">
          <div class="stat-value">NT$ {{ stats.totalAmount.toLocaleString() }}</div>
          <div class="stat-label">交易總額</div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 快速操作按鈕 -->
    <!-- ============================================ -->
    <div class="action-section">
      <van-button 
        type="primary" 
        block 
        size="large"
        color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        @click="openPaymentForm"
      >
        <div class="action-btn-content">
          <div class="i-carbon-add-alt text-xl mr-2"></div>
          新增代付申請
        </div>
      </van-button>
    </div>

    <!-- ============================================ -->
    <!-- 最近訂單列表 -->
    <!-- ============================================ -->
    <div class="orders-section">
      <div class="section-header">
        <h3>最近申請</h3>
        <span class="view-all" @click="router.push('/orders')">
          查看全部
          <div class="i-carbon-chevron-right"></div>
        </span>
      </div>
      
      <van-pull-refresh v-model="refreshing" @refresh="refresh">
        <div v-if="loading && !refreshing" class="loading-state">
          <van-loading size="24px">載入中...</van-loading>
        </div>
        
        <div v-else-if="recentOrders.length === 0" class="empty-state">
          <van-empty description="暫無訂單記錄" />
          <van-button type="primary" size="small" @click="openPaymentForm">
            立即申請
          </van-button>
        </div>
        
        <div v-else class="orders-list">
          <div 
            v-for="order in recentOrders" 
            :key="order.id" 
            class="order-card"
            :style="{ borderLeftColor: statusConfig[order.status]?.color }"
          >
            <div class="order-header">
              <span class="order-id">#{{ order.id.slice(-8) }}</span>
              <van-tag 
                :color="statusConfig[order.status]?.bgColor"
                :text-color="statusConfig[order.status]?.color"
                size="medium"
              >
                {{ statusConfig[order.status]?.text }}
              </van-tag>
            </div>
            
            <div class="order-body">
              <div class="order-url">
                <div class="i-carbon-link text-gray-400"></div>
                {{ shortUrl(order.taobaoUrl) }}
              </div>
              
              <div class="order-amounts">
                <span class="rmb">¥ {{ order.rmbAmount.toFixed(2) }}</span>
                <span class="arrow">→</span>
                <span class="twd">NT$ {{ order.twdAmount.toFixed(2) }}</span>
              </div>
            </div>
            
            <div class="order-footer">
              <span class="order-time">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
        </div>
      </van-pull-refresh>
    </div>

    <!-- ============================================ -->
    <!-- 代付申請彈窗 -->
    <!-- ============================================ -->
    <van-popup 
      v-model:show="showPaymentForm" 
      position="bottom" 
      round 
      :style="{ height: '70%' }"
      closeable
      close-icon-position="top-right"
    >
      <div class="payment-form">
        <h3 class="form-title">代付申請</h3>
        
        <!-- 匯率提示 -->
        <div class="rate-hint">
          <div class="i-carbon-information mr-1"></div>
          預估匯率：<strong>{{ rateStore.rate }}</strong> (1 RMB = {{ rateStore.rate }} TWD)
        </div>
        
        <van-form @submit="submitOrder">
          <van-cell-group inset>
            <van-field
              v-model="orderForm.taobaoUrl"
              label="商品連結"
              placeholder="請貼上淘寶/1688連結"
              required
              clearable
              :disabled="submitting"
            >
              <template #left-icon>
                <div class="i-carbon-link text-lg text-gray-400"></div>
              </template>
            </van-field>
            
            <van-field
              v-model="orderForm.rmbAmount"
              type="number"
              label="淘寶金額"
              placeholder="輸入人民幣金額"
              required
              :disabled="submitting"
            >
              <template #left-icon>
                <div class="i-carbon-currency-yen text-lg text-red-400"></div>
              </template>
              <template #extra>
                <span class="text-gray-400">¥</span>
              </template>
            </van-field>
            
            <!-- 自動計算的台幣金額 -->
            <van-field
              :model-value="twdAmount > 0 ? `NT$ ${twdAmount.toLocaleString()}` : ''"
              label="需支付台幣"
              placeholder="自動換算"
              readonly
            >
              <template #left-icon>
                <div class="i-carbon-currency-dollar text-lg text-blue-400"></div>
              </template>
            </van-field>
            
            <van-field
              v-model="orderForm.remark"
              type="textarea"
              label="備註"
              placeholder="選填，如有特殊要求請備註"
              rows="2"
              autosize
              :disabled="submitting"
            />
          </van-cell-group>

          <!-- 金額預覽 -->
          <div class="amount-preview" v-if="twdAmount > 0">
            <div class="preview-row">
              <span>商品金額</span>
              <span class="rmb">¥ {{ parseFloat(orderForm.rmbAmount).toFixed(2) }}</span>
            </div>
            <div class="preview-row">
              <span>換算匯率</span>
              <span>× {{ rateStore.rate }}</span>
            </div>
            <div class="preview-row total">
              <span>需支付台幣</span>
              <span class="twd">NT$ {{ twdAmount.toLocaleString() }}</span>
            </div>
          </div>

          <div class="form-actions">
            <van-button 
              block 
              type="primary" 
              native-type="submit"
              :loading="submitting"
              :disabled="submitting"
              color="#667eea"
              size="large"
            >
              {{ submitting ? '提交中...' : '提交申請' }}
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar v-model:active="0" active-color="#1989fa" fixed>
      <van-tabbar-item icon="home-o" @click="router.push('/')">首頁</van-tabbar-item>
      <van-tabbar-item icon="orders-o" @click="router.push('/orders')">訂單</van-tabbar-item>
      <van-tabbar-item v-if="authStore.isAdmin" icon="setting-o" @click="router.push('/admin')">管理</van-tabbar-item>
      <van-tabbar-item v-else icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* ============================================ */
/* 頂部區域 */
/* ============================================ */
.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 16px 24px;
  border-radius: 0 0 24px 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: white;
  margin-bottom: 20px;
}

.greeting {
  font-size: 24px;
  font-weight: bold;
}

.subtitle {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

.action-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

/* 匯率卡片 */
.rate-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
}

.rate-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rate-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rate-label {
  font-size: 12px;
  opacity: 0.8;
}

.rate-value {
  font-size: 18px;
  font-weight: bold;
  margin-top: 2px;
}

.rate-refresh {
  opacity: 0.6;
  transition: transform 0.3s;
}

.rate-refresh.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================ */
/* 統計區域 */
/* ============================================ */
.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  margin-top: -10px;
}

.stat-card {
  background: white;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card.wide {
  grid-column: span 2;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.blue {
  background: #e6f4ff;
  color: #1989fa;
}

.stat-icon.orange {
  background: #fff7e6;
  color: #ff976a;
}

.stat-icon.green {
  background: #e6fff0;
  color: #07c160;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* ============================================ */
/* 操作按鈕 */
/* ============================================ */
.action-section {
  padding: 0 16px;
  margin-bottom: 20px;
}

.action-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
}

/* ============================================ */
/* 訂單列表 */
/* ============================================ */
.orders-section {
  padding: 0 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.view-all {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #1989fa;
  cursor: pointer;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #ccc;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.order-body {
  margin-bottom: 12px;
}

.order-url {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.order-amounts {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.order-amounts .rmb {
  color: #ee0a24;
}

.order-amounts .arrow {
  color: #ccc;
}

.order-amounts .twd {
  color: #1989fa;
}

.order-footer {
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.order-time {
  font-size: 12px;
  color: #999;
}

.loading-state,
.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* ============================================ */
/* 代付表單彈窗 */
/* ============================================ */
.payment-form {
  padding: 24px 0;
}

.form-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 16px;
}

.rate-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #666;
  background: #f0f9ff;
  padding: 10px;
  margin: 0 16px 16px;
  border-radius: 8px;
}

.rate-hint strong {
  color: #1989fa;
  margin: 0 2px;
}

.amount-preview {
  margin: 16px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.preview-row.total {
  border-top: 1px dashed #ddd;
  margin-top: 8px;
  padding-top: 16px;
  font-weight: bold;
  font-size: 16px;
}

.preview-row .rmb {
  color: #ee0a24;
}

.preview-row .twd {
  color: #1989fa;
  font-size: 18px;
}

.form-actions {
  padding: 16px;
}
</style>
