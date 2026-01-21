<script setup lang="ts">
// ============================================
// 代理中心 - 儀表盤 + 推廣 + 客戶管理
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { agentApi, type AgentStats, type Client, type CommissionRecord } from '../../api/agent'

const router = useRouter()
const authStore = useAuthStore()

// ============================================
// 狀態
// ============================================
const loading = ref(true)
const activeTab = ref('overview')
const stats = ref<AgentStats | null>(null)
const clients = ref<Client[]>([])
const commissions = ref<CommissionRecord[]>([])
const showApplyDialog = ref(false)
const applying = ref(false)
const applyForm = ref({ agentName: '', agentCode: '' })

// 是否為代理
const isAgent = computed(() => authStore.user?.isAgent)

// ============================================
// API
// ============================================
async function fetchStats() {
  loading.value = true
  try {
    const res = await agentApi.getStats()
    if (res.data.success) {
      stats.value = res.data.data
    }
  } catch (error) {
    console.error('獲取統計失敗:', error)
  } finally {
    loading.value = false
  }
}

async function fetchClients() {
  try {
    const res = await agentApi.getClients({ limit: 50 })
    if (res.data.success) {
      clients.value = res.data.data.clients
    }
  } catch (error) {
    console.error('獲取客戶失敗:', error)
  }
}

async function fetchCommissions() {
  try {
    const res = await agentApi.getCommissions({ limit: 50 })
    if (res.data.success) {
      commissions.value = res.data.data.records
    }
  } catch (error) {
    console.error('獲取佣金記錄失敗:', error)
  }
}

async function applyAgent() {
  if (!applyForm.value.agentName.trim()) {
    showToast({ type: 'fail', message: '請輸入代理名稱' })
    return
  }

  applying.value = true
  try {
    const res = await agentApi.apply({
      agentName: applyForm.value.agentName,
      agentCode: applyForm.value.agentCode || undefined,
    })

    if (res.data.success) {
      showSuccessToast(res.data.message)
      showApplyDialog.value = false
      
      // 更新用戶狀態
      authStore.user!.isAgent = true
      authStore.user!.agentCode = res.data.data.agentCode
      localStorage.setItem('user', JSON.stringify(authStore.user))
      
      // 重新獲取數據
      await fetchStats()
    }
  } catch (error) {
    console.error('申請失敗:', error)
  } finally {
    applying.value = false
  }
}

// 複製推廣鏈接
function copyLink() {
  if (!stats.value) return
  navigator.clipboard.writeText(stats.value.promotionLink)
  showSuccessToast('推廣鏈接已複製')
}

// 複製推薦碼
function copyCode() {
  if (!stats.value) return
  navigator.clipboard.writeText(stats.value.agentCode)
  showSuccessToast('推薦碼已複製')
}

// 生成二維碼 URL
const qrcodeUrl = computed(() => {
  if (!stats.value) return ''
  const link = encodeURIComponent(stats.value.promotionLink)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${link}`
})

// 格式化佣金類型
function formatCommissionType(type: string) {
  const map: Record<string, string> = {
    ORDER: '訂單返點',
    SHIPPING: '運費返點',
    BONUS: '額外獎勵',
    WITHDRAWAL: '提現',
  }
  return map[type] || type
}

// 格式化日期
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  if (isAgent.value) {
    fetchStats()
    fetchClients()
    fetchCommissions()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="agent-dashboard">
    <!-- 導航欄 -->
    <van-nav-bar
      title="代理中心"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <!-- ============================================ -->
    <!-- 非代理：申請入口 -->
    <!-- ============================================ -->
    <template v-if="!isAgent">
      <div class="apply-section">
        <div class="apply-icon">🤝</div>
        <h2>成為我們的代理</h2>
        <p>推廣賺取佣金，輕鬆創業</p>
        
        <div class="apply-benefits">
          <div class="benefit-item">
            <span class="benefit-icon">💰</span>
            <div>
              <strong>5% 訂單返點</strong>
              <span>客戶每筆訂單您都有收益</span>
            </div>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📊</span>
            <div>
              <strong>即時數據</strong>
              <span>客戶消費、佣金一目了然</span>
            </div>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🔗</span>
            <div>
              <strong>專屬推廣碼</strong>
              <span>自定義您的品牌代碼</span>
            </div>
          </div>
        </div>

        <van-button 
          type="primary" 
          block 
          size="large"
          @click="showApplyDialog = true"
        >
          立即申請
        </van-button>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- 代理：儀表盤 -->
    <!-- ============================================ -->
    <template v-else>
      <van-loading v-if="loading" class="loading-state" />

      <template v-else-if="stats">
        <!-- 推廣卡片 -->
        <div class="promo-card">
          <div class="promo-header">
            <div class="promo-info">
              <span class="promo-label">我的推薦碼</span>
              <span class="promo-code">{{ stats.agentCode }}</span>
            </div>
            <van-button size="small" plain @click="copyCode">複製</van-button>
          </div>

          <div class="promo-link">
            <span>{{ stats.promotionLink }}</span>
            <van-button type="primary" size="small" @click="copyLink">
              複製鏈接
            </van-button>
          </div>

          <div class="qrcode-section">
            <img :src="qrcodeUrl" alt="推廣二維碼" class="qrcode-img" />
            <span class="qrcode-tip">掃碼即可註冊</span>
          </div>
        </div>

        <!-- 數據看板 -->
        <div class="stats-grid">
          <div class="stat-card highlight">
            <span class="stat-value">NT$ {{ stats.balance.toLocaleString() }}</span>
            <span class="stat-label">可提現餘額</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">NT$ {{ stats.monthEarnings.toLocaleString() }}</span>
            <span class="stat-label">本月收益</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">NT$ {{ stats.totalEarnings.toLocaleString() }}</span>
            <span class="stat-label">累計收益</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.clientCount }}</span>
            <span class="stat-label">客戶總數</span>
          </div>
        </div>

        <!-- 標籤頁 -->
        <van-tabs v-model:active="activeTab" sticky offset-top="46" color="#C0392B">
          <van-tab name="clients" title="我的客戶">
            <div class="tab-content">
              <van-empty v-if="clients.length === 0" description="暫無客戶" />
              <div v-else class="clients-list">
                <div v-for="client in clients" :key="client.id" class="client-card">
                  <div class="client-info">
                    <span class="client-name">{{ client.name }}</span>
                    <span class="client-email">{{ client.email }}</span>
                  </div>
                  <div class="client-stats">
                    <span>訂單 {{ client.orderCount }} | 包裹 {{ client.packageCount }}</span>
                    <span class="client-date">{{ formatDate(client.registeredAt) }} 註冊</span>
                  </div>
                </div>
              </div>
            </div>
          </van-tab>

          <van-tab name="commissions" title="佣金記錄">
            <div class="tab-content">
              <van-empty v-if="commissions.length === 0" description="暫無記錄" />
              <div v-else class="commissions-list">
                <div 
                  v-for="record in commissions" 
                  :key="record.id" 
                  class="commission-card"
                  :class="{ positive: record.amount > 0 }"
                >
                  <div class="commission-info">
                    <span class="commission-type">{{ formatCommissionType(record.type) }}</span>
                    <span class="commission-desc">{{ record.description }}</span>
                  </div>
                  <div class="commission-amount">
                    <span :class="record.amount > 0 ? 'positive' : 'negative'">
                      {{ record.amount > 0 ? '+' : '' }}{{ record.amount.toLocaleString() }}
                    </span>
                    <span class="commission-date">{{ formatDate(record.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </template>
    </template>

    <!-- ============================================ -->
    <!-- 申請彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showApplyDialog"
      title="申請成為代理"
      :show-confirm-button="false"
    >
      <div class="apply-form">
        <van-form @submit="applyAgent">
          <van-cell-group inset>
            <van-field
              v-model="applyForm.agentName"
              label="代理名稱"
              placeholder="您的品牌/店鋪名稱"
              required
              :disabled="applying"
            />
            <van-field
              v-model="applyForm.agentCode"
              label="推薦碼"
              placeholder="選填，如：DESIGNER_LIN"
              :disabled="applying"
            />
          </van-cell-group>

          <p class="apply-note">
            推薦碼將用於生成您的專屬推廣鏈接，建議使用易記的英文/數字組合。
          </p>

          <div class="form-actions">
            <van-button @click="showApplyDialog = false" :disabled="applying">
              取消
            </van-button>
            <van-button type="primary" native-type="submit" :loading="applying">
              提交申請
            </van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- 底部導航 -->
    <van-tabbar active-color="#C0392B" inactive-color="#999" fixed>
      <van-tabbar-item icon="shop-o" @click="router.push('/mall')">商城</van-tabbar-item>
      <van-tabbar-item icon="logistics" @click="router.push('/warehouse')">集運</van-tabbar-item>
      <van-tabbar-item icon="friends-o" :class="{ active: true }">代理</van-tabbar-item>
      <van-tabbar-item icon="user-o" @click="router.push('/dashboard')">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.agent-dashboard {
  min-height: 100vh;
  background: #F7F8FA;
  padding-bottom: 70px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

/* 申請入口 */
.apply-section {
  padding: 60px 24px;
  text-align: center;
}

.apply-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.apply-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.apply-section p {
  font-size: 14px;
  color: #666;
  margin: 0 0 32px;
}

.apply-benefits {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  text-align: left;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.benefit-icon {
  font-size: 28px;
}

.benefit-item strong {
  display: block;
  font-size: 15px;
  color: #333;
}

.benefit-item span {
  font-size: 12px;
  color: #999;
}

/* 推廣卡片 */
.promo-card {
  margin: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #C0392B 0%, #E74C3C 100%);
  border-radius: 16px;
  color: white;
}

.promo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.promo-label {
  font-size: 12px;
  opacity: 0.8;
}

.promo-code {
  display: block;
  font-size: 24px;
  font-weight: bold;
  font-family: 'DIN Alternate', monospace;
  letter-spacing: 2px;
  margin-top: 4px;
}

.promo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  margin-bottom: 16px;
}

.promo-link span {
  flex: 1;
  font-size: 11px;
  word-break: break-all;
  opacity: 0.9;
}

.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.qrcode-img {
  width: 140px;
  height: 140px;
  border-radius: 8px;
}

.qrcode-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 數據看板 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px 12px;
}

.stat-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.stat-card.highlight {
  grid-column: span 2;
  background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
  color: white;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  font-family: 'DIN Alternate', -apple-system, sans-serif;
  color: #C0392B;
}

.stat-card.highlight .stat-value {
  color: white;
  font-size: 28px;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.stat-card.highlight .stat-label {
  color: rgba(255, 255, 255, 0.7);
}

/* 標籤頁內容 */
.tab-content {
  padding: 12px;
}

/* 客戶列表 */
.clients-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.client-card {
  background: white;
  padding: 14px;
  border-radius: 12px;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.client-name {
  font-weight: 600;
  color: #333;
}

.client-email {
  font-size: 12px;
  color: #999;
}

.client-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.client-date {
  color: #999;
}

/* 佣金記錄 */
.commissions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.commission-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 14px;
  border-radius: 12px;
}

.commission-type {
  display: block;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.commission-desc {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.commission-amount {
  text-align: right;
}

.commission-amount .positive {
  color: #27AE60;
  font-size: 16px;
  font-weight: 600;
}

.commission-amount .negative {
  color: #E74C3C;
  font-size: 16px;
  font-weight: 600;
}

.commission-date {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

/* 申請表單 */
.apply-form {
  padding: 16px;
}

.apply-note {
  font-size: 12px;
  color: #999;
  padding: 0 16px;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.form-actions .van-button {
  flex: 1;
}
</style>
