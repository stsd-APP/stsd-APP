<script setup lang="ts">
// ============================================
// 商城首頁 - 瀑布流家具展示
// ============================================
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { useRateStore } from '../../stores/rate'
import { productApi, type Product } from '../../api/product'

const router = useRouter()
const authStore = useAuthStore()
const rateStore = useRateStore()

// ============================================
// 狀態
// ============================================
const products = ref<Product[]>([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const activeCategory = ref('all')

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
})

// 分類選項
const categories = [
  { name: 'all', title: '全部' },
  { name: 'SOFA', title: '沙發' },
  { name: 'BED', title: '床' },
  { name: 'TABLE', title: '桌椅' },
  { name: 'CABINET', title: '櫃子' },
]

const categoryNames: Record<string, string> = {
  SOFA: '沙發',
  BED: '床',
  TABLE: '桌椅',
  CHAIR: '椅子',
  CABINET: '櫃子',
  OTHER: '其他',
}

// ============================================
// API 方法
// ============================================
async function fetchProducts(reset = false) {
  if (reset) {
    pagination.value.page = 1
    products.value = []
    finished.value = false
  }

  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }
    if (activeCategory.value !== 'all') {
      params.category = activeCategory.value
    }

    const res = await productApi.getProducts(params)
    if (res.data.success) {
      const newProducts = res.data.data.products
      if (reset) {
        products.value = newProducts
      } else {
        products.value = [...products.value, ...newProducts]
      }
      pagination.value.total = res.data.data.pagination.total
      if (products.value.length >= pagination.value.total) {
        finished.value = true
      }
    }
  } catch (error) {
    console.error('獲取商品失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onLoad() {
  pagination.value.page++
  fetchProducts()
}

function onRefresh() {
  refreshing.value = true
  fetchProducts(true)
}

function onCategoryChange() {
  fetchProducts(true)
}

function goToDetail(id: string) {
  router.push(`/product/${id}`)
}

// 計算台幣價格
function calcTWD(rmb: number) {
  return Math.round(rmb * rateStore.rate)
}

// 格式化體積
function formatVolume(v: number | null) {
  if (!v) return '-'
  return `${v.toFixed(2)} m³`
}

onMounted(() => {
  rateStore.fetchRate()
  fetchProducts(true)
})
</script>

<template>
  <div class="mall-home">
    <!-- ============================================ -->
    <!-- 頂部搜索區 -->
    <!-- ============================================ -->
    <div class="header-section">
      <div class="brand-row">
        <div class="brand-logo">
          <van-icon name="shop-o" size="24" />
        </div>
        <div class="brand-info">
          <h1>叁通速達家具</h1>
          <p>大件家具 · 包稅海運</p>
        </div>
      </div>
      
      <van-search
        v-model="searchKeyword"
        placeholder="搜索沙發、床、餐桌..."
        shape="round"
        background="transparent"
        @search="fetchProducts(true)"
      />
    </div>

    <!-- ============================================ -->
    <!-- 分類標籤 -->
    <!-- ============================================ -->
    <van-tabs
      v-model:active="activeCategory"
      @change="onCategoryChange"
      sticky
      offset-top="0"
      color="#1989fa"
      title-active-color="#1989fa"
    >
      <van-tab
        v-for="cat in categories"
        :key="cat.name"
        :name="cat.name"
        :title="cat.title"
      />
    </van-tabs>

    <!-- ============================================ -->
    <!-- 商品瀑布流 -->
    <!-- ============================================ -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="— 已加載全部商品 —"
        @load="onLoad"
      >
        <div class="products-grid">
          <div
            v-for="product in products"
            :key="product.id"
            class="product-card"
            @click="goToDetail(product.id)"
          >
            <!-- 商品圖片 -->
            <div class="product-image">
              <img :src="product.images[0] || 'https://picsum.photos/seed/default/400/300'" :alt="product.title" />
              <div class="shipping-tag">
                <van-icon name="logistics" />
                包稅海運
              </div>
              <div class="category-tag" v-if="product.category">
                {{ categoryNames[product.category] }}
              </div>
            </div>

            <!-- 商品信息 -->
            <div class="product-info">
              <h3 class="product-title">{{ product.title }}</h3>
              
              <div class="product-specs" v-if="product.volume">
                <span>體積 {{ formatVolume(product.volume) }}</span>
              </div>

              <div class="product-price">
                <div class="price-rmb">
                  <span class="currency">¥</span>
                  <span class="amount">{{ product.price.toLocaleString() }}</span>
                </div>
                <div class="price-twd">
                  ≈ NT$ {{ calcTWD(product.price).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <van-empty v-if="products.length === 0 && !loading" description="暫無商品" />
      </van-list>
    </van-pull-refresh>

    <!-- ============================================ -->
    <!-- 底部導航 -->
    <!-- ============================================ -->
    <van-tabbar :model-value="0" active-color="#1989fa" fixed>
      <van-tabbar-item icon="shop-o">商城</van-tabbar-item>
      <van-tabbar-item icon="cart-o" @click="router.push('/dashboard')">代採</van-tabbar-item>
      <van-tabbar-item icon="logistics" @click="router.push('/warehouse')">集運</van-tabbar-item>
      <van-tabbar-item icon="user-o" @click="router.push('/profile')">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      searchKeyword: '',
    }
  }
}
</script>

<style scoped>
.mall-home {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

/* 頂部區域 */
.header-section {
  background: linear-gradient(135deg, #1989fa 0%, #36d1dc 100%);
  padding: 48px 16px 16px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  margin-bottom: 16px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-info h1 {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
}

.brand-info p {
  font-size: 12px;
  opacity: 0.9;
  margin: 4px 0 0;
}

/* 商品網格 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 12px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.product-card:active {
  transform: scale(0.98);
}

.product-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shipping-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(25, 137, 250, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
}

.category-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
}

.product-info {
  padding: 12px;
}

.product-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.product-specs {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
}

.product-price {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.price-rmb {
  color: #ee0a24;
}

.price-rmb .currency {
  font-size: 12px;
}

.price-rmb .amount {
  font-size: 18px;
  font-weight: bold;
}

.price-twd {
  font-size: 11px;
  color: #999;
}
</style>
