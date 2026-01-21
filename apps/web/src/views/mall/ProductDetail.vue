<script setup lang="ts">
// ============================================
// 商品詳情頁 - 圖片 + 價格計算 + 運費試算
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { useRateStore } from '../../stores/rate'
import { productApi, type Product, type ShippingEstimate } from '../../api/product'

const router = useRouter()
const route = useRoute()
const rateStore = useRateStore()

const productId = route.params.id as string

// ============================================
// 狀態
// ============================================
const product = ref<Product | null>(null)
const loading = ref(true)
const activeImage = ref(0)

// ============================================
// 計算屬性
// ============================================
const priceTWD = computed(() => {
  if (!product.value) return 0
  return Math.round(product.value.price * rateStore.rate)
})

const shippingFee = computed(() => {
  return product.value?.shippingEstimate?.shippingFee || 0
})

const totalPrice = computed(() => {
  return priceTWD.value + shippingFee.value
})

const categoryNames: Record<string, string> = {
  SOFA: '沙發',
  BED: '床',
  TABLE: '桌子',
  CHAIR: '椅子',
  CABINET: '櫃子',
  OTHER: '其他',
}

// ============================================
// API 方法
// ============================================
async function fetchProduct() {
  loading.value = true
  try {
    const res = await productApi.getDetail(productId)
    if (res.data.success) {
      product.value = res.data.data
    }
  } catch (error) {
    console.error('獲取商品失敗:', error)
    showToast({ type: 'fail', message: '商品不存在' })
    router.back()
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function addToCart() {
  showSuccessToast('已加入代採清單')
  // TODO: 實際加入購物車邏輯
}

function buyNow() {
  // 跳轉到代採申請頁面，帶上商品信息
  router.push({
    path: '/dashboard',
    query: {
      productId: productId,
      url: `product:${productId}`,
      amount: product.value?.price,
    },
  })
}

onMounted(() => {
  rateStore.fetchRate()
  fetchProduct()
})
</script>

<template>
  <div class="product-detail">
    <!-- 導航欄 -->
    <van-nav-bar
      title="商品詳情"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
    />

    <van-loading v-if="loading" class="loading-state" />

    <template v-else-if="product">
      <!-- ============================================ -->
      <!-- 商品圖片輪播 -->
      <!-- ============================================ -->
      <van-swipe :autoplay="3000" lazy-render class="product-swipe">
        <van-swipe-item v-for="(img, idx) in product.images" :key="idx">
          <img :src="img" class="swipe-image" />
        </van-swipe-item>
        <van-swipe-item v-if="product.images.length === 0">
          <img src="https://picsum.photos/seed/default/800/600" class="swipe-image" />
        </van-swipe-item>
      </van-swipe>

      <!-- ============================================ -->
      <!-- 價格信息 -->
      <!-- ============================================ -->
      <div class="price-section">
        <div class="price-main">
          <span class="currency">¥</span>
          <span class="amount">{{ product.price.toLocaleString() }}</span>
        </div>
        <div class="price-twd">
          ≈ NT$ {{ priceTWD.toLocaleString() }}
          <span class="rate-hint">(匯率 {{ rateStore.rate }})</span>
        </div>
        <div class="shipping-badge">
          <van-icon name="logistics" />
          包稅海運到府
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 商品標題 -->
      <!-- ============================================ -->
      <div class="info-section">
        <h1 class="product-title">{{ product.title }}</h1>
        <van-tag type="primary" plain v-if="product.category">
          {{ categoryNames[product.category] }}
        </van-tag>
      </div>

      <!-- ============================================ -->
      <!-- 規格信息 -->
      <!-- ============================================ -->
      <div class="specs-section">
        <div class="section-title">商品規格</div>
        <div class="specs-grid">
          <div class="spec-item" v-if="product.length && product.width && product.height">
            <span class="spec-label">尺寸</span>
            <span class="spec-value">{{ product.length }} × {{ product.width }} × {{ product.height }} cm</span>
          </div>
          <div class="spec-item" v-if="product.volume">
            <span class="spec-label">體積</span>
            <span class="spec-value">{{ product.volume.toFixed(2) }} m³</span>
          </div>
          <div class="spec-item" v-if="product.weight">
            <span class="spec-label">重量</span>
            <span class="spec-value">{{ product.weight }} kg</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">庫存</span>
            <span class="spec-value">{{ product.stock > 0 ? '有貨' : '缺貨' }}</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 運費計算卡片 -->
      <!-- ============================================ -->
      <div class="shipping-section" v-if="product.shippingEstimate">
        <div class="section-title">
          <van-icon name="logistics" />
          運費試算
        </div>
        
        <div class="calc-card">
          <div class="calc-row">
            <span>商品價格</span>
            <span class="value rmb">¥ {{ product.price.toLocaleString() }}</span>
          </div>
          <div class="calc-row">
            <span>匯率換算</span>
            <span class="value">× {{ rateStore.rate }}</span>
          </div>
          <div class="calc-row">
            <span>商品台幣</span>
            <span class="value twd">NT$ {{ priceTWD.toLocaleString() }}</span>
          </div>
          <div class="calc-divider"></div>
          <div class="calc-row">
            <span>預估海運</span>
            <span class="value shipping">
              NT$ {{ shippingFee.toLocaleString() }}
              <small>({{ product.volume?.toFixed(2) }}m³ × {{ product.shippingEstimate.pricePerCbm }}/m³)</small>
            </span>
          </div>
          <div class="calc-row total">
            <span>預估總價</span>
            <span class="value">NT$ {{ totalPrice.toLocaleString() }}</span>
          </div>
        </div>

        <div class="shipping-note">
          <van-icon name="info-o" />
          {{ product.shippingEstimate.note }}
          <br />
          預計 {{ product.shippingEstimate.estimatedDays || 7 }} 個工作天到貨
        </div>
      </div>

      <!-- ============================================ -->
      <!-- 商品描述 -->
      <!-- ============================================ -->
      <div class="desc-section" v-if="product.description">
        <div class="section-title">商品詳情</div>
        <div class="desc-content">{{ product.description }}</div>
      </div>

      <!-- ============================================ -->
      <!-- 底部操作欄 -->
      <!-- ============================================ -->
      <div class="action-bar">
        <div class="action-left">
          <div class="action-icon" @click="router.push('/mall')">
            <van-icon name="shop-o" size="22" />
            <span>商城</span>
          </div>
          <div class="action-icon" @click="router.push('/warehouse')">
            <van-icon name="logistics" size="22" />
            <span>集運</span>
          </div>
        </div>
        <div class="action-right">
          <van-button type="warning" @click="addToCart">加入代採</van-button>
          <van-button type="danger" @click="buyNow">立即代購</van-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.product-detail {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

/* 輪播圖 */
.product-swipe {
  height: 300px;
}

.swipe-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 價格區域 */
.price-section {
  background: white;
  padding: 16px;
}

.price-main {
  color: #ee0a24;
}

.price-main .currency {
  font-size: 16px;
}

.price-main .amount {
  font-size: 28px;
  font-weight: bold;
}

.price-twd {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.rate-hint {
  font-size: 12px;
  color: #999;
}

.shipping-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #1989fa 0%, #36d1dc 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 12px;
}

/* 信息區域 */
.info-section {
  background: white;
  padding: 16px;
  margin-top: 10px;
}

.product-title {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0 0 8px;
}

/* 規格區域 */
.specs-section,
.shipping-section,
.desc-section {
  background: white;
  padding: 16px;
  margin-top: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.spec-item {
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 12px;
  color: #999;
}

.spec-value {
  font-size: 14px;
  color: #333;
  margin-top: 4px;
}

/* 運費計算卡片 */
.calc-card {
  background: #f8f9ff;
  border-radius: 12px;
  padding: 16px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.calc-row .value {
  font-weight: 500;
}

.calc-row .value.rmb {
  color: #ee0a24;
}

.calc-row .value.twd {
  color: #1989fa;
}

.calc-row .value.shipping {
  color: #07c160;
}

.calc-row .value small {
  font-size: 11px;
  color: #999;
  font-weight: normal;
}

.calc-row.total {
  border-top: 1px dashed #ddd;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: bold;
}

.calc-row.total .value {
  font-size: 18px;
  color: #ee0a24;
}

.calc-divider {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}

.shipping-note {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #999;
  margin-top: 12px;
  padding: 10px;
  background: #fff7e6;
  border-radius: 8px;
}

/* 描述 */
.desc-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 底部操作欄 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: white;
  padding: 8px 16px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.action-left {
  display: flex;
  gap: 20px;
}

.action-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  color: #666;
}

.action-right {
  flex: 1;
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.action-right .van-button {
  flex: 1;
}
</style>
