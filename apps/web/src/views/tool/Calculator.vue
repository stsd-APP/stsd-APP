<script setup lang="ts">
// ============================================
// 大件家具運費計算器 - 海運專線
// ============================================
// 垂直策略：只有海運，沒有空運
// 強調 CBM (立方數) 計費

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { calculatorApi, type QuoteResult } from '../../api/calculator'

const router = useRouter()

// ============================================
// 狀態
// ============================================
const form = ref({
  length: '',
  width: '',
  height: '',
  weight: '',
})
const loading = ref(false)
const result = ref<QuoteResult | null>(null)
const showResult = ref(false)

// 預設尺寸 - 常見家具
const presets = [
  { name: '單人沙發', icon: '🛋️', length: 100, width: 85, height: 80 },
  { name: '三人沙發', icon: '🛋️', length: 220, width: 95, height: 85 },
  { name: '雙人床架', icon: '🛏️', length: 200, width: 150, height: 40 },
  { name: '床墊', icon: '🛏️', length: 200, width: 150, height: 25 },
  { name: '餐桌', icon: '🍽️', length: 140, width: 80, height: 75 },
  { name: '餐椅×4', icon: '🪑', length: 60, width: 60, height: 100 },
  { name: '衣櫃', icon: '🗄️', length: 120, width: 55, height: 200 },
  { name: '電視櫃', icon: '📺', length: 180, width: 45, height: 50 },
]

// ============================================
// 計算預覽 - CBM 強調
// ============================================
const previewCBM = computed(() => {
  const l = parseFloat(form.value.length)
  const w = parseFloat(form.value.width)
  const h = parseFloat(form.value.height)
  if (l && w && h) {
    return ((l * w * h) / 1000000).toFixed(3)
  }
  return null
})

// 預估運費 (假設 TWD 8000/CBM)
const previewFee = computed(() => {
  if (!previewCBM.value) return null
  const cbm = parseFloat(previewCBM.value)
  const fee = Math.max(cbm * 8000, 800) // 最低 800
  return Math.round(fee)
})

// ============================================
// API
// ============================================
async function calculate() {
  const length = parseFloat(form.value.length)
  const width = parseFloat(form.value.width)
  const height = parseFloat(form.value.height)
  const weight = parseFloat(form.value.weight)

  if (!length || !width || !height) {
    showToast({ type: 'fail', message: '請輸入家具的長、寬、高' })
    return
  }

  loading.value = true
  try {
    const res = await calculatorApi.calculateQuote({
      length,
      width,
      height,
      weight: weight || undefined,
    })

    if (res.data.success) {
      result.value = res.data.data
      showResult.value = true
    }
  } catch (error) {
    console.error('計算失敗:', error)
  } finally {
    loading.value = false
  }
}

function applyPreset(preset: typeof presets[0]) {
  form.value.length = preset.length.toString()
  form.value.width = preset.width.toString()
  form.value.height = preset.height.toString()
  showToast({ message: `已填入 ${preset.name} 尺寸`, icon: 'success' })
}

function reset() {
  form.value = { length: '', width: '', height: '', weight: '' }
  result.value = null
  showResult.value = false
}

function goToMall() {
  router.push('/mall')
}
</script>

<template>
  <div class="calculator-page">
    <!-- 導航欄 -->
    <van-nav-bar
      title="家具運費計算"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <!-- ============================================ -->
    <!-- 頂部說明卡片 -->
    <!-- ============================================ -->
    <div class="info-banner">
      <div class="info-icon">🚢</div>
      <div class="info-text">
        <strong>大件家具・海運專線</strong>
        <span>大件家具不看重量，只看體積 (CBM)，海運最划算！</span>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 輸入區域 -->
    <!-- ============================================ -->
    <div class="input-section" v-show="!showResult">
      <div class="section-header">
        <van-icon name="orders-o" size="20" color="#C0392B" />
        <span>輸入家具包裝尺寸</span>
      </div>

      <van-form @submit="calculate">
        <van-cell-group inset>
          <van-field
            v-model="form.length"
            type="number"
            label="長度"
            placeholder="家具包裝後的長度"
            required
          >
            <template #extra>cm</template>
          </van-field>
          <van-field
            v-model="form.width"
            type="number"
            label="寬度"
            placeholder="家具包裝後的寬度"
            required
          >
            <template #extra>cm</template>
          </van-field>
          <van-field
            v-model="form.height"
            type="number"
            label="高度"
            placeholder="家具包裝後的高度"
            required
          >
            <template #extra>cm</template>
          </van-field>
          <van-field
            v-model="form.weight"
            type="number"
            label="重量"
            placeholder="選填・海運按體積計費"
          >
            <template #extra>kg</template>
          </van-field>
        </van-cell-group>

        <!-- CBM 預覽 (核心) -->
        <div class="cbm-preview" v-if="previewCBM">
          <div class="cbm-main">
            <span class="cbm-label">體積 (CBM)</span>
            <span class="cbm-value">{{ previewCBM }} m³</span>
          </div>
          <div class="cbm-fee" v-if="previewFee">
            <span>預估運費約</span>
            <span class="fee-value">NT$ {{ previewFee.toLocaleString() }}</span>
          </div>
        </div>

        <!-- 提示 -->
        <div class="tip-box">
          <van-icon name="bulb-o" />
          <span>提示：家具海運按 CBM (立方米) 計費，與重量無關。建議拆解包裝以減少體積。</span>
        </div>

        <div class="submit-btn">
          <van-button
            type="danger"
            block
            size="large"
            native-type="submit"
            :loading="loading"
            color="linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)"
          >
            計算海運費用
          </van-button>
        </div>
      </van-form>

      <!-- 快捷預設 - 常見家具 -->
      <div class="presets-section">
        <div class="presets-title">📐 常見家具尺寸參考</div>
        <div class="presets-grid">
          <div
            v-for="preset in presets"
            :key="preset.name"
            class="preset-item"
            @click="applyPreset(preset)"
          >
            <span class="preset-icon">{{ preset.icon }}</span>
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-size">{{ preset.length }}×{{ preset.width }}×{{ preset.height }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 結果區域 -->
    <!-- ============================================ -->
    <div class="result-section" v-show="showResult && result">
      <!-- 海運專線標識 -->
      <div class="route-badge">
        <span>🚢 海運專線・大件家具專屬</span>
      </div>

      <!-- 巨大運費顯示 -->
      <div class="result-hero">
        <div class="result-label">預估海運費</div>
        <div class="result-fee">
          <span class="currency">NT$</span>
          <span class="amount">{{ result?.finalFee.toLocaleString() }}</span>
        </div>
        <div class="result-rule">{{ result?.ruleName || '海運家具專線' }}</div>
      </div>

      <!-- 詳細信息 -->
      <div class="result-detail">
        <div class="detail-title">📦 計算明細</div>
        
        <div class="detail-row">
          <span>包裝尺寸</span>
          <span>{{ result?.length }} × {{ result?.width }} × {{ result?.height }} cm</span>
        </div>
        <div class="detail-row highlight-cbm">
          <span>體積 (CBM)</span>
          <span class="cbm">{{ result?.volumeCbm }} m³</span>
        </div>
        <div class="detail-row" v-if="result?.weight">
          <span>實際重量</span>
          <span>{{ result?.weight }} kg <small>(海運不計重)</small></span>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-row">
          <span>體積運費</span>
          <span>NT$ {{ result?.volumeFee.toLocaleString() }}</span>
        </div>
        <div class="detail-row">
          <span>最低消費</span>
          <span>NT$ {{ result?.minCharge.toLocaleString() }}</span>
        </div>
        <div class="detail-row highlight">
          <span>最終費用</span>
          <span>NT$ {{ result?.finalFee.toLocaleString() }}</span>
        </div>

        <!-- 預計天數 -->
        <div class="eta-box">
          <van-icon name="clock-o" />
          <span>海運預計 {{ result?.estimatedDays || '10-14' }} 個工作天到貨</span>
        </div>

        <!-- 備註 -->
        <div class="note-box">
          <van-icon name="info-o" />
          <span>{{ result?.note || '費用含基本包裝、報關、送貨到府 (不含上樓搬運)' }}</span>
        </div>
      </div>

      <!-- 服務說明 -->
      <div class="service-box">
        <div class="service-title">🏠 海運專線服務包含</div>
        <div class="service-list">
          <div class="service-item">✓ 廣州倉庫收貨</div>
          <div class="service-item">✓ 專業打包加固</div>
          <div class="service-item">✓ 海關清關報稅</div>
          <div class="service-item">✓ 台灣本島配送</div>
          <div class="service-item">✓ 破損理賠保障</div>
        </div>
      </div>

      <!-- 導流按鈕 -->
      <div class="cta-section">
        <div class="cta-text">
          💡 商城家具已含運費，買即送到家
        </div>
        <van-button type="danger" block @click="goToMall" color="linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)">
          🛋️ 瀏覽包郵家具
        </van-button>
        <van-button plain block @click="reset" style="margin-top: 12px">
          重新計算
        </van-button>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar :model-value="1" active-color="#C0392B" fixed>
      <van-tabbar-item icon="shop-o" @click="router.push('/mall')">家具</van-tabbar-item>
      <van-tabbar-item icon="calculator">運費</van-tabbar-item>
      <van-tabbar-item icon="logistics" @click="router.push('/warehouse')">配送</van-tabbar-item>
      <van-tabbar-item icon="user-o" @click="router.push('/dashboard')">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.calculator-page {
  min-height: 100vh;
  background: #F7F8FA;
  padding-bottom: 70px;
}

/* 頂部說明 */
.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fff8e6 0%, #fff5e0 100%);
  border-radius: 12px;
  border: 1px solid #ffe4b5;
}

.info-icon {
  font-size: 32px;
}

.info-text {
  display: flex;
  flex-direction: column;
}

.info-text strong {
  font-size: 15px;
  color: #8B4513;
}

.info-text span {
  font-size: 12px;
  color: #A0522D;
  margin-top: 2px;
}

/* 輸入區域 */
.input-section {
  padding: 0 16px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

/* CBM 預覽 (核心強調) */
.cbm-preview {
  margin: 16px 16px 0;
  padding: 16px;
  background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
  border-radius: 12px;
  color: white;
}

.cbm-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cbm-label {
  font-size: 14px;
  opacity: 0.8;
}

.cbm-value {
  font-size: 28px;
  font-weight: bold;
  font-family: 'DIN Alternate', -apple-system, sans-serif;
}

.cbm-fee {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 13px;
  opacity: 0.8;
}

.fee-value {
  font-size: 18px;
  font-weight: 600;
  color: #E74C3C;
}

/* 提示 */
.tip-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 16px 16px 0;
  padding: 12px;
  background: #e6f4ff;
  border-radius: 8px;
  font-size: 12px;
  color: #1989fa;
  line-height: 1.5;
}

.submit-btn {
  padding: 20px 16px;
}

/* 快捷預設 */
.presets-section {
  margin-top: 8px;
}

.presets-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-item:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

.preset-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.preset-size {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

/* 結果區域 */
.result-section {
  padding: 16px;
}

.route-badge {
  text-align: center;
  padding: 8px;
  background: #1989fa;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px 8px 0 0;
}

.result-hero {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #C0392B, #E74C3C);
  border-radius: 0 0 16px 16px;
  color: white;
  margin-bottom: 16px;
}

.result-label {
  font-size: 14px;
  opacity: 0.9;
}

.result-fee {
  margin: 16px 0;
}

.result-fee .currency {
  font-size: 24px;
}

.result-fee .amount {
  font-size: 56px;
  font-weight: bold;
  font-family: 'DIN Alternate', -apple-system, sans-serif;
}

.result-rule {
  font-size: 13px;
  opacity: 0.8;
}

/* 詳細信息 */
.result-detail {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: #666;
}

.detail-row.highlight-cbm {
  background: #f5f5f5;
  margin: 0 -16px;
  padding: 12px 16px;
  font-weight: 600;
}

.detail-row.highlight-cbm .cbm {
  font-size: 18px;
  color: #1989fa;
  font-family: 'DIN Alternate', -apple-system, sans-serif;
}

.detail-row.highlight {
  font-weight: bold;
  color: #C0392B;
  font-size: 15px;
}

.detail-row small {
  font-size: 10px;
  color: #999;
}

.detail-divider {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}

.eta-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 12px;
  background: #e6fff0;
  border-radius: 8px;
  font-size: 12px;
  color: #07c160;
}

.note-box {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 12px;
  color: #ff976a;
}

/* 服務說明 */
.service-box {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.service-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-item {
  font-size: 12px;
  color: #07c160;
  background: #e6fff0;
  padding: 4px 10px;
  border-radius: 12px;
}

/* CTA 區域 */
.cta-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.cta-text {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}
</style>
