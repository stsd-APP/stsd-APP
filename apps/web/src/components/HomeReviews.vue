<script setup lang="ts">
// ============================================
// 首頁買家秀輪播組件
// 社會認同感 (Social Proof) 提升轉化
// ============================================
import { ref, onMounted } from 'vue'
import { showImagePreview } from 'vant'
import { reviewApi, type FeaturedReview } from '../api/review'

// ============================================
// 狀態
// ============================================
const reviews = ref<FeaturedReview[]>([])
const loading = ref(true)

// ============================================
// 獲取精選評價
// ============================================
async function fetchFeaturedReviews() {
  try {
    const res = await reviewApi.getFeatured(8)
    if (res.data.success) {
      reviews.value = res.data.data
    }
  } catch (error) {
    console.error('獲取精選評價失敗:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFeaturedReviews()
})

// ============================================
// 星級渲染
// ============================================
function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// ============================================
// 時間格式化
// ============================================
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}週前`
  return `${Math.floor(days / 30)}個月前`
}

// ============================================
// 預覽大圖
// ============================================
function previewImages(images: string[], startIndex = 0) {
  showImagePreview({
    images,
    startPosition: startIndex,
    closeable: true,
  })
}
</script>

<template>
  <section class="home-reviews" v-if="reviews.length > 0 || loading">
    <!-- 標題區 -->
    <div class="section-header">
      <div class="title-row">
        <span class="icon">💬</span>
        <h2>真實買家秀</h2>
      </div>
      <p class="subtitle">來自已購客戶的真實評價</p>
    </div>

    <!-- 載入中骨架屏 -->
    <div v-if="loading" class="loading-skeleton">
      <div class="skeleton-card" v-for="i in 2" :key="i">
        <van-skeleton :row="3" avatar />
      </div>
    </div>

    <!-- 評價輪播 -->
    <van-swipe
      v-else
      class="reviews-swipe"
      :autoplay="5000"
      :show-indicators="reviews.length > 1"
      indicator-color="#1a1a2e"
      :loop="true"
      :width="320"
    >
      <van-swipe-item v-for="review in reviews" :key="review.id">
        <div class="review-card">
          <!-- 頭部：用戶信息 + 星級 -->
          <div class="card-header">
            <div class="user-info">
              <div class="avatar">
                {{ review.displayName.charAt(0) }}
              </div>
              <div class="user-meta">
                <span class="username">{{ review.displayName }}</span>
                <span class="stars" :class="`rating-${review.rating}`">
                  {{ renderStars(review.rating) }}
                </span>
              </div>
            </div>
            <span class="review-time">{{ formatTime(review.createdAt) }}</span>
          </div>

          <!-- 圖片區：買家秀核心 -->
          <div class="card-images" v-if="review.images.length > 0">
            <div
              v-for="(img, idx) in review.images.slice(0, 3)"
              :key="idx"
              class="image-item"
              @click="previewImages(review.images, idx)"
            >
              <img v-lazy="img" :alt="`買家秀 ${idx + 1}`" />
              <div v-if="idx === 2 && review.images.length > 3" class="image-more">
                +{{ review.images.length - 3 }}
              </div>
            </div>
          </div>

          <!-- 文字評價 -->
          <p class="card-content" v-if="review.content">
            {{ review.content }}
          </p>

          <!-- 底部：購買商品 -->
          <div class="card-footer" v-if="review.productName">
            <van-icon name="bag-o" size="14" color="#999" />
            <span>已購：{{ review.productName }}</span>
          </div>

          <!-- 商家回復 -->
          <div class="merchant-reply" v-if="review.reply">
            <span class="reply-label">商家回復：</span>
            <span class="reply-content">{{ review.reply }}</span>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <!-- 查看更多 (可選) -->
    <div class="view-more" v-if="reviews.length > 0">
      <span>滑動查看更多評價</span>
      <van-icon name="arrow" />
    </div>
  </section>
</template>

<style scoped>
/* ============================================
   買家秀輪播 - 北歐極簡風格
   ============================================ */
.home-reviews {
  padding: 28px 16px;
  background: var(--bg-warm, #FAFAF8);
}

/* 標題區 */
.section-header {
  margin-bottom: 20px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-row .icon {
  font-size: 20px;
}

.title-row h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary, #2C3E50);
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 12px;
  color: var(--color-tertiary, #95A5A6);
  margin: 6px 0 0 28px;
}

/* 骨架屏 */
.loading-skeleton {
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.skeleton-card {
  flex: 0 0 300px;
  background: var(--bg-secondary, white);
  border-radius: var(--radius-lg, 12px);
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 輪播 */
.reviews-swipe {
  padding-bottom: 28px;
}

.reviews-swipe :deep(.van-swipe__indicators) {
  bottom: 6px;
}

.reviews-swipe :deep(.van-swipe__indicator) {
  background: rgba(44, 62, 80, 0.2);
  width: 6px;
  height: 6px;
}

.reviews-swipe :deep(.van-swipe__indicator--active) {
  background: var(--color-primary, #2C3E50);
  width: 18px;
  border-radius: 3px;
}

/* 評價卡片 */
.review-card {
  background: var(--bg-secondary, white);
  border-radius: var(--radius-lg, 12px);
  padding: 18px;
  margin: 0 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

/* 卡片頭部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2C3E50 0%, #5D6D7E 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary, #2C3E50);
}

.stars {
  font-size: 13px;
  letter-spacing: 1px;
}

.stars.rating-5 { color: #F5A623; }
.stars.rating-4 { color: #F5B041; }
.stars.rating-3 { color: #F8C471; }
.stars.rating-2 { color: #BDC3C7; }
.stars.rating-1 { color: #95A5A6; }

.review-time {
  font-size: 11px;
  color: var(--color-tertiary, #95A5A6);
}

/* 圖片區 */
.card-images {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.image-item {
  position: relative;
  width: 78px;
  height: 78px;
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.image-item:active img {
  transform: scale(1.08);
}

.image-more {
  position: absolute;
  inset: 0;
  background: rgba(44, 62, 80, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

/* 文字評價 */
.card-content {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-body, #566573);
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部 */
.card-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-tertiary, #95A5A6);
  padding-top: 10px;
  border-top: 1px solid var(--bg-tertiary, #EBEEF5);
}

/* 商家回復 */
.merchant-reply {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-primary, #F7F8FA);
  border-radius: var(--radius-sm, 8px);
  font-size: 12px;
}

.reply-label {
  color: var(--color-accent, #B84E43);
  font-weight: 500;
}

.reply-content {
  color: var(--color-secondary, #5D6D7E);
}

/* 查看更多 */
.view-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-tertiary, #95A5A6);
  margin-top: 10px;
}
</style>
