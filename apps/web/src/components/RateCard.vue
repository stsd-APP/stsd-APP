<script setup lang="ts">
// ============================================
// 匯率顯示卡片組件
// ============================================
import { computed } from 'vue'
import { useRateStore } from '../stores/rate'

const rateStore = useRateStore()

const rateDisplay = computed(() => {
  return `1 RMB = ${rateStore.rate} TWD`
})
</script>

<template>
  <div class="rate-card">
    <div class="rate-icon">
      <div class="i-carbon-currency-dollar text-2xl"></div>
    </div>
    <div class="rate-info">
      <span class="rate-label">今日匯率</span>
      <span class="rate-value">{{ rateDisplay }}</span>
    </div>
  </div>
</template>

<style scoped>
.rate-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.rate-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rate-info {
  display: flex;
  flex-direction: column;
}

.rate-label {
  font-size: 12px;
  opacity: 0.8;
}

.rate-value {
  font-size: 18px;
  font-weight: bold;
}
</style>
