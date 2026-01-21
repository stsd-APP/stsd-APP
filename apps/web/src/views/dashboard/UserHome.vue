<script setup lang="ts">
// ============================================
// 用戶主頁 - 家具配送中心
// ============================================
// 垂直化：集運→專線配送，包裹→貨物
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showSuccessToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { useRateStore } from '../../stores/rate'
import { orderApi, type Order } from '../../api/order'
import { packageApi, type Warehouse } from '../../api/package'

const router = useRouter()
const authStore = useAuthStore()
const rateStore = useRateStore()

// ============================================
// 狀態
// ============================================
const showProxyDialog = ref(false)
const warehouse = ref<Warehouse | null>(null)
const orders = ref<Order[]>([])
const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const stats = ref({
  totalOrders: 0,
  pendingOrders: 0,
  totalAmount: 0,
})

// 代付表單
const orderForm = ref({
  taobaoUrl: '',
  rmbAmount: '',
  remark: '',
})

// ============================================
// 計算屬性
// ============================================
const calculatedTWD = computed(() => {
  const rmb = parseFloat(orderForm.value.rmbAmount)
  if (isNaN(rmb) || rmb <= 0) return 0
  return Math.round(rmb * rateStore.rate * 100) / 100
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
})

const statusConfig: Record<string, { text: string; color: string; bgColor: string }> = {
  PENDING: { text: '待審核', color: '#ff976a', bgColor: '#fff7e6' },
  PAID: { text: '已付款', color: '#1989fa', bgColor: '#e6f4ff' },
  COMPLETED: { text: '已完成', color: '#07c160', bgColor: '#e6fff0' },
  REJECTED: { text: '已駁回', color: '#ee0a24', bgColor: '#fff0f0' },
}

// 1688 收貨格式
const formatted1688Address = computed(() => {
  if (!warehouse.value) return ''
  const w = warehouse.value
  const memberId = authStore.user?.id?.slice(-8) || 'XXXXXX'
  return `收貨人：${w.contactName}(ID:${memberId})\n電話：${w.phone}\n地址：${w.province}${w.city}${w.district}${w.address}${w.postalCode ? `\n郵編：${w.postalCode}` : ''}`
})

// ============================================
// API 方法
// ============================================
async function fetchWarehouse() {
  try {
    const res = await packageApi.getWarehouse()
    if (res.data.success) {
      warehouse.value = res.data.data
    }
  } catch (error) {
    console.error('獲取倉庫失敗:', error)
  }
}

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

async function fetchOrders() {
  loading.value = true
  try {
    const res = await orderApi.getMyOrders({ page: 1, limit: 10 })
    if (res.data.success) {
      orders.value = res.data.data.orders
    }
  } catch (error) {
    console.error('獲取訂單失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await Promise.all([
    rateStore.fetchRate(),
    fetchWarehouse(),
    fetchStats(),
    fetchOrders(),
  ])
  refreshing.value = false
}

async function submitOrder() {
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
        message: `申請已提交！需付 NT$ ${calculatedTWD.value.toLocaleString()}`,
        duration: 3000,
      })
      
      showProxyDialog.value = false
      orderForm.value = { taobaoUrl: '', rmbAmount: '', remark: '' }
      await refresh()
    }
  } catch (error: any) {
    console.error('提交失敗:', error)
  } finally {
    submitting.value = false
  }
}

function openProxyDialog() {
  rateStore.fetchRate()
  showProxyDialog.value = true
}

function handleLogout() {
  showConfirmDialog({
    title: '確認登出',
    message: '確定要登出嗎？',
  }).then(() => {
    authStore.logout()
    router.push('/login')
    showToast('已登出')
  }).catch(() => {})
}

function copy1688Address() {
  if (!formatted1688Address.value) return
  navigator.clipboard.writeText(formatted1688Address.value)
  showSuccessToast('已複製 1688 收貨格式')
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes <= 0 ? '剛剛' : `${minutes} 分鐘前`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小時前`
  }
  return date.toLocaleDateString('zh-TW', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function shortUrl(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url.substring(0, 25) + '...'
  }
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="user-home">
    <!-- ============================================ -->
    <!-- 頂部區域 -->
    <!-- ============================================ -->
    <div class="header-section">
      <div class="header-content">
        <div class="user-info">
          <div class="greeting">{{ greeting }}，{{ authStore.userName }}</div>
          <div class="subtitle">歡迎使用叁通家具專線服務</div>
        </div>
        <div class="header-actions">
          <div class="action-btn" @click="handleLogout">
            <van-icon name="setting-o" size="20" />
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 倉庫地址卡片 (核心) -->
    <!-- ============================================ -->
    <div class="warehouse-card">
      <div class="card-badge">🏠 家具專線收貨倉</div>
      
      <div class="warehouse-info" v-if="warehouse">
        <div class="info-main">
          <div class="info-row">
            <van-icon name="user-o" size="14" />
            <span>{{ warehouse.contactName }}<strong class="member-tag">(ID:{{ authStore.user?.id?.slice(-8) }})</strong></span>
          </div>
          <div class="info-row">
            <van-icon name="phone-o" size="14" />
            <span>{{ warehouse.phone }}</span>
          </div>
          <div class="info-row">
            <van-icon name="location-o" size="14" />
            <span>{{ warehouse.province }}{{ warehouse.city }}{{ warehouse.district }}{{ warehouse.address }}</span>
          </div>
        </div>
        <div class="warehouse-action">
          <van-button type="primary" size="small" icon="link-o" @click="copy1688Address">
            複製 1688 收貨格式
          </van-button>
        </div>
      </div>

      <div class="warehouse-tip">
        <van-icon name="bulb-o" />
        <span>在 1688 購買家具時，請將收貨地址設為此倉庫。<strong>收件人必須帶上您的會員ID</strong>，否則貨物無法識別！</span>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 快捷入口 -->
    <!-- ============================================ -->
    <div class="quick-actions">
      <div class="action-card" @click="router.push('/warehouse')">
        <div class="action-icon green">
          <van-icon name="logistics" size="24" />
        </div>
        <div class="action-text">
          <strong>我的家具</strong>
          <span>配送追蹤 / 預報</span>
        </div>
        <van-icon name="arrow" color="#999" />
      </div>

      <div class="action-card" @click="router.push('/mall')">
        <div class="action-icon red">
          <van-icon name="shop-o" size="24" />
        </div>
        <div class="action-text">
          <strong>家具商城</strong>
          <span>精選家具 / 海運包郵</span>
        </div>
        <van-icon name="arrow" color="#999" />
      </div>

      <div class="action-card" @click="router.push('/calculator')">
        <div class="action-icon purple">
          <van-icon name="calculator" size="24" />
        </div>
        <div class="action-text">
          <strong>海運運費</strong>
          <span>按體積 (CBM) 計費</span>
        </div>
        <van-icon name="arrow" color="#999" />
      </div>

      <!-- 代理入口 -->
      <div class="action-card agent-card" @click="router.push('/agent')">
        <div class="action-icon orange">
          <van-icon name="friends-o" size="24" />
        </div>
        <div class="action-text">
          <strong>{{ authStore.isAgent ? '代理中心' : '成為代理' }}</strong>
          <span>{{ authStore.isAgent ? '查看收益 / 推廣' : '推薦賺佣金 / 輕鬆創業' }}</span>
        </div>
        <van-tag v-if="!authStore.isAgent" color="#fff7e6" text-color="#ff976a" style="margin-right: 8px;">
          NEW
        </van-tag>
        <van-icon name="arrow" color="#999" />
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 代付小幫手 (輔助服務) -->
    <!-- ============================================ -->
    <div class="proxy-section">
      <div class="proxy-header" @click="openProxyDialog">
        <div class="proxy-icon">
          <van-icon name="service-o" size="22" color="#1989fa" />
        </div>
        <div class="proxy-info">
          <div class="proxy-title">付款遇到困難？</div>
          <div class="proxy-desc">代付/代採小幫手，解決無法付款的煩惱</div>
        </div>
        <van-icon name="arrow" color="#999" />
      </div>

      <!-- 匯率顯示 -->
      <div class="rate-row" @click="rateStore.fetchRate()">
        <span class="rate-label">今日匯率</span>
        <span class="rate-value">1 RMB = {{ rateStore.rate }} TWD</span>
        <van-icon name="replay" size="12" :class="{ spinning: rateStore.loading }" />
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 代付訂單列表 -->
    <!-- ============================================ -->
    <div class="orders-section" v-if="orders.length > 0">
      <div class="section-header">
        <h3>代付記錄</h3>
        <van-button size="small" icon="replay" @click="refresh" :loading="refreshing">
          刷新
        </van-button>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="refresh">
        <div class="orders-list">
          <van-card
            v-for="order in orders"
            :key="order.id"
            :title="`#${order.id.slice(-8)}`"
            :desc="shortUrl(order.taobaoUrl)"
            class="order-card"
          >
            <template #tags>
              <van-tag 
                :color="statusConfig[order.status]?.bgColor"
                :text-color="statusConfig[order.status]?.color"
              >
                {{ statusConfig[order.status]?.text }}
              </van-tag>
            </template>
            <template #price>
              <span class="price-twd">NT$ {{ order.twdAmount.toFixed(2) }}</span>
            </template>
            <template #origin-price>
              <span class="price-rmb">¥ {{ order.rmbAmount.toFixed(2) }}</span>
            </template>
            <template #footer>
              <span class="order-time">{{ formatDate(order.createdAt) }}</span>
              <span class="order-rate">匯率 {{ order.exchangeRate }}</span>
            </template>
          </van-card>
        </div>
      </van-pull-refresh>
    </div>

    <!-- ============================================ -->
    <!-- 代付彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showProxyDialog"
      title="代付/代採小幫手"
      :show-confirm-button="false"
      :close-on-click-overlay="false"
    >
      <div class="proxy-form">
        <!-- 說明提示 -->
        <div class="proxy-tip">
          <van-icon name="info-o" />
          <div>
            <p>專為 1688/淘寶 進貨客戶提供。</p>
            <p>如果您無法使用支付寶/微信付款，我們可以幫您代付。</p>
            <p><strong>貨物將直接入庫我們的集運倉。</strong></p>
          </div>
        </div>

        <!-- 匯率提示 -->
        <div class="rate-hint">
          <van-icon name="gold-coin-o" />
          今日匯率：<strong>{{ rateStore.rate }}</strong> (1 RMB = {{ rateStore.rate }} TWD)
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
            />
            
            <van-field
              v-model="orderForm.rmbAmount"
              type="number"
              label="人民幣金額"
              placeholder="輸入金額"
              required
              :disabled="submitting"
            >
              <template #extra>
                <span class="input-suffix">¥</span>
              </template>
            </van-field>

            <van-field
              :model-value="calculatedTWD > 0 ? `NT$ ${calculatedTWD.toLocaleString()}` : ''"
              label="需付台幣"
              placeholder="自動計算"
              readonly
            />
            
            <van-field
              v-model="orderForm.remark"
              type="textarea"
              label="備註"
              placeholder="選填"
              rows="2"
              :disabled="submitting"
            />
          </van-cell-group>

          <!-- 金額預覽 -->
          <div class="amount-preview" v-if="calculatedTWD > 0">
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
              <span class="twd">NT$ {{ calculatedTWD.toLocaleString() }}</span>
            </div>
          </div>

          <div class="form-actions">
            <van-button @click="showProxyDialog = false" :disabled="submitting">
              取消
            </van-button>
            <van-button 
              type="primary" 
              native-type="submit"
              :loading="submitting"
              :disabled="submitting"
            >
              提交申請
            </van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar :model-value="3" active-color="#C0392B" fixed>
      <van-tabbar-item icon="shop-o" @click="router.push('/mall')">家具</van-tabbar-item>
      <van-tabbar-item icon="calculator" @click="router.push('/calculator')">運費</van-tabbar-item>
      <van-tabbar-item icon="logistics" @click="router.push('/warehouse')">配送</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
      <van-tabbar-item v-if="authStore.isAdmin" icon="setting-o" @click="router.push('/admin')">管理</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.user-home {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 頂部區域 */
.header-section {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 48px 16px 24px;
  border-radius: 0 0 24px 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: white;
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
  color: white;
}

/* 倉庫卡片 */
.warehouse-card {
  margin: -10px 12px 12px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
}

.card-badge {
  position: absolute;
  top: -8px;
  left: 16px;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.warehouse-info {
  margin-top: 16px;
}

.info-main {
  background: #f8f9ff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #333;
}

.member-tag {
  color: #ee0a24;
  font-size: 12px;
}

.warehouse-action {
  margin-bottom: 12px;
}

.warehouse-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 12px;
  color: #ff976a;
  line-height: 1.5;
}

.warehouse-tip strong {
  color: #ee0a24;
}

/* 快捷入口 */
.quick-actions {
  margin: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 10px;
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.action-icon.green { background: linear-gradient(135deg, #11998e, #38ef7d); }
.action-icon.red { background: linear-gradient(135deg, #ee0a24, #ff6034); }
.action-icon.purple { background: linear-gradient(135deg, #667eea, #764ba2); }
.action-icon.orange { background: linear-gradient(135deg, #ff9a00, #ff6600); }

.agent-card {
  border: 1px dashed #ff9a00;
  background: linear-gradient(135deg, #fffbf0 0%, #fff8e6 100%);
}

.action-text {
  flex: 1;
}

.action-text strong {
  display: block;
  font-size: 15px;
  color: #333;
}

.action-text span {
  font-size: 12px;
  color: #999;
}

/* 代付區域 */
.proxy-section {
  margin: 12px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.proxy-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
}

.proxy-icon {
  width: 44px;
  height: 44px;
  background: #e6f4ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.proxy-info {
  flex: 1;
}

.proxy-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.proxy-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.rate-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f8f8;
  font-size: 13px;
  cursor: pointer;
}

.rate-label {
  color: #999;
}

.rate-value {
  flex: 1;
  color: #1989fa;
  font-weight: 500;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 訂單列表 */
.orders-section {
  padding: 0 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 15px;
  font-weight: 600;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: white;
  border-radius: 12px;
}

.order-card :deep(.van-card__header) {
  padding: 12px;
}

.price-twd {
  color: #1989fa;
  font-weight: bold;
}

.price-rmb {
  color: #999;
  text-decoration: line-through;
}

.order-card :deep(.van-card__footer) {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #f5f5f5;
}

.order-time, .order-rate {
  font-size: 11px;
  color: #999;
}

/* 代付表單 */
.proxy-form {
  padding: 16px;
}

.proxy-tip {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
  border-left: 3px solid #1989fa;
}

.proxy-tip p {
  margin: 4px 0;
  line-height: 1.5;
}

.proxy-tip strong {
  color: #ee0a24;
}

.rate-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.rate-hint strong {
  color: #ff976a;
}

.input-suffix {
  color: #999;
}

.amount-preview {
  margin: 16px 0;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #666;
}

.preview-row.total {
  border-top: 1px dashed #ddd;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: bold;
}

.preview-row .rmb { color: #ee0a24; }
.preview-row .twd { color: #1989fa; font-size: 16px; }

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}
</style>
