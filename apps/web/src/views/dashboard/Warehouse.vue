<script setup lang="ts">
// ============================================
// 我的家具 - 倉庫地址 + 配送追蹤
// ============================================
// 垂直化：包裹→貨物，集運→專線直送
// 含驗貨報告 (QC Report) 展示
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showImagePreview } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { packageApi, type Package, type Warehouse } from '../../api/package'

const router = useRouter()
const authStore = useAuthStore()

// ============================================
// 狀態
// ============================================
const warehouse = ref<Warehouse | null>(null)
const packages = ref<Package[]>([])
const loading = ref(false)
const refreshing = ref(false)
const showPredictDialog = ref(false)
const showLogisticsSheet = ref(false)
const submitting = ref(false)

const stats = ref({
  PREDICTED: 0,
  IN_WAREHOUSE: 0,
  PACKED: 0,
  SHIPPED: 0,
  DELIVERED: 0,
})

// 預報表單
const predictForm = ref({
  trackingNumber: '',
  logisticsCompany: '',
  description: '',
})

// 驗貨報告彈窗
const showQcReportDialog = ref(false)
const selectedPackage = ref<Package | null>(null)

// 物流公司選項
const logisticsOptions = [
  { name: '順豐速運' },
  { name: '中通快遞' },
  { name: '圓通速遞' },
  { name: '韻達快遞' },
  { name: '申通快遞' },
  { name: '極兔速遞' },
  { name: '郵政EMS' },
  { name: '德邦快遞' },
  { name: '其他' },
]

// 狀態配置
const statusConfig: Record<string, { text: string; color: string; icon: string }> = {
  PREDICTED: { text: '待入庫', color: '#ff976a', icon: 'clock-o' },
  IN_WAREHOUSE: { text: '已入庫', color: '#07c160', icon: 'checked' },
  PACKED: { text: '已打包', color: '#1989fa', icon: 'gift-o' },
  SHIPPED: { text: '已發貨', color: '#7232dd', icon: 'logistics' },
  DELIVERED: { text: '已簽收', color: '#969799', icon: 'success' },
}

// ============================================
// 計算屬性
// ============================================
const memberId = computed(() => authStore.user?.id?.slice(-8) || 'XXXXXX')

const warehouseAddress = computed(() => {
  if (!warehouse.value) return ''
  const w = warehouse.value
  return `${w.province}${w.city}${w.district}${w.address}`
})

// 1688/淘寶收貨格式 (帶會員ID)
const formatted1688Address = computed(() => {
  if (!warehouse.value) return ''
  const w = warehouse.value
  return `收貨人：${w.contactName}(ID:${memberId.value})\n電話：${w.phone}\n地址：${w.province}${w.city}${w.district}${w.address}${w.postalCode ? `\n郵編：${w.postalCode}` : ''}`
})

// 簡版複製 (單行)
const simpleAddress = computed(() => {
  if (!warehouse.value) return ''
  const w = warehouse.value
  return `${w.contactName}(ID:${memberId.value}) ${w.phone} ${w.province}${w.city}${w.district}${w.address}`
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

async function fetchPackages() {
  loading.value = true
  try {
    const res = await packageApi.getMyPackages({ page: 1, limit: 50 })
    if (res.data.success) {
      packages.value = res.data.data.packages
      stats.value = res.data.data.stats
    }
  } catch (error) {
    console.error('獲取貨物失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await Promise.all([fetchWarehouse(), fetchPackages()])
  refreshing.value = false
}

async function submitPredict() {
  if (!predictForm.value.trackingNumber.trim()) {
    showToast({ type: 'fail', message: '請輸入快遞單號' })
    return
  }

  submitting.value = true
  try {
    const res = await packageApi.create({
      trackingNumber: predictForm.value.trackingNumber.trim(),
      logisticsCompany: predictForm.value.logisticsCompany,
      description: predictForm.value.description,
    })

    if (res.data.success) {
      showSuccessToast('預報成功')
      showPredictDialog.value = false
      predictForm.value = { trackingNumber: '', logisticsCompany: '', description: '' }
      await fetchPackages()
    }
  } catch (error) {
    console.error('預報失敗:', error)
  } finally {
    submitting.value = false
  }
}

// 複製 1688 格式地址
function copy1688Address() {
  if (!formatted1688Address.value) return
  navigator.clipboard.writeText(formatted1688Address.value)
  showSuccessToast('已複製 1688 收貨格式')
}

// 複製簡版地址
function copySimpleAddress() {
  if (!simpleAddress.value) return
  navigator.clipboard.writeText(simpleAddress.value)
  showSuccessToast('已複製地址')
}

function onSelectLogistics(item: { name: string }) {
  predictForm.value.logisticsCompany = item.name
  showLogisticsSheet.value = false
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 查看驗貨報告
function viewQcReport(pkg: Package) {
  selectedPackage.value = pkg
  showQcReportDialog.value = true
}

// 預覽驗貨圖片
function previewQcImages(images: string[], index: number) {
  showImagePreview({
    images,
    startPosition: index,
    closeable: true,
  })
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="warehouse-page">
    <!-- 導航欄 -->
    <van-nav-bar title="我的家具" fixed placeholder>
      <template #right>
        <van-icon name="question-o" size="20" @click="showToast('客服熱線：020-12345678')" />
      </template>
    </van-nav-bar>

    <!-- ============================================ -->
    <!-- 專線倉地址卡片 -->
    <!-- ============================================ -->
    <div class="warehouse-hero">
      <div class="hero-header">
        <div class="hero-icon">🏠</div>
        <div class="hero-title">
          <h2>家具專線收貨倉</h2>
          <p>在 1688 購買家具時，請使用此地址</p>
        </div>
      </div>

      <div class="address-card" v-if="warehouse">
        <div class="address-row highlight">
          <span class="row-label">收貨人</span>
          <span class="row-value">
            {{ warehouse.contactName }}
            <strong class="member-badge">(ID:{{ memberId }})</strong>
          </span>
        </div>
        <div class="address-row">
          <span class="row-label">電話</span>
          <span class="row-value">{{ warehouse.phone }}</span>
        </div>
        <div class="address-row">
          <span class="row-label">地址</span>
          <span class="row-value">{{ warehouseAddress }}</span>
        </div>
        <div class="address-row" v-if="warehouse.postalCode">
          <span class="row-label">郵編</span>
          <span class="row-value">{{ warehouse.postalCode }}</span>
        </div>
      </div>

      <!-- 複製按鈕區 -->
      <div class="copy-buttons">
        <van-button 
          type="danger" 
          size="large" 
          icon="link-o" 
          @click="copy1688Address"
          class="copy-main-btn"
        >
          複製 1688 收貨格式
        </van-button>
        <van-button 
          plain 
          size="small" 
          @click="copySimpleAddress"
        >
          複製簡版
        </van-button>
      </div>

      <!-- 重要提醒 -->
      <div class="warning-box">
        <van-icon name="warning-o" size="18" />
        <div>
          <strong>重要提醒</strong>
          <p>收件人名字後面必須帶上您的會員ID <strong>(ID:{{ memberId }})</strong>，否則貨物無法識別歸屬！</p>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 貨物預報入口 -->
    <!-- ============================================ -->
    <div class="predict-section">
      <van-button
        type="primary"
        block
        size="large"
        color="linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)"
        @click="showPredictDialog = true"
      >
        <van-icon name="scan" class="mr-2" />
        家具預報
      </van-button>
      <p class="predict-tip">賣家發貨後，請及時預報快遞單號，方便倉庫接收您的家具</p>
    </div>

    <!-- ============================================ -->
    <!-- 貨物統計 -->
    <!-- ============================================ -->
    <div class="stats-row">
      <div class="stat-item" v-for="(config, status) in statusConfig" :key="status">
        <span class="stat-num" :style="{ color: config.color }">{{ stats[status as keyof typeof stats] || 0 }}</span>
        <span class="stat-label">{{ config.text }}</span>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 貨物列表 -->
    <!-- ============================================ -->
    <div class="packages-section">
      <div class="section-header">
        <h3>我的家具</h3>
        <van-button size="small" icon="replay" @click="refresh" :loading="refreshing">刷新</van-button>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="refresh">
        <van-empty v-if="packages.length === 0 && !loading" description="暫無家具配送記錄">
          <van-button type="primary" size="small" @click="showPredictDialog = true">預報家具</van-button>
        </van-empty>

        <div v-else class="packages-list">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="package-card"
            :style="{ borderLeftColor: statusConfig[pkg.status]?.color }"
            @click="router.push(`/tracking/${pkg.id}`)"
          >
            <div class="package-header">
              <div class="tracking-info">
                <van-icon :name="statusConfig[pkg.status]?.icon" :color="statusConfig[pkg.status]?.color" />
                <span class="tracking-number">{{ pkg.trackingNumber }}</span>
              </div>
              <div class="header-right">
                <van-tag :color="statusConfig[pkg.status]?.color" plain>
                  {{ statusConfig[pkg.status]?.text }}
                </van-tag>
                <van-icon name="arrow" size="14" color="#999" />
              </div>
            </div>

            <div class="package-body">
              <div class="info-row" v-if="pkg.logisticsCompany">
                <span class="info-label">物流公司</span>
                <span class="info-value">{{ pkg.logisticsCompany }}</span>
              </div>
              <div class="info-row" v-if="pkg.description">
                <span class="info-label">物品名稱</span>
                <span class="info-value">{{ pkg.description }}</span>
              </div>
              <div class="info-row" v-if="pkg.weight">
                <span class="info-label">重量</span>
                <span class="info-value">{{ pkg.weight }} kg</span>
              </div>
            </div>

            <!-- ============================================ -->
            <!-- 驗貨報告卡片 -->
            <!-- ============================================ -->
            <div 
              v-if="(pkg as any).qcReport" 
              class="qc-report-card"
              :class="{ passed: (pkg as any).qcReport.status === 'PASSED', issue: (pkg as any).qcReport.status === 'ISSUE_FOUND' }"
              @click="viewQcReport(pkg)"
            >
              <div class="qc-header">
                <span class="qc-badge">🛡️ 官方驗貨報告</span>
                <van-tag :color="(pkg as any).qcReport.statusColor" size="small">
                  {{ (pkg as any).qcReport.statusText }}
                </van-tag>
              </div>
              <div class="qc-preview">
                <div 
                  v-for="(img, idx) in (pkg as any).qcReport.images.slice(0, 3)" 
                  :key="idx"
                  class="qc-thumb"
                >
                  <img :src="img" @click.stop="previewQcImages((pkg as any).qcReport.images, idx)" />
                </div>
                <div v-if="(pkg as any).qcReport.images.length > 3" class="qc-more">
                  +{{ (pkg as any).qcReport.images.length - 3 }}
                </div>
              </div>
              <div class="qc-message">{{ (pkg as any).qcReport.message }}</div>
              <div class="qc-footer-tip">本次驗貨為您攔截了 99% 的潛在售後風險</div>
            </div>

            <div class="package-footer">
              <span class="time">預報時間：{{ formatDate(pkg.createdAt) }}</span>
              <span class="time" v-if="pkg.inboundAt">入庫時間：{{ formatDate(pkg.inboundAt) }}</span>
            </div>
          </div>
        </div>
      </van-pull-refresh>
    </div>

    <!-- ============================================ -->
    <!-- 預報彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showPredictDialog"
      title="家具預報"
      :show-confirm-button="false"
      :close-on-click-overlay="false"
    >
      <div class="predict-form">
        <van-form @submit="submitPredict">
          <van-cell-group inset>
            <van-field
              v-model="predictForm.trackingNumber"
              label="快遞單號"
              placeholder="請輸入或掃描快遞單號"
              required
              clearable
              :disabled="submitting"
            />
            
            <van-field
              v-model="predictForm.logisticsCompany"
              is-link
              readonly
              label="物流公司"
              placeholder="請選擇"
              @click="showLogisticsSheet = true"
            />
            
            <van-field
              v-model="predictForm.description"
              label="物品名稱"
              placeholder="如：沙發配件、床墊等"
              :disabled="submitting"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button @click="showPredictDialog = false" :disabled="submitting">取消</van-button>
            <van-button type="primary" native-type="submit" :loading="submitting">確認預報</van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- 物流公司選擇 -->
    <van-action-sheet
      v-model:show="showLogisticsSheet"
      :actions="logisticsOptions"
      cancel-text="取消"
      @select="onSelectLogistics"
    />

    <!-- ============================================ -->
    <!-- 驗貨報告詳情彈窗 -->
    <!-- ============================================ -->
    <van-popup
      v-model:show="showQcReportDialog"
      position="bottom"
      round
      :style="{ height: '80%' }"
      closeable
    >
      <div class="qc-detail-popup" v-if="selectedPackage && (selectedPackage as any).qcReport">
        <div class="qc-detail-header">
          <h2>🛡️ 官方驗貨報告</h2>
          <p class="tracking">{{ selectedPackage.trackingNumber }}</p>
        </div>

        <div class="qc-status-banner" :class="{ passed: (selectedPackage as any).qcReport.status === 'PASSED', issue: (selectedPackage as any).qcReport.status === 'ISSUE_FOUND' }">
          <span class="status-icon">{{ (selectedPackage as any).qcReport.status === 'PASSED' ? '✅' : '⚠️' }}</span>
          <div class="status-text">
            <strong>{{ (selectedPackage as any).qcReport.statusText }}</strong>
            <span>{{ (selectedPackage as any).qcReport.message }}</span>
          </div>
        </div>

        <!-- 驗貨實拍圖 -->
        <div class="qc-images-section">
          <h3>倉庫實拍圖</h3>
          <div class="qc-images-grid">
            <div 
              v-for="(img, idx) in (selectedPackage as any).qcReport.images" 
              :key="idx"
              class="qc-image-item"
              @click="previewQcImages((selectedPackage as any).qcReport.images, idx)"
            >
              <img :src="img" />
            </div>
          </div>
        </div>

        <!-- 驗貨備註 -->
        <div class="qc-note-section" v-if="(selectedPackage as any).qcReport.note">
          <h3>驗貨備註</h3>
          <p>{{ (selectedPackage as any).qcReport.note }}</p>
        </div>

        <!-- 加固狀態 -->
        <div class="qc-reinforce" v-if="(selectedPackage as any).qcReport.isReinforced">
          <van-icon name="checked" color="#07c160" />
          <span>已打木架/加固包裝</span>
        </div>

        <!-- 驗貨時間 -->
        <div class="qc-time" v-if="(selectedPackage as any).qcReport.qcAt">
          驗貨時間：{{ formatDate((selectedPackage as any).qcReport.qcAt) }}
        </div>

        <!-- 信任提示 -->
        <div class="qc-trust-tip">
          <span class="tip-icon">💡</span>
          <span>本次驗貨為您攔截了 99% 的潛在售後風險，如有問題我們全額賠付。</span>
        </div>
      </div>
    </van-popup>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar :model-value="2" active-color="#C0392B" fixed>
      <van-tabbar-item icon="shop-o" @click="router.push('/mall')">家具</van-tabbar-item>
      <van-tabbar-item icon="calculator" @click="router.push('/calculator')">運費</van-tabbar-item>
      <van-tabbar-item icon="logistics">配送</van-tabbar-item>
      <van-tabbar-item icon="user-o" @click="router.push('/dashboard')">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.warehouse-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

/* 倉庫地址英雄區 */
.warehouse-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
  margin: 12px;
  border-radius: 16px;
  color: white;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.hero-icon {
  font-size: 36px;
}

.hero-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.hero-title p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

/* 地址卡片 */
.address-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.address-row {
  display: flex;
  padding: 8px 0;
  font-size: 14px;
  color: #333;
}

.address-row.highlight {
  background: #fff5f5;
  margin: -4px -8px 4px;
  padding: 12px 8px;
  border-radius: 8px;
}

.row-label {
  color: #999;
  width: 50px;
  flex-shrink: 0;
}

.row-value {
  flex: 1;
  color: #333;
}

.member-badge {
  color: #ee0a24;
  font-size: 13px;
  background: #fff0f0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

/* 複製按鈕 */
.copy-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.copy-main-btn {
  flex: 1;
}

/* 警告框 */
.warning-box {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.warning-box strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}

.warning-box p {
  margin: 0;
  opacity: 0.9;
}

.warning-box p strong {
  display: inline;
  color: #ffeb3b;
}

/* 預報區域 */
.predict-section {
  margin: 16px 12px;
}

.predict-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 統計行 */
.stats-row {
  display: flex;
  justify-content: space-around;
  background: white;
  margin: 12px;
  padding: 16px 0;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 20px;
  font-weight: bold;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* 包裹列表 */
.packages-section {
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

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.package-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.package-card:active {
  background: #f9f9f9;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tracking-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tracking-number {
  font-weight: 600;
  font-family: monospace;
}

.package-body {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
}

.package-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

/* 預報表單 */
.predict-form {
  padding: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}

/* ============================================
   驗貨報告卡片 (內嵌在包裹卡片中)
   ============================================ */
.qc-report-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
}

.qc-report-card.passed {
  background: linear-gradient(135deg, #e6fff0 0%, #d4f5e3 100%);
  border: 1px solid #b7eb8f;
}

.qc-report-card.issue {
  background: linear-gradient(135deg, #fff0f0 0%, #ffe8e8 100%);
  border: 1px solid #ffa39e;
}

.qc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.qc-badge {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.qc-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.qc-thumb {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
}

.qc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qc-more {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.qc-message {
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
}

.qc-footer-tip {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

/* ============================================
   驗貨報告詳情彈窗
   ============================================ */
.qc-detail-popup {
  padding: 20px;
  padding-bottom: 40px;
}

.qc-detail-header {
  text-align: center;
  margin-bottom: 20px;
}

.qc-detail-header h2 {
  font-size: 20px;
  margin: 0;
}

.qc-detail-header .tracking {
  font-family: monospace;
  color: #666;
  margin: 8px 0 0;
}

.qc-status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.qc-status-banner.passed {
  background: linear-gradient(135deg, #e6fff0 0%, #b7eb8f 100%);
}

.qc-status-banner.issue {
  background: linear-gradient(135deg, #fff0f0 0%, #ffa39e 100%);
}

.status-icon {
  font-size: 32px;
}

.status-text {
  display: flex;
  flex-direction: column;
}

.status-text strong {
  font-size: 16px;
  color: #333;
}

.status-text span {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.qc-images-section,
.qc-note-section {
  margin-bottom: 20px;
}

.qc-images-section h3,
.qc-note-section h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.qc-images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.qc-image-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.qc-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qc-note-section p {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.qc-reinforce {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #e6fff0;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #07c160;
}

.qc-time {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin-bottom: 16px;
}

.qc-trust-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #fff8e6 0%, #fff3cd 100%);
  border-radius: 8px;
  font-size: 13px;
  color: #856404;
  line-height: 1.5;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}
</style>
