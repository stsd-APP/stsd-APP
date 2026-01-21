<script setup lang="ts">
// ============================================
// 物流軌跡頁面 - 精細化時間線
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showImagePreview } from 'vant'
import { packageApi } from '../../api/package'

const router = useRouter()
const route = useRoute()
const packageId = route.params.id as string

// ============================================
// 狀態
// ============================================
const loading = ref(true)
const packageData = ref<any>(null)
const timeline = ref<any[]>([])
const containerInfo = ref<any>(null)
const currentStatus = ref('')
const currentStatusText = ref('')

// ============================================
// 狀態圖標映射
// ============================================
const statusIconMap: Record<string, string> = {
  WAREHOUSE_IN: '📦',
  LOADED: '🚛',
  SHIPPED: '🚢',
  ARRIVED_PORT: '⚓',
  CUSTOMS_CLEAR: '📋',
  DISPATCHING: '🚚',
  DELIVERED: '✅',
}

// ============================================
// API
// ============================================
async function fetchTracking() {
  loading.value = true
  try {
    const res = await packageApi.getTracking(packageId)
    if (res.data.success) {
      packageData.value = res.data.data.package
      timeline.value = res.data.data.timeline
      containerInfo.value = res.data.data.containerInfo
      currentStatus.value = res.data.data.currentStatus
      currentStatusText.value = res.data.data.currentStatusText
    }
  } catch (error) {
    console.error('獲取物流軌跡失敗:', error)
    showToast({ type: 'fail', message: '獲取物流軌跡失敗' })
  } finally {
    loading.value = false
  }
}

// 格式化時間
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 查看驗貨圖片
function viewQcImages() {
  if (packageData.value?.qcReport?.images?.length) {
    showImagePreview({
      images: packageData.value.qcReport.images,
      closeable: true,
    })
  }
}

onMounted(() => {
  fetchTracking()
})
</script>

<template>
  <div class="tracking-page">
    <!-- 導航欄 -->
    <van-nav-bar
      title="物流軌跡"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <van-loading v-if="loading" class="page-loading" />

    <template v-else-if="packageData">
      <!-- ============================================ -->
      <!-- 當前狀態卡片 -->
      <!-- ============================================ -->
      <div class="status-hero">
        <div class="status-icon">{{ statusIconMap[currentStatus] || '📦' }}</div>
        <div class="status-text">{{ currentStatusText || '處理中' }}</div>
        <div class="tracking-number">單號: {{ packageData.trackingNumber }}</div>
      </div>

      <!-- ============================================ -->
      <!-- 集裝箱信息 (如果已裝櫃) -->
      <!-- ============================================ -->
      <div class="container-card" v-if="containerInfo">
        <div class="container-header">
          <span class="container-icon">🚢</span>
          <span class="container-title">集裝箱信息</span>
        </div>
        <div class="container-info">
          <div class="info-row">
            <span class="label">櫃號</span>
            <span class="value highlight">{{ containerInfo.containerNo }}</span>
          </div>
          <div class="info-row" v-if="containerInfo.vesselName">
            <span class="label">船名/航次</span>
            <span class="value">{{ containerInfo.vesselName }} / {{ containerInfo.voyageNo || '-' }}</span>
          </div>
          <div class="info-row" v-if="containerInfo.etd">
            <span class="label">預計離港</span>
            <span class="value">{{ formatDate(containerInfo.etd) }}</span>
          </div>
          <div class="info-row" v-if="containerInfo.eta">
            <span class="label">預計到港</span>
            <span class="value highlight">{{ formatDate(containerInfo.eta) }}</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 驗貨報告 (如果有) -->
      <!-- ============================================ -->
      <div 
        class="qc-card" 
        v-if="packageData.qcReport"
        :class="{ passed: packageData.qcReport.status === 'PASSED' }"
        @click="viewQcImages"
      >
        <div class="qc-header">
          <span class="qc-icon">🛡️</span>
          <span class="qc-title">官方驗貨報告</span>
          <van-tag :color="packageData.qcReport.statusColor" size="small">
            {{ packageData.qcReport.statusText }}
          </van-tag>
        </div>
        <div class="qc-message">{{ packageData.qcReport.message }}</div>
        <div class="qc-images" v-if="packageData.qcReport.images?.length">
          <div 
            v-for="(img, idx) in packageData.qcReport.images.slice(0, 4)" 
            :key="idx"
            class="qc-thumb"
          >
            <img :src="img" />
          </div>
          <div v-if="packageData.qcReport.images.length > 4" class="qc-more">
            +{{ packageData.qcReport.images.length - 4 }}
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 物流時間線 -->
      <!-- ============================================ -->
      <div class="timeline-section">
        <h3 class="section-title">物流軌跡</h3>
        
        <van-empty v-if="timeline.length === 0" description="暫無物流信息">
          <template #description>
            <p style="color: #999; font-size: 12px">貨物入庫後將顯示物流軌跡</p>
          </template>
        </van-empty>

        <van-steps 
          v-else
          direction="vertical" 
          :active="timeline.length - 1"
          active-color="#07c160"
        >
          <van-step v-for="(event, index) in [...timeline].reverse()" :key="index">
            <div class="step-content">
              <div class="step-header">
                <span class="step-icon">{{ event.icon }}</span>
                <span class="step-status">{{ event.text }}</span>
                <span class="step-time">{{ formatTime(event.time) }}</span>
              </div>
              <div class="step-desc" v-if="event.description">
                {{ event.description }}
              </div>
              <div class="step-location" v-if="event.location">
                📍 {{ event.location }}
              </div>
            </div>
          </van-step>
        </van-steps>
      </div>

      <!-- ============================================ -->
      <!-- 包裹信息 -->
      <!-- ============================================ -->
      <div class="package-info">
        <h3 class="section-title">包裹信息</h3>
        <div class="info-card">
          <div class="info-row" v-if="packageData.description">
            <span class="label">物品描述</span>
            <span class="value">{{ packageData.description }}</span>
          </div>
          <div class="info-row" v-if="packageData.weight">
            <span class="label">重量</span>
            <span class="value">{{ packageData.weight }} kg</span>
          </div>
          <div class="info-row" v-if="packageData.volume">
            <span class="label">體積</span>
            <span class="value">{{ packageData.volume }} m³</span>
          </div>
          <div class="info-row" v-if="packageData.logisticsCompany">
            <span class="label">物流公司</span>
            <span class="value">{{ packageData.logisticsCompany }}</span>
          </div>
        </div>
      </div>

      <!-- 底部占位 -->
      <div style="height: 80px"></div>
    </template>

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
.tracking-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

.page-loading {
  padding: 100px 0;
  text-align: center;
}

/* 狀態英雄區 */
.status-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  text-align: center;
  color: white;
}

.status-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.status-text {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
}

.tracking-number {
  font-size: 14px;
  opacity: 0.8;
  font-family: monospace;
}

/* 集裝箱卡片 */
.container-card {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.container-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eee;
}

.container-icon {
  font-size: 24px;
}

.container-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.container-info .info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.container-info .label {
  color: #999;
}

.container-info .value {
  color: #333;
}

.container-info .value.highlight {
  color: #1989fa;
  font-weight: 600;
}

/* 驗貨卡片 */
.qc-card {
  margin: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-radius: 12px;
  border: 1px solid #ffd5d5;
  cursor: pointer;
}

.qc-card.passed {
  background: linear-gradient(135deg, #e6fff0 0%, #d4f5e3 100%);
  border-color: #b7eb8f;
}

.qc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.qc-icon {
  font-size: 20px;
}

.qc-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.qc-message {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.qc-images {
  display: flex;
  gap: 8px;
}

.qc-thumb {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
}

.qc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qc-more {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* 時間線區域 */
.timeline-section {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #333;
}

.step-content {
  padding: 4px 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.step-icon {
  font-size: 16px;
}

.step-status {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.step-time {
  font-size: 12px;
  color: #999;
}

.step-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  padding-left: 24px;
}

.step-location {
  font-size: 12px;
  color: #999;
  padding-left: 24px;
}

/* 包裹信息 */
.package-info {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.info-card .info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}

.info-card .info-row:last-child {
  border-bottom: none;
}

.info-card .label {
  color: #999;
}

.info-card .value {
  color: #333;
}
</style>
