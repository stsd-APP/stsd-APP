<script setup lang="ts">
// ============================================
// 訂單列表頁面 - 美化卡片式佈局
// ============================================
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { orderApi } from '../../api/order'
import { reviewApi } from '../../api/review'
import ReviewForm from '../../components/ReviewForm.vue'

const router = useRouter()
const authStore = useAuthStore()

// ============================================
// 狀態變量
// ============================================
const orders = ref<any[]>([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const activeTab = ref('all')

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
})

// 狀態配置 - 不同顏色
const statusConfig: Record<string, { text: string; color: string; bgColor: string; icon: string }> = {
  PENDING: { 
    text: '待審核', 
    color: '#ff976a', 
    bgColor: '#fff7e6',
    icon: 'i-carbon-time'
  },
  PAID: { 
    text: '已付款', 
    color: '#1989fa', 
    bgColor: '#e6f4ff',
    icon: 'i-carbon-checkmark'
  },
  COMPLETED: { 
    text: '已完成', 
    color: '#07c160', 
    bgColor: '#e6fff0',
    icon: 'i-carbon-checkmark-filled'
  },
  REJECTED: { 
    text: '已駁回', 
    color: '#ee0a24', 
    bgColor: '#fff0f0',
    icon: 'i-carbon-close'
  },
}

const tabs = [
  { name: 'all', title: '全部' },
  { name: 'PENDING', title: '待審核' },
  { name: 'PAID', title: '已付款' },
  { name: 'COMPLETED', title: '已完成' },
  { name: 'REJECTED', title: '已駁回' },
]

// 評價相關狀態
const showReviewForm = ref(false)
const reviewOrderId = ref('')
const reviewProductName = ref('')
const reviewedOrders = ref<Set<string>>(new Set()) // 已評價的訂單ID

// ============================================
// API 調用
// ============================================
async function fetchOrders(reset = false) {
  if (reset) {
    pagination.value.page = 1
    orders.value = []
    finished.value = false
  }

  loading.value = true
  
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }
    
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }

    const res = await orderApi.getMyOrders(params)
    
    if (res.data.success) {
      const { orders: newOrders, pagination: pag } = res.data.data
      
      if (reset) {
        orders.value = newOrders
      } else {
        orders.value = [...orders.value, ...newOrders]
      }
      
      pagination.value.total = pag.total
      
      if (orders.value.length >= pag.total) {
        finished.value = true
      }
    }
  } catch (error) {
    console.error('獲取訂單失敗:', error)
    showToast({ type: 'fail', message: '獲取訂單失敗' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 加載更多
function onLoad() {
  pagination.value.page++
  fetchOrders()
}

// 下拉刷新
function onRefresh() {
  refreshing.value = true
  fetchOrders(true)
}

// 切換標籤
function onTabChange() {
  fetchOrders(true)
}

// ============================================
// 格式化函數
// ============================================
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 1小時內顯示"X分鐘前"
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes <= 0 ? '剛剛' : `${minutes} 分鐘前`
  }
  
  // 24小時內顯示"X小時前"
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} 小時前`
  }
  
  // 否則顯示完整日期
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
    return url.substring(0, 25) + '...'
  }
}

// ============================================
// 評價功能
// ============================================
async function checkCanReview(orderId: string): Promise<boolean> {
  if (reviewedOrders.value.has(orderId)) return false
  
  try {
    const res = await reviewApi.checkReviewable(orderId)
    if (res.data.success && !res.data.data.canReview) {
      reviewedOrders.value.add(orderId)
      return false
    }
    return res.data.data.canReview
  } catch {
    return false
  }
}

function openReviewForm(order: any) {
  reviewOrderId.value = order.id
  // 嘗試從訂單 URL 提取商品名稱
  reviewProductName.value = order.productName || ''
  showReviewForm.value = true
}

function onReviewSuccess(data: { pointsEarned: number; currentPoints: number }) {
  reviewedOrders.value.add(reviewOrderId.value)
  showSuccessToast(`🎉 獲得 ${data.pointsEarned} 積分！`)
}

// ============================================
// 導航
// ============================================
function goBack() {
  router.push('/')
}

function goHome() {
  router.push('/')
}

// ============================================
// 生命週期
// ============================================
onMounted(() => {
  fetchOrders(true)
})
</script>

<template>
  <div class="orders-page">
    <!-- 導航欄 -->
    <van-nav-bar 
      title="我的訂單" 
      left-arrow 
      @click-left="goBack"
      fixed
      placeholder
    />

    <!-- 標籤篩選 -->
    <van-tabs 
      v-model:active="activeTab" 
      @change="onTabChange"
      sticky
      offset-top="46"
      color="#1989fa"
      line-width="20"
    >
      <van-tab 
        v-for="tab in tabs" 
        :key="tab.name" 
        :name="tab.name" 
        :title="tab.title"
      />
    </van-tabs>

    <!-- 訂單列表 -->
    <div class="orders-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="— 沒有更多了 —"
          @load="onLoad"
        >
          <!-- 空狀態 -->
          <div v-if="orders.length === 0 && !loading" class="empty-state">
            <van-empty 
              :image="activeTab === 'PENDING' ? 'search' : 'default'"
              :description="activeTab === 'PENDING' ? '沒有待審核的訂單' : '暫無訂單記錄'"
            />
            <van-button 
              type="primary" 
              size="small" 
              @click="goHome"
            >
              去申請代付
            </van-button>
          </div>
          
          <!-- 訂單卡片列表 -->
          <div v-else class="orders-list">
            <div 
              v-for="order in orders" 
              :key="order.id" 
              class="order-card"
              :class="`status-${order.status.toLowerCase()}`"
            >
              <!-- 訂單頭部 -->
              <div class="order-header">
                <div class="order-meta">
                  <span class="order-id">#{{ order.id.slice(-8) }}</span>
                  <span class="order-time">{{ formatDate(order.createdAt) }}</span>
                </div>
                <div 
                  class="status-badge"
                  :style="{ 
                    backgroundColor: statusConfig[order.status]?.bgColor,
                    color: statusConfig[order.status]?.color
                  }"
                >
                  <div :class="statusConfig[order.status]?.icon" class="status-icon"></div>
                  {{ statusConfig[order.status]?.text }}
                </div>
              </div>
              
              <!-- 訂單內容 -->
              <div class="order-body">
                <!-- 商品連結 -->
                <div class="order-url">
                  <div class="url-icon">
                    <div class="i-carbon-link"></div>
                  </div>
                  <span class="url-text">{{ shortUrl(order.taobaoUrl) }}</span>
                </div>
                
                <!-- 金額展示 -->
                <div class="amounts-card">
                  <div class="amount-col">
                    <span class="amount-label">商品金額</span>
                    <span class="amount-value rmb">¥ {{ order.rmbAmount.toFixed(2) }}</span>
                  </div>
                  <div class="amount-divider">
                    <div class="divider-line"></div>
                    <div class="divider-arrow">
                      <div class="i-carbon-arrow-right"></div>
                    </div>
                    <div class="divider-line"></div>
                  </div>
                  <div class="amount-col">
                    <span class="amount-label">支付台幣</span>
                    <span class="amount-value twd">NT$ {{ order.twdAmount.toFixed(2) }}</span>
                  </div>
                </div>
                
                <!-- 匯率信息 -->
                <div class="rate-info">
                  下單匯率：1 RMB = {{ order.exchangeRate }} TWD
                </div>
              </div>
              
              <!-- 狀態進度條 -->
              <div class="order-progress">
                <div class="progress-step" :class="{ active: true }">
                  <div class="step-dot"></div>
                  <span>已提交</span>
                </div>
                <div class="progress-line" :class="{ active: order.status !== 'PENDING' && order.status !== 'REJECTED' }"></div>
                <div class="progress-step" :class="{ active: order.status === 'PAID' || order.status === 'COMPLETED' }">
                  <div class="step-dot"></div>
                  <span>已付款</span>
                </div>
                <div class="progress-line" :class="{ active: order.status === 'COMPLETED' }"></div>
                <div class="progress-step" :class="{ active: order.status === 'COMPLETED' }">
                  <div class="step-dot"></div>
                  <span>已完成</span>
                </div>
              </div>

              <!-- 評價按鈕 (已完成訂單) -->
              <div 
                v-if="order.status === 'COMPLETED' && !reviewedOrders.has(order.id)" 
                class="order-actions"
              >
                <van-button 
                  type="primary" 
                  size="small" 
                  round
                  icon="edit"
                  @click.stop="openReviewForm(order)"
                >
                  去評價 · 賺50積分
                </van-button>
              </div>

              <!-- 已評價標記 -->
              <div v-else-if="order.status === 'COMPLETED'" class="reviewed-badge">
                <van-icon name="success" color="#07c160" />
                <span>已評價</span>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 底部導航 -->
    <van-tabbar :model-value="1" active-color="#1989fa" fixed>
      <van-tabbar-item icon="home-o" @click="router.push('/')">首頁</van-tabbar-item>
      <van-tabbar-item icon="orders-o" @click="router.push('/orders')">訂單</van-tabbar-item>
      <van-tabbar-item v-if="authStore.isAdmin" icon="setting-o" @click="router.push('/admin')">管理</van-tabbar-item>
      <van-tabbar-item v-else icon="user-o">我的</van-tabbar-item>
    </van-tabbar>

    <!-- 評價表單彈窗 -->
    <ReviewForm
      v-model:visible="showReviewForm"
      :order-id="reviewOrderId"
      :product-name="reviewProductName"
      @success="onReviewSuccess"
    />
  </div>
</template>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

.orders-content {
  padding: 12px 16px;
}

/* ============================================ */
/* 訂單卡片 */
/* ============================================ */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.order-card:active {
  transform: scale(0.98);
}

/* 狀態邊框 */
.order-card.status-pending {
  border-top: 3px solid #ff976a;
}

.order-card.status-paid {
  border-top: 3px solid #1989fa;
}

.order-card.status-completed {
  border-top: 3px solid #07c160;
}

.order-card.status-rejected {
  border-top: 3px solid #ee0a24;
}

/* 訂單頭部 */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.order-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-id {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  font-family: monospace;
}

.order-time {
  font-size: 12px;
  color: #999;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-icon {
  font-size: 14px;
}

/* 訂單內容 */
.order-body {
  padding: 16px;
}

.order-url {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 16px;
}

.url-icon {
  color: #999;
}

.url-text {
  font-size: 13px;
  color: #666;
}

/* 金額卡片 */
.amounts-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9ff 0%, #fff8f8 100%);
  border-radius: 12px;
  margin-bottom: 12px;
}

.amount-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 6px;
}

.amount-value {
  font-size: 18px;
  font-weight: bold;
}

.amount-value.rmb {
  color: #ee0a24;
}

.amount-value.twd {
  color: #1989fa;
}

.amount-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 12px;
}

.divider-line {
  width: 1px;
  height: 8px;
  background: #ddd;
}

.divider-arrow {
  color: #ccc;
  margin: 4px 0;
}

.rate-info {
  text-align: center;
  font-size: 11px;
  color: #999;
}

/* 進度條 */
.order-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.progress-step span {
  font-size: 10px;
  color: #ccc;
}

.progress-step.active span {
  color: #1989fa;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ddd;
}

.progress-step.active .step-dot {
  background: #1989fa;
}

.progress-line {
  width: 40px;
  height: 2px;
  background: #ddd;
  margin: 0 8px;
  margin-bottom: 18px;
}

.progress-line.active {
  background: #1989fa;
}

/* 空狀態 */
.empty-state {
  padding: 60px 0;
  text-align: center;
}

.empty-state .van-button {
  margin-top: 16px;
}

/* 評價按鈕 */
.order-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff9e6 0%, #fff5f0 100%);
  border-top: 1px solid #f0f0f0;
}

.order-actions .van-button {
  font-size: 13px;
}

/* 已評價標記 */
.reviewed-badge {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 12px 16px;
  background: #f6ffed;
  font-size: 13px;
  color: #07c160;
}
</style>
