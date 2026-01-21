<script setup lang="ts">
// ============================================
// 管理員後台頁面 - 匯率設置 + 訂單審核
// ============================================
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog, showConfirmDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { useRateStore } from '../../stores/rate'
import { orderApi } from '../../api/order'

const router = useRouter()
const authStore = useAuthStore()
const rateStore = useRateStore()

// ============================================
// 狀態變量
// ============================================
const activeTab = ref('orders')
const orders = ref<any[]>([])
const allOrders = ref<any[]>([])
const loading = ref(false)
const refreshing = ref(false)

// 匯率相關
const newRate = ref('')
const rateLoading = ref(false)

// 統計數據
const stats = ref({
  PENDING: 0,
  PAID: 0,
  COMPLETED: 0,
  REJECTED: 0,
})

// 分頁
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
})

// 篩選
const statusFilter = ref('PENDING')

// ============================================
// 狀態配置
// ============================================
const statusConfig: Record<string, { text: string; color: string; type: string; bgColor: string }> = {
  PENDING: { text: '待審核', color: '#ff976a', type: 'warning', bgColor: '#fff7e6' },
  PAID: { text: '已付款', color: '#1989fa', type: 'primary', bgColor: '#e6f4ff' },
  COMPLETED: { text: '已完成', color: '#07c160', type: 'success', bgColor: '#e6fff0' },
  REJECTED: { text: '已駁回', color: '#ee0a24', type: 'danger', bgColor: '#fff0f0' },
}

// ============================================
// 獲取所有訂單
// ============================================
async function fetchOrders() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }
    
    // 如果不是 'all'，則按狀態篩選
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    const res = await orderApi.getAllOrders(params)
    
    if (res.data.success) {
      allOrders.value = res.data.data.orders
      stats.value = res.data.data.stats
      pagination.value.total = res.data.data.pagination.total
      
      // 根據篩選器過濾
      filterOrders()
    }
  } catch (error) {
    console.error('獲取訂單失敗:', error)
    showToast({ type: 'fail', message: '獲取訂單失敗' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 過濾訂單
function filterOrders() {
  if (statusFilter.value === 'all') {
    orders.value = allOrders.value
  } else {
    orders.value = allOrders.value.filter(o => o.status === statusFilter.value)
  }
}

// ============================================
// 更新訂單狀態 (審核)
// ============================================
async function handleApprove(order: any) {
  try {
    await showConfirmDialog({
      title: '確認通過',
      message: `確定將訂單 #${order.id.slice(-8)} 標記為「已付款」嗎？\n\n金額: ¥${order.rmbAmount} → NT$${order.twdAmount}`,
    })
    
    loading.value = true
    const res = await orderApi.updateStatus(order.id, 'PAID', '管理員審核通過')
    
    if (res.data.success) {
      showToast({ type: 'success', message: '✅ 訂單已通過' })
      await fetchOrders() // 刷新列表
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('審核失敗:', error)
    }
  } finally {
    loading.value = false
  }
}

async function handleReject(order: any) {
  try {
    await showConfirmDialog({
      title: '確認駁回',
      message: `確定將訂單 #${order.id.slice(-8)} 標記為「已駁回」嗎？`,
    })
    
    loading.value = true
    const res = await orderApi.updateStatus(order.id, 'REJECTED', '管理員駁回')
    
    if (res.data.success) {
      showToast({ type: 'success', message: '❌ 訂單已駁回' })
      await fetchOrders() // 刷新列表
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('駁回失敗:', error)
    }
  } finally {
    loading.value = false
  }
}

async function handleComplete(order: any) {
  try {
    await showConfirmDialog({
      title: '確認完成',
      message: `確定將訂單 #${order.id.slice(-8)} 標記為「已完成」嗎？`,
    })
    
    loading.value = true
    const res = await orderApi.updateStatus(order.id, 'COMPLETED', '訂單已完成')
    
    if (res.data.success) {
      showToast({ type: 'success', message: '🎉 訂單已完成' })
      await fetchOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失敗:', error)
    }
  } finally {
    loading.value = false
  }
}

// ============================================
// 匯率更新
// ============================================
async function handleUpdateRate() {
  const rate = parseFloat(newRate.value)
  
  if (isNaN(rate) || rate <= 0 || rate > 100) {
    showToast({ type: 'fail', message: '請輸入有效的匯率 (0.1 - 100)' })
    return
  }

  try {
    await showConfirmDialog({
      title: '確認更新匯率',
      message: `將匯率從 ${rateStore.rate} 更新為 ${rate}？\n\n這將影響所有新訂單的計算。`,
    })
    
    rateLoading.value = true
    const result = await rateStore.updateRate(rate)
    
    if (result.success) {
      showToast({ type: 'success', message: '✅ 匯率更新成功' })
      newRate.value = ''
      // 強制刷新匯率
      await rateStore.fetchRate()
    } else {
      showToast({ type: 'fail', message: result.message || '更新失敗' })
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('更新匯率失敗:', error)
    }
  } finally {
    rateLoading.value = false
  }
}

// ============================================
// 下拉刷新
// ============================================
function onRefresh() {
  refreshing.value = true
  rateStore.fetchRate()
  fetchOrders()
}

// ============================================
// 篩選變更
// ============================================
function onFilterChange() {
  pagination.value.page = 1
  fetchOrders()
}

// ============================================
// 返回首頁
// ============================================
function goBack() {
  router.push('/')
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
// 格式化日期
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

// ============================================
// 截短 URL
// ============================================
function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname + u.pathname.substring(0, 15) + '...'
  } catch {
    return url.substring(0, 30) + '...'
  }
}

// ============================================
// 生命週期
// ============================================
onMounted(() => {
  rateStore.fetchRate()
  fetchOrders()
})
</script>

<template>
  <div class="admin-page">
    <!-- 導航欄 -->
    <van-nav-bar 
      title="管理後台" 
      left-arrow 
      @click-left="goBack"
      fixed
      placeholder
    >
      <template #right>
        <div class="logout-btn" @click="handleLogout">
          <div class="i-carbon-logout text-lg"></div>
        </div>
      </template>
    </van-nav-bar>

    <!-- 標籤切換 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46" color="#1989fa">
      <van-tab name="orders" title="訂單審核" />
      <van-tab name="rate" title="匯率設置" />
    </van-tabs>

    <!-- ============================================ -->
    <!-- 訂單審核面板 -->
    <!-- ============================================ -->
    <div v-show="activeTab === 'orders'" class="orders-panel">
      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div 
          class="stat-item" 
          :class="{ active: statusFilter === 'PENDING' }"
          @click="statusFilter = 'PENDING'; onFilterChange()"
        >
          <span class="stat-num pending">{{ stats.PENDING }}</span>
          <span class="stat-label">待審核</span>
        </div>
        <div 
          class="stat-item"
          :class="{ active: statusFilter === 'PAID' }"
          @click="statusFilter = 'PAID'; onFilterChange()"
        >
          <span class="stat-num paid">{{ stats.PAID }}</span>
          <span class="stat-label">已付款</span>
        </div>
        <div 
          class="stat-item"
          :class="{ active: statusFilter === 'COMPLETED' }"
          @click="statusFilter = 'COMPLETED'; onFilterChange()"
        >
          <span class="stat-num completed">{{ stats.COMPLETED }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div 
          class="stat-item"
          :class="{ active: statusFilter === 'REJECTED' }"
          @click="statusFilter = 'REJECTED'; onFilterChange()"
        >
          <span class="stat-num rejected">{{ stats.REJECTED }}</span>
          <span class="stat-label">已駁回</span>
        </div>
      </div>

      <!-- 刷新按鈕 -->
      <div class="action-bar">
        <span class="filter-label">
          {{ statusFilter === 'all' ? '全部訂單' : statusConfig[statusFilter]?.text + '訂單' }}
          ({{ orders.length }})
        </span>
        <van-button size="small" icon="replay" @click="onRefresh" :loading="refreshing">
          刷新
        </van-button>
      </div>

      <!-- 訂單列表 -->
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="loading && !refreshing" class="loading-state">
          <van-loading size="24px">載入中...</van-loading>
        </div>
        
        <div v-else-if="orders.length === 0" class="empty-state">
          <van-empty :description="statusFilter === 'PENDING' ? '沒有待審核的訂單' : '沒有訂單'" />
        </div>
        
        <div v-else class="orders-list">
          <div 
            v-for="order in orders" 
            :key="order.id" 
            class="order-card"
            :style="{ borderLeftColor: statusConfig[order.status]?.color }"
          >
            <!-- 訂單頭部 -->
            <div class="order-header">
              <div class="order-user">
                <span class="user-email">{{ order.user?.email || '未知用戶' }}</span>
                <span class="order-id">#{{ order.id.slice(-8) }}</span>
              </div>
              <van-tag 
                :color="statusConfig[order.status]?.bgColor"
                :text-color="statusConfig[order.status]?.color"
                size="medium"
              >
                {{ statusConfig[order.status]?.text }}
              </van-tag>
            </div>
            
            <!-- 訂單內容 -->
            <div class="order-body">
              <div class="order-url">
                <div class="i-carbon-link text-gray-400 mr-1"></div>
                {{ shortUrl(order.taobaoUrl) }}
              </div>
              
              <div class="order-amounts">
                <div class="amount-item">
                  <span class="amount-label">人民幣</span>
                  <span class="amount-value rmb">¥ {{ order.rmbAmount.toFixed(2) }}</span>
                </div>
                <div class="amount-arrow">
                  <div class="i-carbon-arrow-right"></div>
                </div>
                <div class="amount-item">
                  <span class="amount-label">台幣</span>
                  <span class="amount-value twd">NT$ {{ order.twdAmount.toFixed(2) }}</span>
                </div>
                <div class="amount-item rate">
                  <span class="amount-label">匯率</span>
                  <span class="amount-value">{{ order.exchangeRate }}</span>
                </div>
              </div>
              
              <div class="order-time">
                <div class="i-carbon-time text-gray-400 mr-1"></div>
                {{ formatDate(order.createdAt) }}
              </div>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="order-actions" v-if="order.status === 'PENDING'">
              <van-button 
                type="success" 
                size="small"
                icon="success"
                @click="handleApprove(order)"
              >
                通過
              </van-button>
              <van-button 
                type="danger" 
                size="small"
                icon="cross"
                @click="handleReject(order)"
              >
                駁回
              </van-button>
            </div>
            
            <div class="order-actions" v-else-if="order.status === 'PAID'">
              <van-button 
                type="primary" 
                size="small"
                icon="success"
                @click="handleComplete(order)"
              >
                標記完成
              </van-button>
            </div>
          </div>
        </div>
      </van-pull-refresh>
    </div>

    <!-- ============================================ -->
    <!-- 匯率設置面板 -->
    <!-- ============================================ -->
    <div v-show="activeTab === 'rate'" class="rate-panel">
      <div class="rate-card">
        <!-- 當前匯率顯示 -->
        <div class="current-rate">
          <div class="rate-icon">
            <div class="i-carbon-currency-dollar text-3xl"></div>
          </div>
          <div class="rate-info">
            <span class="rate-label">當前匯率</span>
            <div class="rate-display">
              <span class="rate-value">{{ rateStore.rate }}</span>
              <span class="rate-unit">TWD / RMB</span>
            </div>
            <p class="rate-desc">即 1 人民幣 = {{ rateStore.rate }} 新台幣</p>
          </div>
        </div>
        
        <van-divider />
        
        <!-- 修改匯率 -->
        <div class="update-rate">
          <h4>修改匯率</h4>
          <p class="update-hint">修改後將立即生效，影響所有新訂單的台幣計算</p>
          
          <van-field
            v-model="newRate"
            type="number"
            placeholder="輸入新匯率 (如: 4.5)"
            :disabled="rateLoading"
            clearable
          >
            <template #button>
              <van-button 
                type="primary" 
                size="small"
                :loading="rateLoading"
                @click="handleUpdateRate"
              >
                更新
              </van-button>
            </template>
          </van-field>
          
          <div class="rate-preview" v-if="newRate && !isNaN(parseFloat(newRate))">
            <p>預覽：1 RMB = <strong>{{ parseFloat(newRate).toFixed(2) }}</strong> TWD</p>
            <p>例如：¥100 = NT$ <strong>{{ (100 * parseFloat(newRate)).toFixed(2) }}</strong></p>
          </div>
        </div>
      </div>
      
      <!-- 快捷設置 -->
      <div class="quick-rates">
        <h4>快捷設置</h4>
        <div class="quick-btns">
          <van-button size="small" @click="newRate = '4.3'">4.3</van-button>
          <van-button size="small" @click="newRate = '4.5'">4.5</van-button>
          <van-button size="small" @click="newRate = '4.6'">4.6</van-button>
          <van-button size="small" @click="newRate = '4.8'">4.8</van-button>
          <van-button size="small" @click="newRate = '5.0'">5.0</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.logout-btn {
  padding: 8px;
  cursor: pointer;
}

/* ============================================ */
/* 訂單面板樣式 */
/* ============================================ */
.orders-panel {
  padding: 12px 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stat-item {
  background: white;
  padding: 12px 8px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.stat-item:active {
  transform: scale(0.95);
}

.stat-item.active {
  border-color: #1989fa;
  background: #e6f4ff;
}

.stat-num {
  display: block;
  font-size: 22px;
  font-weight: bold;
}

.stat-num.pending { color: #ff976a; }
.stat-num.paid { color: #1989fa; }
.stat-num.completed { color: #07c160; }
.stat-num.rejected { color: #ee0a24; }

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.filter-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #ccc;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.order-user {
  display: flex;
  flex-direction: column;
}

.user-email {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.order-id {
  font-size: 11px;
  color: #999;
  font-family: monospace;
  margin-top: 2px;
}

.order-body {
  margin-bottom: 12px;
}

.order-url {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
  padding: 8px;
  background: #f8f8f8;
  border-radius: 6px;
}

.order-amounts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.amount-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-item.rate {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.amount-label {
  font-size: 10px;
  color: #999;
  margin-bottom: 2px;
}

.amount-value {
  font-weight: bold;
  font-size: 14px;
}

.amount-value.rmb { color: #ee0a24; }
.amount-value.twd { color: #1989fa; }

.amount-arrow {
  color: #ccc;
}

.order-time {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #999;
  margin-top: 12px;
}

.order-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.loading-state,
.empty-state {
  padding: 60px 0;
  text-align: center;
}

/* ============================================ */
/* 匯率面板樣式 */
/* ============================================ */
.rate-panel {
  padding: 16px;
}

.rate-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.current-rate {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rate-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.rate-info {
  flex: 1;
}

.rate-info .rate-label {
  font-size: 12px;
  color: #999;
}

.rate-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 4px 0;
}

.rate-display .rate-value {
  font-size: 36px;
  font-weight: bold;
  color: #1989fa;
}

.rate-display .rate-unit {
  font-size: 14px;
  color: #666;
}

.rate-desc {
  font-size: 13px;
  color: #999;
}

.update-rate {
  margin-top: 8px;
}

.update-rate h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.update-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.rate-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
}

.rate-preview strong {
  color: #1989fa;
}

.quick-rates {
  margin-top: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.quick-rates h4 {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
}

.quick-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
