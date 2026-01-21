<script setup lang="ts">
// ============================================
// 管理員 - 倉庫操作台
// 含驗貨拍照 (QC Report) 功能
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showImagePreview } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { packageApi, type Package } from '../../api/package'

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
  fetchPackages()
  fetchPendingQc()
})

// ============================================
// 狀態
// ============================================
const searchNumber = ref('')
const searchResult = ref<Package | null>(null)
const searching = ref(false)
const packages = ref<Package[]>([])
const pendingQcPackages = ref<Package[]>([])
const loading = ref(false)
const refreshing = ref(false)
const activeTab = ref(0) // 0: 入庫, 1: 驗貨

// 入庫表單
const showInboundDialog = ref(false)
const inboundTarget = ref<Package | null>(null)
const inboundForm = ref({
  weight: '',
  volume: '',
  remark: '',
})
const submitting = ref(false)

// 驗貨表單
const showQcDialog = ref(false)
const qcTarget = ref<Package | null>(null)
const qcForm = ref({
  qcStatus: 'PASSED' as 'PASSED' | 'ISSUE_FOUND',
  qcImages: [] as string[],
  qcNote: '',
  isReinforced: false,
})
const qcSubmitting = ref(false)

// 統計
const stats = ref({
  PREDICTED: 0,
  IN_WAREHOUSE: 0,
  PACKED: 0,
  SHIPPED: 0,
  DELIVERED: 0,
})

// 狀態配置
const statusConfig: Record<string, { text: string; color: string }> = {
  PREDICTED: { text: '待入庫', color: '#ff976a' },
  IN_WAREHOUSE: { text: '已入庫', color: '#07c160' },
  PACKED: { text: '已打包', color: '#1989fa' },
  SHIPPED: { text: '已發貨', color: '#7232dd' },
  DELIVERED: { text: '已簽收', color: '#969799' },
}

// 圖片上傳 (模擬)
const fileList = ref<Array<{ url: string; file?: File }>>([])

// ============================================
// API 方法
// ============================================
async function searchByTracking() {
  if (!searchNumber.value.trim()) {
    showToast({ type: 'fail', message: '請輸入快遞單號' })
    return
  }

  searching.value = true
  searchResult.value = null

  try {
    const res = await packageApi.searchByTracking(searchNumber.value.trim())
    if (res.data.success) {
      searchResult.value = res.data.data
      if (!res.data.data) {
        showToast('未找到包裹，可手動創建')
      }
    }
  } catch (error) {
    console.error('搜索失敗:', error)
  } finally {
    searching.value = false
  }
}

async function fetchPackages() {
  loading.value = true
  try {
    const res = await packageApi.getAllPackages({ status: 'PREDICTED', limit: 100 })
    if (res.data.success) {
      packages.value = res.data.data.packages
      stats.value = res.data.data.stats
    }
  } catch (error) {
    console.error('獲取包裹失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function fetchPendingQc() {
  try {
    const res = await packageApi.getPendingQc({ limit: 100 })
    if (res.data.success) {
      pendingQcPackages.value = res.data.data.packages
    }
  } catch (error) {
    console.error('獲取待驗貨列表失敗:', error)
  }
}

function openInboundDialog(pkg: Package) {
  inboundTarget.value = pkg
  inboundForm.value = { weight: '', volume: '', remark: '' }
  showInboundDialog.value = true
}

async function confirmInbound() {
  const weight = parseFloat(inboundForm.value.weight)
  if (isNaN(weight) || weight <= 0) {
    showToast({ type: 'fail', message: '請輸入有效的重量' })
    return
  }

  submitting.value = true
  try {
    const res = await packageApi.inbound(inboundTarget.value!.id, {
      weight,
      volume: parseFloat(inboundForm.value.volume) || undefined,
      remark: inboundForm.value.remark,
    })

    if (res.data.success) {
      showSuccessToast('入庫成功')
      showInboundDialog.value = false
      searchResult.value = null
      searchNumber.value = ''
      await Promise.all([fetchPackages(), fetchPendingQc()])
    }
  } catch (error) {
    console.error('入庫失敗:', error)
  } finally {
    submitting.value = false
  }
}

// ============================================
// 驗貨功能
// ============================================
function openQcDialog(pkg: Package) {
  qcTarget.value = pkg
  qcForm.value = {
    qcStatus: 'PASSED',
    qcImages: [],
    qcNote: '',
    isReinforced: false,
  }
  fileList.value = []
  showQcDialog.value = true
}

function onImageRead(file: any) {
  // 模擬上傳，實際應上傳到 S3/R2
  const mockUrl = URL.createObjectURL(file.file)
  qcForm.value.qcImages.push(mockUrl)
}

function onImageDelete(file: any, detail: any) {
  qcForm.value.qcImages.splice(detail.index, 1)
}

async function submitQcReport() {
  if (qcForm.value.qcImages.length === 0) {
    showToast({ type: 'fail', message: '請至少上傳一張驗貨圖片' })
    return
  }

  qcSubmitting.value = true
  try {
    const res = await packageApi.submitQc(qcTarget.value!.id, {
      qcStatus: qcForm.value.qcStatus,
      qcImages: qcForm.value.qcImages,
      qcNote: qcForm.value.qcNote,
      isReinforced: qcForm.value.isReinforced,
    })

    if (res.data.success) {
      showSuccessToast(qcForm.value.qcStatus === 'PASSED' ? '驗貨通過' : '已記錄異常')
      showQcDialog.value = false
      searchResult.value = null
      searchNumber.value = ''
      await fetchPendingQc()
    }
  } catch (error) {
    console.error('提交驗貨失敗:', error)
  } finally {
    qcSubmitting.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await Promise.all([fetchPackages(), fetchPendingQc()])
  refreshing.value = false
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="warehouse-ops">
    <!-- 導航欄 -->
    <van-nav-bar
      title="倉庫操作台"
      left-arrow
      @click-left="router.push('/admin')"
      fixed
      placeholder
    />

    <!-- ============================================ -->
    <!-- 快遞掃描區 -->
    <!-- ============================================ -->
    <div class="scan-section">
      <h3>掃碼/輸入快遞單號</h3>
      <van-search
        v-model="searchNumber"
        placeholder="輸入或掃描快遞單號"
        show-action
        @search="searchByTracking"
      >
        <template #action>
          <van-button
            type="primary"
            size="small"
            :loading="searching"
            @click="searchByTracking"
          >
            查詢
          </van-button>
        </template>
      </van-search>

      <!-- 搜索結果 -->
      <div class="search-result" v-if="searchResult">
        <div class="result-card found">
          <div class="result-header">
            <span class="tracking">{{ searchResult.trackingNumber }}</span>
            <van-tag :color="statusConfig[searchResult.status]?.color" plain>
              {{ statusConfig[searchResult.status]?.text }}
            </van-tag>
          </div>
          <div class="result-body">
            <p><strong>用戶：</strong>{{ (searchResult as any).user?.email }}</p>
            <p v-if="searchResult.description"><strong>物品：</strong>{{ searchResult.description }}</p>
            <p v-if="searchResult.weight"><strong>重量：</strong>{{ searchResult.weight }} kg</p>
            <!-- 驗貨狀態 -->
            <p v-if="(searchResult as any).qcReport">
              <strong>驗貨：</strong>
              <van-tag :color="(searchResult as any).qcReport.statusColor">
                {{ (searchResult as any).qcReport.statusText }}
              </van-tag>
            </p>
          </div>
          <div class="result-actions">
            <van-button 
              v-if="searchResult.status === 'PREDICTED'" 
              type="success" 
              size="small" 
              @click="openInboundDialog(searchResult)"
            >
              確認入庫
            </van-button>
            <van-button 
              v-if="searchResult.status === 'IN_WAREHOUSE' && !(searchResult as any).qcStatus" 
              type="warning" 
              size="small" 
              @click="openQcDialog(searchResult)"
            >
              🛡️ 驗貨拍照
            </van-button>
          </div>
        </div>
      </div>

      <div class="search-result" v-else-if="searchNumber && !searching">
        <div class="result-card not-found">
          <van-icon name="warning-o" size="24" color="#ff976a" />
          <p>未找到預報記錄</p>
          <van-button type="warning" size="small" plain>
            手動創建包裹
          </van-button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- Tab 切換：入庫 / 驗貨 -->
    <!-- ============================================ -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46">
      <!-- 待入庫 Tab -->
      <van-tab title="待入庫">
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-num" style="color: #ff976a">{{ stats.PREDICTED }}</span>
            <span class="stat-label">待入庫</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: #07c160">{{ stats.IN_WAREHOUSE }}</span>
            <span class="stat-label">已入庫</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: #1989fa">{{ stats.PACKED }}</span>
            <span class="stat-label">已打包</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" style="color: #7232dd">{{ stats.SHIPPED }}</span>
            <span class="stat-label">已發貨</span>
          </div>
        </div>

        <div class="pending-section">
          <div class="section-header">
            <h3>待入庫包裹 ({{ packages.length }})</h3>
            <van-button size="small" icon="replay" @click="refresh" :loading="refreshing">
              刷新
            </van-button>
          </div>

          <van-pull-refresh v-model="refreshing" @refresh="refresh">
            <van-empty v-if="packages.length === 0 && !loading" description="沒有待入庫的包裹" />

            <div v-else class="packages-list">
              <div
                v-for="pkg in packages"
                :key="pkg.id"
                class="package-item"
              >
                <div class="item-main">
                  <div class="item-tracking">{{ pkg.trackingNumber }}</div>
                  <div class="item-info">
                    <span>{{ (pkg as any).user?.email }}</span>
                    <span v-if="pkg.description">| {{ pkg.description }}</span>
                  </div>
                  <div class="item-time">{{ formatDate(pkg.createdAt) }}</div>
                </div>
                <van-button
                  type="success"
                  size="small"
                  @click="openInboundDialog(pkg)"
                >
                  入庫
                </van-button>
              </div>
            </div>
          </van-pull-refresh>
        </div>
      </van-tab>

      <!-- 待驗貨 Tab -->
      <van-tab :title="`待驗貨 (${pendingQcPackages.length})`">
        <div class="qc-intro">
          <div class="intro-icon">🛡️</div>
          <div class="intro-text">
            <strong>驗貨拍照</strong>
            <p>上傳實拍圖，為客戶攔截售後風險</p>
          </div>
        </div>

        <div class="pending-section">
          <van-pull-refresh v-model="refreshing" @refresh="refresh">
            <van-empty v-if="pendingQcPackages.length === 0" description="沒有待驗貨的包裹">
              <template #description>
                <p style="color: #999; font-size: 12px">已入庫且未驗貨的包裹會顯示在這裡</p>
              </template>
            </van-empty>

            <div v-else class="packages-list">
              <div
                v-for="pkg in pendingQcPackages"
                :key="pkg.id"
                class="package-item qc-item"
              >
                <div class="item-main">
                  <div class="item-tracking">{{ pkg.trackingNumber }}</div>
                  <div class="item-info">
                    <span>{{ (pkg as any).user?.email }}</span>
                    <span v-if="pkg.description">| {{ pkg.description }}</span>
                  </div>
                  <div class="item-meta">
                    <span v-if="pkg.weight">{{ pkg.weight }}kg</span>
                    <span v-if="pkg.inboundAt">入庫: {{ formatDate(pkg.inboundAt) }}</span>
                  </div>
                </div>
                <van-button
                  type="warning"
                  size="small"
                  @click="openQcDialog(pkg)"
                >
                  驗貨
                </van-button>
              </div>
            </div>
          </van-pull-refresh>
        </div>
      </van-tab>
    </van-tabs>

    <!-- ============================================ -->
    <!-- 入庫彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showInboundDialog"
      title="確認入庫"
      :show-confirm-button="false"
    >
      <div class="inbound-form" v-if="inboundTarget">
        <div class="inbound-info">
          <p><strong>單號：</strong>{{ inboundTarget.trackingNumber }}</p>
          <p><strong>用戶：</strong>{{ (inboundTarget as any).user?.email }}</p>
        </div>

        <van-form @submit="confirmInbound">
          <van-cell-group inset>
            <van-field
              v-model="inboundForm.weight"
              type="number"
              label="重量 (kg)"
              placeholder="請輸入實際重量"
              required
              :disabled="submitting"
            />
            <van-field
              v-model="inboundForm.volume"
              type="number"
              label="體積 (m³)"
              placeholder="選填"
              :disabled="submitting"
            />
            <van-field
              v-model="inboundForm.remark"
              label="備註"
              placeholder="選填"
              :disabled="submitting"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button @click="showInboundDialog = false" :disabled="submitting">取消</van-button>
            <van-button type="success" native-type="submit" :loading="submitting">確認入庫</van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- ============================================ -->
    <!-- 驗貨彈窗 -->
    <!-- ============================================ -->
    <van-popup
      v-model:show="showQcDialog"
      position="bottom"
      round
      :style="{ height: '90%' }"
      closeable
    >
      <div class="qc-popup" v-if="qcTarget">
        <div class="qc-header">
          <h2>🛡️ 驗貨拍照</h2>
          <p>{{ qcTarget.trackingNumber }}</p>
        </div>

        <div class="qc-form">
          <!-- 狀態選擇 -->
          <div class="qc-status-picker">
            <div 
              class="status-option" 
              :class="{ active: qcForm.qcStatus === 'PASSED' }"
              @click="qcForm.qcStatus = 'PASSED'"
            >
              <span class="status-icon">✅</span>
              <span>驗貨通過</span>
            </div>
            <div 
              class="status-option issue" 
              :class="{ active: qcForm.qcStatus === 'ISSUE_FOUND' }"
              @click="qcForm.qcStatus = 'ISSUE_FOUND'"
            >
              <span class="status-icon">⚠️</span>
              <span>發現問題</span>
            </div>
          </div>

          <!-- 圖片上傳 -->
          <div class="qc-images">
            <p class="label">上傳驗貨實拍圖 <span class="required">*</span></p>
            <van-uploader
              v-model="fileList"
              :after-read="onImageRead"
              :max-count="9"
              multiple
              @delete="onImageDelete"
            >
              <template #preview-cover>
                <div class="preview-cover">
                  <van-icon name="photograph" />
                </div>
              </template>
            </van-uploader>
            <p class="tip">請拍攝商品外觀、標籤、包裝完整性</p>
          </div>

          <!-- 備註 -->
          <van-field
            v-model="qcForm.qcNote"
            type="textarea"
            label="驗貨備註"
            placeholder="如：邊角有輕微磨損，已修復"
            rows="2"
            :disabled="qcSubmitting"
          />

          <!-- 加固選項 -->
          <van-cell center title="已打木架/加固">
            <template #right-icon>
              <van-switch v-model="qcForm.isReinforced" size="20" />
            </template>
          </van-cell>

          <!-- 提交 -->
          <div class="qc-actions">
            <van-button block type="primary" size="large" :loading="qcSubmitting" @click="submitQcReport">
              {{ qcForm.qcStatus === 'PASSED' ? '✅ 確認通過' : '⚠️ 提交異常' }}
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.warehouse-ops {
  min-height: 100vh;
  background: #f5f5f5;
}

/* 掃描區 */
.scan-section {
  background: white;
  padding: 16px;
  margin: 12px;
  border-radius: 12px;
}

.scan-section h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.search-result {
  margin-top: 16px;
}

.result-card {
  padding: 16px;
  border-radius: 8px;
}

.result-card.found {
  background: #e6fff0;
  border: 1px solid #07c160;
}

.result-card.not-found {
  background: #fff7e6;
  border: 1px solid #ff976a;
  text-align: center;
}

.result-card.not-found p {
  margin: 8px 0;
  color: #666;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tracking {
  font-weight: bold;
  font-family: monospace;
}

.result-body p {
  font-size: 13px;
  color: #666;
  margin: 4px 0;
}

.result-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
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
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* 待入庫列表 */
.pending-section {
  padding: 16px 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 15px;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.package-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px;
  border-radius: 8px;
}

.package-item.qc-item {
  border-left: 3px solid #ff976a;
}

.item-main {
  flex: 1;
}

.item-tracking {
  font-weight: 600;
  font-family: monospace;
  margin-bottom: 4px;
}

.item-info {
  font-size: 12px;
  color: #666;
}

.item-time, .item-meta {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.item-meta span {
  margin-right: 8px;
}

/* 入庫表單 */
.inbound-form {
  padding: 16px;
}

.inbound-info {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.inbound-info p {
  font-size: 13px;
  margin: 4px 0;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}

/* 驗貨介紹 */
.qc-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  margin: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #ffd5d5;
}

.intro-icon {
  font-size: 32px;
}

.intro-text strong {
  font-size: 15px;
  color: #C0392B;
}

.intro-text p {
  font-size: 12px;
  color: #666;
  margin: 4px 0 0;
}

/* 驗貨彈窗 */
.qc-popup {
  padding: 20px;
  padding-bottom: 40px;
}

.qc-header {
  text-align: center;
  margin-bottom: 20px;
}

.qc-header h2 {
  font-size: 20px;
  margin: 0;
}

.qc-header p {
  font-family: monospace;
  color: #666;
  margin: 8px 0 0;
}

.qc-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 狀態選擇器 */
.qc-status-picker {
  display: flex;
  gap: 12px;
}

.status-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.status-option.active {
  border-color: #07c160;
  background: #e6fff0;
}

.status-option.issue.active {
  border-color: #ee0a24;
  background: #fff0f0;
}

.status-icon {
  font-size: 28px;
}

/* 圖片上傳 */
.qc-images {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 12px;
}

.qc-images .label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.qc-images .required {
  color: #ee0a24;
}

.qc-images .tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 提交按鈕 */
.qc-actions {
  margin-top: 16px;
}
</style>
