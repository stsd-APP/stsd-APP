<script setup lang="ts">
// ============================================
// 管理員 - 裝櫃管理系統
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { containerApi, type Container } from '../../api/container'

const router = useRouter()
const authStore = useAuthStore()

// ============================================
// 權限檢查
// ============================================
onMounted(() => {
  if (!authStore.isAdmin) {
    showToast({ type: 'fail', message: '需要管理員權限' })
    router.push('/dashboard')
    return
  }
  fetchContainers()
  fetchAvailablePackages()
})

// ============================================
// 狀態
// ============================================
const containers = ref<Container[]>([])
const availablePackages = ref<any[]>([])
const selectedPackages = ref<string[]>([])
const loading = ref(false)
const activeTab = ref(0)

// 新建集裝箱
const showCreateDialog = ref(false)
const createForm = ref({
  containerNo: '',
  vesselName: '',
  voyageNo: '',
  etd: '',
  eta: '',
})
const creating = ref(false)

// 當前操作的集裝箱
const activeContainer = ref<Container | null>(null)
const showDetailDialog = ref(false)

// 狀態配置
const statusConfig: Record<string, { text: string; color: string }> = {
  LOADING: { text: '裝櫃中', color: '#ff976a' },
  SEALED: { text: '已封櫃', color: '#1989fa' },
  SHIPPED: { text: '已發船', color: '#7232dd' },
  ARRIVED: { text: '已到港', color: '#07c160' },
  CLEARED: { text: '已清關', color: '#ee0a24' },
  COMPLETED: { text: '已完成', color: '#969799' },
}

// ============================================
// API
// ============================================
async function fetchContainers() {
  loading.value = true
  try {
    const res = await containerApi.getList({ limit: 50 })
    if (res.data.success) {
      containers.value = res.data.data.containers
    }
  } catch (error) {
    console.error('獲取集裝箱列表失敗:', error)
  } finally {
    loading.value = false
  }
}

async function fetchAvailablePackages() {
  try {
    const res = await containerApi.getAvailablePackages({ limit: 100 })
    if (res.data.success) {
      availablePackages.value = res.data.data.packages
    }
  } catch (error) {
    console.error('獲取待裝櫃包裹失敗:', error)
  }
}

async function createContainer() {
  if (!createForm.value.containerNo.trim()) {
    showToast({ type: 'fail', message: '請輸入櫃號' })
    return
  }

  creating.value = true
  try {
    const res = await containerApi.create({
      containerNo: createForm.value.containerNo.trim().toUpperCase(),
      vesselName: createForm.value.vesselName || undefined,
      voyageNo: createForm.value.voyageNo || undefined,
      etd: createForm.value.etd || undefined,
      eta: createForm.value.eta || undefined,
    })

    if (res.data.success) {
      showSuccessToast('集裝箱創建成功')
      showCreateDialog.value = false
      createForm.value = { containerNo: '', vesselName: '', voyageNo: '', etd: '', eta: '' }
      await fetchContainers()
    }
  } catch (error: any) {
    showToast({ type: 'fail', message: error.response?.data?.message || '創建失敗' })
  } finally {
    creating.value = false
  }
}

async function loadPackages(containerId: string) {
  if (selectedPackages.value.length === 0) {
    showToast({ type: 'fail', message: '請先選擇包裹' })
    return
  }

  try {
    const res = await containerApi.loadPackages(containerId, selectedPackages.value)
    if (res.data.success) {
      showSuccessToast(res.data.message)
      selectedPackages.value = []
      await Promise.all([fetchContainers(), fetchAvailablePackages()])
    }
  } catch (error: any) {
    showToast({ type: 'fail', message: error.response?.data?.message || '裝櫃失敗' })
  }
}

async function sealContainer(containerId: string) {
  await showConfirmDialog({
    title: '確認封櫃',
    message: '封櫃後將無法繼續裝入包裹，確定要封櫃嗎？',
  })

  try {
    const res = await containerApi.seal(containerId)
    if (res.data.success) {
      showSuccessToast('已封櫃')
      await fetchContainers()
    }
  } catch (error: any) {
    showToast({ type: 'fail', message: error.response?.data?.message || '封櫃失敗' })
  }
}

async function updateStatus(containerId: string, status: string) {
  try {
    const res = await containerApi.updateStatus(containerId, status)
    if (res.data.success) {
      showSuccessToast('狀態已更新')
      await fetchContainers()
    }
  } catch (error: any) {
    showToast({ type: 'fail', message: error.response?.data?.message || '更新失敗' })
  }
}

async function viewDetail(container: Container) {
  try {
    const res = await containerApi.getDetail(container.id)
    if (res.data.success) {
      activeContainer.value = res.data.data
      showDetailDialog.value = true
    }
  } catch (error) {
    console.error('獲取詳情失敗:', error)
  }
}

async function exportPackingList(containerId: string) {
  try {
    const res = await containerApi.exportPackingList(containerId)
    const blob = new Blob([res.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PackingList_${activeContainer.value?.containerNo || 'export'}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    showSuccessToast('Packing List 已下載')
  } catch (error) {
    showToast({ type: 'fail', message: '導出失敗' })
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function togglePackageSelection(pkgId: string) {
  const index = selectedPackages.value.indexOf(pkgId)
  if (index > -1) {
    selectedPackages.value.splice(index, 1)
  } else {
    selectedPackages.value.push(pkgId)
  }
}
</script>

<template>
  <div class="container-manage">
    <!-- 導航欄 -->
    <van-nav-bar
      title="裝櫃管理"
      left-arrow
      @click-left="router.push('/admin')"
      fixed
      placeholder
    >
      <template #right>
        <van-button size="small" type="primary" @click="showCreateDialog = true">
          + 新建櫃子
        </van-button>
      </template>
    </van-nav-bar>

    <!-- Tab 切換 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46">
      <!-- 集裝箱列表 Tab -->
      <van-tab title="集裝箱列表">
        <van-empty v-if="containers.length === 0 && !loading" description="暫無集裝箱" />

        <div v-else class="container-list">
          <div
            v-for="container in containers"
            :key="container.id"
            class="container-card"
            @click="viewDetail(container)"
          >
            <div class="card-header">
              <span class="container-no">🚢 {{ container.containerNo }}</span>
              <van-tag :color="statusConfig[container.status]?.color">
                {{ statusConfig[container.status]?.text }}
              </van-tag>
            </div>
            <div class="card-body">
              <div class="info-row" v-if="container.vesselName">
                <span class="label">船名/航次</span>
                <span class="value">{{ container.vesselName }} / {{ container.voyageNo || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">預計到港</span>
                <span class="value">{{ formatDate(container.eta) }}</span>
              </div>
              <div class="info-row">
                <span class="label">包裹數量</span>
                <span class="value highlight">{{ container.packageCount || container.totalPieces }} 件</span>
              </div>
            </div>
            <div class="card-actions" @click.stop>
              <van-button 
                v-if="container.status === 'LOADING'" 
                size="small" 
                type="warning"
                @click="sealContainer(container.id)"
              >
                封櫃
              </van-button>
              <van-button 
                v-if="container.status === 'SEALED'" 
                size="small" 
                type="primary"
                @click="updateStatus(container.id, 'SHIPPED')"
              >
                發船
              </van-button>
            </div>
          </div>
        </div>
      </van-tab>

      <!-- 裝櫃操作 Tab -->
      <van-tab :title="`待裝櫃 (${availablePackages.length})`">
        <div class="load-section">
          <!-- 選擇目標櫃子 -->
          <div class="target-container" v-if="containers.filter(c => c.status === 'LOADING').length > 0">
            <h3>選擇目標櫃子</h3>
            <div class="target-list">
              <div
                v-for="container in containers.filter(c => c.status === 'LOADING')"
                :key="container.id"
                class="target-item"
              >
                <span>{{ container.containerNo }}</span>
                <van-button 
                  size="small" 
                  type="success"
                  :disabled="selectedPackages.length === 0"
                  @click="loadPackages(container.id)"
                >
                  裝入此櫃 ({{ selectedPackages.length }})
                </van-button>
              </div>
            </div>
          </div>

          <van-empty v-else description="沒有可裝入的櫃子，請先創建櫃子" />

          <!-- 待裝櫃包裹列表 -->
          <div class="packages-section">
            <h3>待裝櫃包裹 ({{ availablePackages.length }})</h3>
            <van-empty v-if="availablePackages.length === 0" description="沒有待裝櫃的包裹" />

            <div v-else class="packages-list">
              <div
                v-for="pkg in availablePackages"
                :key="pkg.id"
                class="package-item"
                :class="{ selected: selectedPackages.includes(pkg.id) }"
                @click="togglePackageSelection(pkg.id)"
              >
                <van-checkbox :model-value="selectedPackages.includes(pkg.id)" />
                <div class="pkg-info">
                  <div class="pkg-tracking">{{ pkg.trackingNumber }}</div>
                  <div class="pkg-meta">
                    <span>{{ pkg.user?.email }}</span>
                    <span v-if="pkg.weight">{{ pkg.weight }}kg</span>
                    <span v-if="pkg.volume">{{ pkg.volume }}m³</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- ============================================ -->
    <!-- 新建集裝箱彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showCreateDialog"
      title="新建集裝箱"
      :show-confirm-button="false"
    >
      <div class="create-form">
        <van-form @submit="createContainer">
          <van-cell-group inset>
            <van-field
              v-model="createForm.containerNo"
              label="櫃號"
              placeholder="如: MSKU1234567"
              required
              :disabled="creating"
            />
            <van-field
              v-model="createForm.vesselName"
              label="船名"
              placeholder="選填"
              :disabled="creating"
            />
            <van-field
              v-model="createForm.voyageNo"
              label="航次"
              placeholder="選填"
              :disabled="creating"
            />
            <van-field
              v-model="createForm.etd"
              label="預計離港"
              type="date"
              placeholder="選填"
              :disabled="creating"
            />
            <van-field
              v-model="createForm.eta"
              label="預計到港"
              type="date"
              placeholder="選填"
              :disabled="creating"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button @click="showCreateDialog = false" :disabled="creating">取消</van-button>
            <van-button type="primary" native-type="submit" :loading="creating">創建</van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- ============================================ -->
    <!-- 集裝箱詳情彈窗 -->
    <!-- ============================================ -->
    <van-popup
      v-model:show="showDetailDialog"
      position="bottom"
      round
      :style="{ height: '85%' }"
      closeable
    >
      <div class="detail-popup" v-if="activeContainer">
        <div class="detail-header">
          <h2>🚢 {{ activeContainer.containerNo }}</h2>
          <van-tag :color="statusConfig[activeContainer.status]?.color" size="large">
            {{ statusConfig[activeContainer.status]?.text }}
          </van-tag>
        </div>

        <div class="detail-info">
          <div class="info-row">
            <span class="label">船名/航次</span>
            <span class="value">{{ activeContainer.vesselName || '-' }} / {{ activeContainer.voyageNo || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">預計離港</span>
            <span class="value">{{ formatDate(activeContainer.etd) }}</span>
          </div>
          <div class="info-row">
            <span class="label">預計到港</span>
            <span class="value highlight">{{ formatDate(activeContainer.eta) }}</span>
          </div>
          <div class="info-row">
            <span class="label">總件數</span>
            <span class="value">{{ activeContainer.packages?.length || 0 }} 件</span>
          </div>
          <div class="info-row">
            <span class="label">總重量</span>
            <span class="value">{{ activeContainer.totalWeight?.toFixed(2) || 0 }} kg</span>
          </div>
          <div class="info-row">
            <span class="label">總體積</span>
            <span class="value">{{ activeContainer.totalVolume?.toFixed(4) || 0 }} CBM</span>
          </div>
        </div>

        <!-- 櫃內包裹列表 -->
        <div class="packages-in-container">
          <h3>櫃內包裹 ({{ activeContainer.packages?.length || 0 }})</h3>
          <div class="pkg-list">
            <div v-for="pkg in activeContainer.packages" :key="pkg.id" class="pkg-row">
              <span class="pkg-tracking">{{ pkg.trackingNumber }}</span>
              <span class="pkg-desc">{{ pkg.description || '-' }}</span>
              <span class="pkg-weight">{{ pkg.weight || 0 }}kg</span>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="detail-actions">
          <van-button 
            type="primary" 
            block 
            @click="exportPackingList(activeContainer.id)"
          >
            📥 導出 Packing List
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.container-manage {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 集裝箱列表 */
.container-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.container-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.container-no {
  font-size: 16px;
  font-weight: bold;
  font-family: monospace;
}

.card-body .info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.info-row .label {
  color: #999;
}

.info-row .value {
  color: #333;
}

.info-row .value.highlight {
  color: #1989fa;
  font-weight: 600;
}

.card-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  gap: 8px;
}

/* 裝櫃操作 */
.load-section {
  padding: 16px;
}

.target-container h3,
.packages-section h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.target-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 12px;
  border-radius: 8px;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.package-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.package-item.selected {
  background: #e6f7ff;
  border: 1px solid #1989fa;
}

.pkg-info {
  flex: 1;
}

.pkg-tracking {
  font-weight: 600;
  font-family: monospace;
}

.pkg-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.pkg-meta span {
  margin-right: 12px;
}

/* 創建表單 */
.create-form {
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

/* 詳情彈窗 */
.detail-popup {
  padding: 20px;
  padding-bottom: 40px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-header h2 {
  font-size: 20px;
  margin: 0;
}

.detail-info {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.detail-info .info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.packages-in-container h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.pkg-list {
  max-height: 200px;
  overflow-y: auto;
  background: #f9f9f9;
  border-radius: 8px;
}

.pkg-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.pkg-row:last-child {
  border-bottom: none;
}

.pkg-row .pkg-tracking {
  font-family: monospace;
}

.pkg-row .pkg-desc {
  flex: 1;
  text-align: center;
  color: #666;
}

.pkg-row .pkg-weight {
  color: #999;
}

.detail-actions {
  margin-top: 20px;
}
</style>
