<script setup lang="ts">
// ============================================
// 訂單卡片組件
// ============================================
import { computed } from 'vue'

interface Order {
  id: string
  taobaoUrl: string
  rmbAmount: number
  twdAmount: number
  status: string
  createdAt: string
}

const props = defineProps<{
  order: Order
}>()

const emit = defineEmits<{
  (e: 'click', order: Order): void
}>()

const statusConfig = computed(() => {
  const configs: Record<string, { text: string; color: string; type: string }> = {
    PENDING: { text: '待審核', color: '#ff976a', type: 'warning' },
    PAID: { text: '已付款', color: '#1989fa', type: 'primary' },
    COMPLETED: { text: '已完成', color: '#07c160', type: 'success' },
    REJECTED: { text: '已駁回', color: '#ee0a24', type: 'danger' },
  }
  return configs[props.order.status] || configs.PENDING
})

const shortUrl = computed(() => {
  try {
    const url = new URL(props.order.taobaoUrl)
    return url.hostname + '...'
  } catch {
    return props.order.taobaoUrl.substring(0, 20) + '...'
  }
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="order-card" @click="emit('click', order)">
    <div class="order-header">
      <span class="order-id">#{{ order.id.slice(-8) }}</span>
      <van-tag :type="statusConfig.type as any" size="medium">
        {{ statusConfig.text }}
      </van-tag>
    </div>
    
    <div class="order-body">
      <div class="order-url">
        <div class="i-carbon-link text-gray-400"></div>
        <span>{{ shortUrl }}</span>
      </div>
      
      <div class="order-amounts">
        <div class="amount-item">
          <span class="amount-label">人民幣</span>
          <span class="amount-value rmb">¥ {{ order.rmbAmount.toFixed(2) }}</span>
        </div>
        <div class="amount-arrow">→</div>
        <div class="amount-item">
          <span class="amount-label">台幣</span>
          <span class="amount-value twd">NT$ {{ order.twdAmount.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    
    <div class="order-footer">
      <span class="order-time">{{ formatDate(order.createdAt) }}</span>
      <div class="i-carbon-chevron-right text-gray-300"></div>
    </div>
  </div>
</template>

<style scoped>
.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s;
}

.order-card:active {
  transform: scale(0.98);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.order-body {
  margin-bottom: 12px;
}

.order-url {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.order-amounts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f8f8;
  padding: 12px;
  border-radius: 8px;
}

.amount-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.amount-value {
  font-weight: bold;
}

.amount-value.rmb {
  color: #ee0a24;
}

.amount-value.twd {
  color: #1989fa;
}

.amount-arrow {
  color: #ccc;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.order-time {
  font-size: 12px;
  color: #999;
}
</style>
