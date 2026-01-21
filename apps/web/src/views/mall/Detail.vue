<script setup lang="ts">
// ============================================
// 商品詳情頁 - Costco 模式信任建設
// ============================================
// 設計特點：
// 1. 全屏圖片預覽
// 2. 官方承諾區塊 (自營物流、一口價、售後兜底)
// 3. 懸浮底部導航
// 4. 包郵款隱藏運費計算器 (減少決策成本)

import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showSuccessToast, showImagePreview } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { productApi, type Product } from '../../api/product'
import { packageApi, type Warehouse } from '../../api/package'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const productId = route.params.id as string

// ============================================
// 狀態
// ============================================
const product = ref<Product | null>(null)
const warehouse = ref<Warehouse | null>(null)
const loading = ref(true)
const activeImage = ref(0)
const showWarehouseDialog = ref(false)

// FB Pixel 追踪
function trackFBEvent(eventName: string, params: Record<string, any>) {
  // @ts-ignore
  if (window.fbTrack) {
    // @ts-ignore
    window.fbTrack(eventName, params)
  }
}

// ============================================
// 計算屬性
// ============================================
const specsList = computed(() => {
  if (!product.value) return []
  const p = product.value
  const specs = []
  if (p.length && p.width && p.height) {
    specs.push({ label: '尺寸', value: `${p.length}×${p.width}×${p.height} cm`, icon: '📐' })
  }
  if (p.volume) {
    specs.push({ label: '體積', value: `${p.volume.toFixed(2)} m³`, icon: '📦' })
  }
  if (p.weight) {
    specs.push({ label: '重量', value: `${p.weight} kg`, icon: '⚖️' })
  }
  return specs
})

const memberId = computed(() => authStore.user?.id?.slice(-8) || 'XXXXXX')

const formatted1688Address = computed(() => {
  if (!warehouse.value) return ''
  const w = warehouse.value
  return `收貨人：${w.contactName}(ID:${memberId.value})\n電話：${w.phone}\n地址：${w.province}${w.city}${w.district}${w.address}`
})

// 保障服務
const guarantees = [
  { icon: '🛡️', text: '破損包賠' },
  { icon: '📦', text: '台灣包稅' },
  { icon: '🚚', text: '送貨到府' },
  { icon: '🔄', text: '7天保固' },
]

// ============================================
// API
// ============================================
async function fetchProduct() {
  loading.value = true
  try {
    const res = await productApi.getDetail(productId)
    if (res.data.success) {
      product.value = res.data.data
      
      trackFBEvent('ViewContent', {
        content_name: res.data.data.title,
        content_ids: [productId],
        content_type: 'product',
        value: res.data.data.priceTWD,
        currency: 'TWD',
      })
    }
  } catch (error) {
    console.error('獲取商品失敗:', error)
    showToast({ type: 'fail', message: '商品不存在' })
    router.back()
  } finally {
    loading.value = false
  }
}

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

// 預覽圖片
function previewImages(index: number) {
  if (!product.value?.images?.length) return
  showImagePreview({
    images: product.value.images,
    startPosition: index,
    closeable: true,
  })
}

// 直接購買
function buyDirect() {
  if (!product.value) return
  if (!authStore.isAuthenticated) {
    showToast({ type: 'fail', message: '請先登錄' })
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  
  trackFBEvent('AddToCart', {
    content_name: product.value.title,
    content_ids: [productId],
    value: product.value.priceTWD,
    currency: 'TWD',
  })
  
  trackFBEvent('InitiateCheckout', {
    value: product.value.priceTWD,
    currency: 'TWD',
  })
  
  showSuccessToast('已加入購物車')
}

// 獲取倉庫地址
async function showWarehouseInfo() {
  if (!authStore.isAuthenticated) {
    showToast({ type: 'fail', message: '請先登錄' })
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!warehouse.value) {
    await fetchWarehouse()
  }
  showWarehouseDialog.value = true
}

function copy1688Address() {
  if (!formatted1688Address.value) return
  navigator.clipboard.writeText(formatted1688Address.value)
  showSuccessToast('已複製收貨地址')
}

function goToWarehouse() {
  showWarehouseDialog.value = false
  router.push('/warehouse')
}

onMounted(() => {
  fetchProduct()
  if (authStore.isAuthenticated) {
    fetchWarehouse()
  }
})
</script>

<template>
  <div class="product-detail">
    <!-- ============================================ -->
    <!-- 導航欄 -->
    <!-- ============================================ -->
    <div class="nav-bar safe-area-top">
      <button class="nav-btn" @click="router.back()">
        <van-icon name="arrow-left" size="20" />
      </button>
      <div class="nav-actions">
        <button class="nav-btn">
          <van-icon name="share-o" size="20" />
        </button>
      </div>
    </div>

    <van-loading v-if="loading" class="loading-state" />

    <template v-else-if="product">
      <!-- ============================================ -->
      <!-- 商品圖片 (支持全屏預覽) -->
      <!-- ============================================ -->
      <div class="image-section">
        <van-swipe 
          :autoplay="0" 
          class="image-swipe" 
          @change="activeImage = $event"
        >
          <van-swipe-item 
            v-for="(img, idx) in product.images" 
            :key="idx"
            @click="previewImages(idx)"
          >
            <img v-lazy="img" class="product-image" :alt="product.title" />
          </van-swipe-item>
          <van-swipe-item v-if="product.images.length === 0">
            <img 
              v-lazy="'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'" 
              class="product-image" 
              alt="商品圖片" 
            />
          </van-swipe-item>
        </van-swipe>
        
        <!-- 圖片指示器 -->
        <div class="image-counter">
          {{ activeImage + 1 }} / {{ product.images.length || 1 }}
        </div>

        <!-- 包郵標籤 -->
        <div class="floating-tag" v-if="product.isFreeShipping">
          🇹🇼 台灣包郵
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 價格信息 -->
      <!-- ============================================ -->
      <div class="price-section">
        <div class="price-row">
          <span class="price-original">¥{{ product.price.toLocaleString() }}</span>
          <span class="price-label">含運價</span>
        </div>
        <div class="price-main">
          <span class="price-currency">NT$</span>
          <span class="price-amount">{{ (product.totalPriceTWD || product.priceTWD)?.toLocaleString() }}</span>
        </div>
        <p class="price-note">此價格包含海運費與關稅，送貨到府（不含上樓搬運）</p>
      </div>

      <!-- ============================================ -->
      <!-- 保障服務 (簡版) -->
      <!-- ============================================ -->
      <div class="guarantee-section">
        <div 
          v-for="item in guarantees" 
          :key="item.text" 
          class="guarantee-item"
        >
          <span class="guarantee-icon">{{ item.icon }}</span>
          <span class="guarantee-text">{{ item.text }}</span>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 官方承諾 - Costco 模式核心信任建設 -->
      <!-- ============================================ -->
      <div class="service-guarantee">
        <div class="guarantee-header">
          <span class="guarantee-badge">🏆 官方承諾</span>
          <span class="guarantee-subtitle">長期生意・拒絕套路</span>
        </div>
        
        <div class="guarantee-list">
          <div class="guarantee-card" v-for="sg in (product as any).serviceGuarantees" :key="sg.title">
            <span class="sg-icon">{{ sg.icon }}</span>
            <div class="sg-content">
              <strong>{{ sg.title }}</strong>
              <span>{{ sg.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 商品標題 -->
      <!-- ============================================ -->
      <div class="info-section">
        <h1 class="product-title">{{ product.title }}</h1>
        
        <!-- 規格參數 -->
        <div class="specs-grid" v-if="specsList.length">
          <div v-for="spec in specsList" :key="spec.label" class="spec-item">
            <span class="spec-icon">{{ spec.icon }}</span>
            <div class="spec-content">
              <span class="spec-value">{{ spec.value }}</span>
              <span class="spec-label">{{ spec.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 商品描述 -->
      <!-- ============================================ -->
      <div class="desc-section" v-if="product.description">
        <div class="section-title">商品詳情</div>
        <p class="desc-content">{{ product.description }}</p>
      </div>

      <!-- ============================================ -->
      <!-- 物流說明 -->
      <!-- ============================================ -->
      <div class="shipping-section">
        <div class="section-title">配送說明</div>
        <div class="shipping-list">
          <div class="shipping-item">
            <span class="shipping-icon">📍</span>
            <div>
              <strong>發貨地</strong>
              <span>中國廣州</span>
            </div>
          </div>
          <div class="shipping-item">
            <span class="shipping-icon">🚢</span>
            <div>
              <strong>運輸方式</strong>
              <span>海運專線 約7-14天</span>
            </div>
          </div>
          <div class="shipping-item">
            <span class="shipping-icon">🏠</span>
            <div>
              <strong>配送範圍</strong>
              <span>台灣本島全境</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部占位 -->
      <div style="height: 100px"></div>

      <!-- ============================================ -->
      <!-- 懸浮底部導航 -->
      <!-- ============================================ -->
      <div class="bottom-bar safe-area-bottom">
        <div class="bottom-left">
          <button class="icon-btn" @click="router.push('/mall')">
            <van-icon name="shop-o" size="20" />
            <span>商城</span>
          </button>
          <button class="icon-btn" @click="showToast('客服：020-12345678')">
            <van-icon name="service-o" size="20" />
            <span>客服</span>
          </button>
          <!-- 非包郵款才顯示運費計算 (減少決策成本) -->
          <button 
            v-if="(product as any).showCalculator" 
            class="icon-btn" 
            @click="router.push('/calculator')"
          >
            <van-icon name="calculator" size="20" />
            <span>運費</span>
          </button>
        </div>
        <div class="bottom-right">
          <button class="btn-secondary" @click="showWarehouseInfo">
            獲取倉庫地址
          </button>
          <button class="btn-primary" @click="buyDirect">
            立即購買
          </button>
        </div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- 倉庫地址彈窗 -->
    <!-- ============================================ -->
    <van-popup 
      v-model:show="showWarehouseDialog" 
      round 
      position="bottom"
      :style="{ maxHeight: '80vh' }"
    >
      <div class="warehouse-popup">
        <div class="popup-header">
          <h3>🏠 家具專線收貨倉</h3>
          <van-icon name="cross" size="20" @click="showWarehouseDialog = false" />
        </div>
        
        <div class="popup-tip">
          如果您在1688找到同款家具，歡迎使用我們的<strong>海運專線</strong>，按體積計費更划算！
        </div>

        <div class="address-card" v-if="warehouse">
          <div class="address-row">
            <span class="label">收貨人</span>
            <span class="value">
              {{ warehouse.contactName }}
              <strong class="member-id">(ID:{{ memberId }})</strong>
            </span>
          </div>
          <div class="address-row">
            <span class="label">電話</span>
            <span class="value">{{ warehouse.phone }}</span>
          </div>
          <div class="address-row">
            <span class="label">地址</span>
            <span class="value">{{ warehouse.province }}{{ warehouse.city }}{{ warehouse.district }}{{ warehouse.address }}</span>
          </div>
        </div>

        <div class="popup-warning">
          <van-icon name="warning-o" />
          收件人必須帶上您的會員ID，否則貨物無法識別！
        </div>

        <div class="popup-actions">
          <button class="btn-primary block" @click="copy1688Address">
            📋 複製 1688 收貨格式
          </button>
          <button class="btn-secondary block" @click="goToWarehouse">
            🚚 查看配送進度
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.product-detail {
  min-height: 100vh;
  background: #F7F8FA;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

/* ============================================
   導航欄
   ============================================ */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.nav-actions {
  display: flex;
  gap: 8px;
}

/* ============================================
   圖片區域
   ============================================ */
.image-section {
  position: relative;
}

.image-swipe {
  background: white;
}

.product-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.image-counter {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.floating-tag {
  position: absolute;
  top: 60px;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 0 20px 20px 0;
  backdrop-filter: blur(8px);
}

/* ============================================
   價格區域
   ============================================ */
.price-section {
  background: white;
  padding: 20px 16px;
  margin-bottom: 10px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.price-original {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.price-label {
  font-size: 12px;
  color: #C0392B;
  background: rgba(192, 57, 43, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.price-main {
  display: flex;
  align-items: baseline;
  color: #C0392B;
  margin-bottom: 8px;
}

.price-currency {
  font-size: 16px;
  font-weight: 600;
  margin-right: 2px;
}

.price-amount {
  font-family: 'DIN Alternate', 'Roboto', -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.price-note {
  font-size: 12px;
  color: #666;
  margin: 0;
  padding: 10px 12px;
  background: #F7F8FA;
  border-radius: 8px;
}

/* ============================================
   保障服務 (簡版)
   ============================================ */
.guarantee-section {
  display: flex;
  justify-content: space-around;
  background: white;
  padding: 16px;
  margin-bottom: 10px;
}

.guarantee-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.guarantee-icon {
  font-size: 20px;
}

.guarantee-text {
  font-size: 11px;
  color: #666;
}

/* ============================================
   官方承諾 - Costco 模式核心
   ============================================ */
.service-guarantee {
  background: white;
  padding: 16px;
  margin-bottom: 10px;
}

.guarantee-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.guarantee-badge {
  font-size: 14px;
  font-weight: 600;
  color: #C0392B;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #ffd5d5;
}

.guarantee-subtitle {
  font-size: 12px;
  color: #999;
}

.guarantee-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guarantee-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 12px;
  border: 1px solid #eee;
}

.sg-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.sg-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sg-content strong {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.sg-content span {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

/* ============================================
   商品信息
   ============================================ */
.info-section {
  background: white;
  padding: 16px;
  margin-bottom: 10px;
}

.product-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  margin: 0 0 16px;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #F7F8FA;
  border-radius: 10px;
}

.spec-icon {
  font-size: 18px;
}

.spec-content {
  display: flex;
  flex-direction: column;
}

.spec-value {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.spec-label {
  font-size: 10px;
  color: #999;
}

/* ============================================
   商品描述
   ============================================ */
.desc-section,
.shipping-section {
  background: white;
  padding: 16px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.desc-content {
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}

/* ============================================
   物流說明
   ============================================ */
.shipping-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shipping-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shipping-icon {
  font-size: 20px;
}

.shipping-item div {
  display: flex;
  flex-direction: column;
}

.shipping-item strong {
  font-size: 13px;
  color: #333;
}

.shipping-item span {
  font-size: 12px;
  color: #999;
}

/* ============================================
   底部導航
   ============================================ */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: white;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
}

.bottom-left {
  display: flex;
  gap: 12px;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.icon-btn span {
  font-size: 10px;
}

.bottom-right {
  flex: 1;
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 24px;
  border: none;
  cursor: pointer;
  transition: transform 0.15s;
}

.btn-primary {
  background: linear-gradient(135deg, #C0392B 0%, #E74C3C 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
}

.btn-secondary {
  background: #333;
  color: white;
}

.btn-primary:active,
.btn-secondary:active {
  transform: scale(0.96);
}

/* ============================================
   彈窗
   ============================================ */
.warehouse-popup {
  padding: 20px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.popup-header h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

.popup-tip {
  font-size: 13px;
  color: #666;
  padding: 12px;
  background: #FFF7E6;
  border-radius: 8px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.popup-tip strong {
  color: #C0392B;
}

.address-card {
  background: #F7F8FA;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.address-row {
  display: flex;
  padding: 8px 0;
  font-size: 14px;
}

.address-row .label {
  color: #999;
  width: 50px;
  flex-shrink: 0;
}

.address-row .value {
  color: #333;
  flex: 1;
}

.member-id {
  color: #C0392B;
  font-size: 12px;
}

.popup-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #FFF0F0;
  border-radius: 8px;
  font-size: 12px;
  color: #C0392B;
  margin-bottom: 16px;
}

.popup-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-primary.block,
.btn-secondary.block {
  display: block;
  width: 100%;
  text-align: center;
}

/* ============================================
   安全區域
   ============================================ */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 10px);
}
</style>
