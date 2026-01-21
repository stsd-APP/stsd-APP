<script setup lang="ts">
// ============================================
// 商品卡片組件 - 畫廊級設計
// ============================================
// 設計理念：去電商化，展示藝術品
// - 隱藏銷量、評價數、原價劃線
// - 圖片佔比 85%
// - 只保留名稱和價格

import { computed } from 'vue'

interface Product {
  id: string
  title: string
  price: number
  priceTWD?: number
  images: string[]
  category?: string
  volume?: number
  isFreeShipping?: boolean
  isFeatured?: boolean
  stock?: number
}

const props = defineProps<{
  product: Product
  lazy?: boolean
  layout?: 'grid' | 'full'
}>()

const emit = defineEmits<{
  (e: 'click', product: Product): void
}>()

// 默認佔位圖
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjJGMkYyIi8+PC9zdmc+'

const imageUrl = computed(() => props.product.images?.[0] || placeholderImage)

const formattedPrice = computed(() => {
  const price = props.product.priceTWD || Math.round(props.product.price * 4.6)
  return price.toLocaleString()
})

// 截取標題
const displayTitle = computed(() => {
  const title = props.product.title
  if (title.length > 24) {
    return title.substring(0, 24) + '...'
  }
  return title
})

function handleClick() {
  emit('click', props.product)
}
</script>

<template>
  <div class="product-card" :class="layout" @click="handleClick">
    <!-- 圖片區域 - 佔比 85% -->
    <div class="card-image">
      <img 
        v-if="lazy" 
        v-lazy="imageUrl" 
        :alt="product.title"
      />
      <img 
        v-else 
        :src="imageUrl" 
        :alt="product.title"
      />
    </div>

    <!-- 信息區域 - 極簡 -->
    <div class="card-info">
      <h3 class="card-title">{{ displayTitle }}</h3>
      <span class="card-price">NT$ {{ formattedPrice }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   畫廊級商品卡片
   ============================================ */
.product-card {
  position: relative;
  cursor: pointer;
  background: #FFFFFF;
  overflow: hidden;
}

/* 圖片區域 - 佔比約 85% */
.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4/5;
  overflow: hidden;
  background: #F2F2F2;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.5s ease;
}

.product-card:hover .card-image img {
  transform: scale(1.03);
}

/* 懶加載狀態 */
.card-image img[lazy="loading"] {
  opacity: 0;
}

.card-image img[lazy="loaded"] {
  opacity: 1;
}

/* 信息區域 - 極簡 15% */
.card-info {
  padding: 16px 4px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

/* 標題 - 襯線體 */
.card-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  line-height: 1.4;
  flex: 1;
  margin: 0;
}

/* 價格 - 精緻小巧 */
.card-price {
  font-family: 'Lato', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #4A4A4A;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Full 佈局變體 */
.product-card.full {
  aspect-ratio: 16/10;
}

.product-card.full .card-image {
  aspect-ratio: auto;
  position: absolute;
  inset: 0;
}

.product-card.full .card-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.product-card.full .card-title {
  color: white;
  font-size: 18px;
}

.product-card.full .card-price {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

/* 點擊過渡動畫 */
.product-card {
  transition: opacity 0.3s ease;
}

.product-card:active {
  opacity: 0.9;
}
</style>
