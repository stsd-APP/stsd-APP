<script setup lang="ts">
// ============================================
// 叁通家具 - 高端家居畫廊首頁
// ============================================
// 設計理念：Less is More
// 風格參考：Architectural Digest / ELLE Decor

import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { productApi, type Product } from '../../api/product'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// ============================================
// 狀態
// ============================================
const products = ref<Product[]>([])
const loading = ref(true)
const finished = ref(false)
const scrollY = ref(0)
const heroLoaded = ref(false)

const pagination = ref({ page: 1, limit: 12, total: 0 })

// Hero 背景圖
const heroImage = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&h=1200&fit=crop&q=90'

// ============================================
// 滾動監聽 - 視差效果
// ============================================
function handleScroll() {
  scrollY.value = window.scrollY
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  fetchProducts()
  
  // 模擬 Hero 圖片加載完成
  setTimeout(() => {
    heroLoaded.value = true
  }, 300)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// ============================================
// API
// ============================================
async function fetchProducts() {
  loading.value = true
  try {
    const res = await productApi.getProducts({
      page: pagination.value.page,
      limit: pagination.value.limit,
    })
    if (res.data.success) {
      products.value = [...products.value, ...res.data.data.products]
      pagination.value.total = res.data.data.pagination.total
      if (products.value.length >= pagination.value.total) {
        finished.value = true
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!finished.value && !loading.value) {
    pagination.value.page++
    fetchProducts()
  }
}

// ============================================
// 導航
// ============================================
function goToProduct(product: Product) {
  router.push(`/product/${product.id}`)
}

function scrollToCollection() {
  const el = document.getElementById('collection')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// 格式化價格
function formatPrice(price: number) {
  return price.toLocaleString()
}
</script>

<template>
  <div class="gallery-home">
    <!-- ============================================ -->
    <!-- Hero Section - 全屏沉浸式 -->
    <!-- ============================================ -->
    <section class="hero-section">
      <div 
        class="hero-bg" 
        :class="{ loaded: heroLoaded }"
        :style="{ 
          backgroundImage: `url(${heroImage})`,
          transform: `translateY(${scrollY * 0.3}px)`
        }"
      ></div>
      <div class="hero-overlay"></div>
      
      <div class="hero-content" :class="{ visible: heroLoaded }">
        <h1 class="hero-title">
          Make Your Home<br/>
          <em>An Art.</em>
        </h1>
        <p class="hero-subtitle">Curated Furniture for Modern Living</p>
        <button class="hero-btn" @click="scrollToCollection">
          Explore Collection
        </button>
      </div>

      <div class="scroll-indicator" :class="{ visible: heroLoaded }">
        <span></span>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- Collection Section - 雜誌流佈局 -->
    <!-- ============================================ -->
    <section id="collection" class="collection-section">
      <div class="section-header">
        <span class="section-label">CURATED SELECTION</span>
        <h2 class="section-title">The Collection</h2>
      </div>

      <!-- 編輯精選 - 大圖展示 -->
      <div class="editorial-grid" v-if="products.length > 0">
        <!-- 第一組：一大兩小 -->
        <div class="grid-row featured" v-if="products[0]">
          <div 
            class="grid-item large"
            @click="goToProduct(products[0])"
          >
            <div class="item-image">
              <img v-lazy="products[0].images?.[0]" :alt="products[0].title" />
            </div>
            <div class="item-info">
              <h3 class="item-title">{{ products[0].title }}</h3>
              <span class="item-price">NT$ {{ formatPrice(products[0].priceTWD || products[0].price * 4.6) }}</span>
            </div>
          </div>
          
          <div class="grid-side" v-if="products[1] || products[2]">
            <div 
              v-if="products[1]"
              class="grid-item small"
              @click="goToProduct(products[1])"
            >
              <div class="item-image">
                <img v-lazy="products[1].images?.[0]" :alt="products[1].title" />
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ products[1].title }}</h3>
                <span class="item-price">NT$ {{ formatPrice(products[1].priceTWD || products[1].price * 4.6) }}</span>
              </div>
            </div>
            <div 
              v-if="products[2]"
              class="grid-item small"
              @click="goToProduct(products[2])"
            >
              <div class="item-image">
                <img v-lazy="products[2].images?.[0]" :alt="products[2].title" />
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ products[2].title }}</h3>
                <span class="item-price">NT$ {{ formatPrice(products[2].priceTWD || products[2].price * 4.6) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 單列大圖展示 -->
        <div 
          v-for="(product, index) in products.slice(3)"
          :key="product.id"
          class="grid-item full"
          :class="{ 'alt-layout': index % 2 === 1 }"
          @click="goToProduct(product)"
        >
          <div class="item-image">
            <img v-lazy="product.images?.[0]" :alt="product.title" />
          </div>
          <div class="item-info">
            <span class="item-category">{{ product.category || 'FURNITURE' }}</span>
            <h3 class="item-title">{{ product.title }}</h3>
            <span class="item-price">NT$ {{ formatPrice(product.priceTWD || product.price * 4.6) }}</span>
          </div>
        </div>
      </div>

      <!-- 骨架屏 -->
      <div class="skeleton-grid" v-if="loading && products.length === 0">
        <div class="skeleton-item large">
          <van-skeleton :row="0" class="skeleton-img" />
        </div>
        <div class="skeleton-item">
          <van-skeleton :row="0" class="skeleton-img" />
        </div>
        <div class="skeleton-item">
          <van-skeleton :row="0" class="skeleton-img" />
        </div>
      </div>

      <!-- 加載更多 -->
      <div class="load-more" v-if="!finished && products.length > 0">
        <button class="load-more-btn" @click="loadMore" :disabled="loading">
          {{ loading ? 'Loading...' : 'View More' }}
        </button>
      </div>

      <!-- 結束標記 -->
      <div class="collection-end" v-if="finished && products.length > 0">
        <span class="end-line"></span>
        <span class="end-text">End of Collection</span>
        <span class="end-line"></span>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- Footer -->
    <!-- ============================================ -->
    <footer class="gallery-footer">
      <div class="footer-brand">
        <span class="brand-name">SANTONG</span>
        <span class="brand-tagline">Curated Home Furnishing</span>
      </div>
      <div class="footer-links">
        <a href="#">About</a>
        <a href="#">Contact</a>
        <a href="#">Shipping</a>
      </div>
      <p class="footer-copy">© 2026 Santong. All rights reserved.</p>
    </footer>

    <!-- ============================================ -->
    <!-- 底部導航 - 極簡毛玻璃 -->
    <!-- ============================================ -->
    <nav class="bottom-nav safe-area-bottom">
      <div 
        class="nav-item" 
        :class="{ active: true }"
        @click="router.push('/')"
      >
        <van-icon name="wap-home-o" />
        <span>Home</span>
      </div>
      <div 
        class="nav-item"
        @click="router.push('/warehouse')"
      >
        <van-icon name="logistics" />
        <span>Orders</span>
      </div>
      <div 
        class="nav-item"
        @click="router.push(authStore.isAdmin ? '/admin' : '/dashboard')"
      >
        <van-icon name="user-o" />
        <span>Profile</span>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* ============================================
   高端家居畫廊首頁
   ============================================ */
.gallery-home {
  background: #FFFFFF;
  min-height: 100vh;
}

/* ============================================
   Hero Section - 80vh 全屏沉浸
   ============================================ */
.hero-section {
  position: relative;
  height: 85vh;
  min-height: 600px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 1.2s ease;
  will-change: transform;
}

.hero-bg.loaded {
  opacity: 1;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.3) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 24px;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 1s ease 0.5s, transform 1s ease 0.5s;
}

.hero-content.visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 42px;
  font-weight: 400;
  color: white;
  line-height: 1.2;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.hero-title em {
  font-style: italic;
}

.hero-subtitle {
  font-family: 'Lato', sans-serif;
  font-size: 14px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 40px;
}

.hero-btn {
  font-family: 'Lato', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 16px 40px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.8);
  color: white;
  cursor: pointer;
  transition: all 0.4s ease;
}

.hero-btn:hover {
  background: white;
  color: #1A1A1A;
}

/* 滾動指示器 */
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 1s ease 1.5s;
}

.scroll-indicator.visible {
  opacity: 1;
}

.scroll-indicator span {
  display: block;
  width: 1px;
  height: 60px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.8), transparent);
  animation: scrollPulse 2s infinite;
}

@keyframes scrollPulse {
  0%, 100% { transform: scaleY(1); opacity: 1; }
  50% { transform: scaleY(0.6); opacity: 0.5; }
}

/* ============================================
   Collection Section - 雜誌流
   ============================================ */
.collection-section {
  padding: 80px 20px 120px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-label {
  font-family: 'Lato', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: #888888;
  text-transform: uppercase;
  display: block;
  margin-bottom: 12px;
}

.section-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  color: #1A1A1A;
  letter-spacing: -0.02em;
}

/* 編輯流佈局 */
.editorial-grid {
  max-width: 1200px;
  margin: 0 auto;
}

/* 一大兩小佈局 */
.grid-row.featured {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.grid-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 單個項目 */
.grid-item {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #F2F2F2;
}

.grid-item.large {
  aspect-ratio: 4/5;
}

.grid-item.small {
  flex: 1;
}

.grid-item.full {
  margin-bottom: 20px;
  aspect-ratio: 16/10;
}

.grid-item.full.alt-layout {
  aspect-ratio: 16/12;
}

.item-image {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.grid-item:hover .item-image img {
  transform: scale(1.03);
}

/* 圖片懶加載 */
.item-image img[lazy="loading"] {
  opacity: 0;
}

.item-image img[lazy="loaded"] {
  opacity: 1;
  transition: opacity 0.6s ease;
}

/* 項目信息 */
.item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.grid-item.full .item-info {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.item-category {
  font-family: 'Lato', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
}

.item-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 18px;
  font-weight: 400;
  color: white;
  line-height: 1.3;
  max-width: 70%;
}

.grid-item.small .item-title {
  font-size: 15px;
}

.item-price {
  font-family: 'Lato', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.02em;
}

/* 骨架屏 */
.skeleton-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

.skeleton-item {
  background: #F2F2F2;
  aspect-ratio: 4/5;
}

.skeleton-item.large {
  grid-row: span 2;
}

.skeleton-img {
  width: 100%;
  height: 100%;
}

/* 加載更多 */
.load-more {
  text-align: center;
  margin-top: 60px;
}

.load-more-btn {
  font-family: 'Lato', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 16px 48px;
  background: transparent;
  border: 1px solid #1A1A1A;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.4s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: #1A1A1A;
  color: white;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 結束標記 */
.collection-end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 80px;
}

.end-line {
  width: 60px;
  height: 1px;
  background: #E0E0E0;
}

.end-text {
  font-family: 'Lato', sans-serif;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.15em;
  color: #AAAAAA;
  text-transform: uppercase;
}

/* ============================================
   Footer
   ============================================ */
.gallery-footer {
  padding: 60px 20px 100px;
  text-align: center;
  border-top: 1px solid #F2F2F2;
}

.footer-brand {
  margin-bottom: 24px;
}

.brand-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 400;
  color: #1A1A1A;
  display: block;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.brand-tagline {
  font-family: 'Lato', sans-serif;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.15em;
  color: #AAAAAA;
  text-transform: uppercase;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
}

.footer-links a {
  font-family: 'Lato', sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: #888888;
  text-decoration: none;
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: #1A1A1A;
}

.footer-copy {
  font-family: 'Lato', sans-serif;
  font-size: 11px;
  color: #CCCCCC;
}

/* ============================================
   底部導航 - 毛玻璃極簡
   ============================================ */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 24px;
  cursor: pointer;
  color: #AAAAAA;
  transition: color 0.3s ease;
}

.nav-item.active {
  color: #1A1A1A;
}

.nav-item:hover {
  color: #1A1A1A;
}

.nav-item .van-icon {
  font-size: 22px;
}

.nav-item span {
  font-family: 'Lato', sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ============================================
   響應式適配
   ============================================ */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }
  
  .grid-row.featured {
    grid-template-columns: 1fr;
  }
  
  .grid-side {
    flex-direction: row;
  }
  
  .grid-item.large {
    aspect-ratio: 3/4;
  }
  
  .grid-item.small {
    aspect-ratio: 1/1;
  }
  
  .section-title {
    font-size: 26px;
  }
}
</style>
