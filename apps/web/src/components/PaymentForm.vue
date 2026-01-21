<script setup lang="ts">
// ============================================
// 代付申請表單組件
// ============================================
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import { useRateStore } from '../stores/rate'
import { orderApi } from '../api/order'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const rateStore = useRateStore()
const isLoading = ref(false)

const form = ref({
  taobaoUrl: '',
  rmbAmount: '',
  remark: '',
})

// 計算 TWD
const twdAmount = computed(() => {
  const rmb = parseFloat(form.value.rmbAmount)
  if (isNaN(rmb) || rmb <= 0) return ''
  return (rmb * rateStore.rate).toFixed(2)
})

// 重置表單
function resetForm() {
  form.value = {
    taobaoUrl: '',
    rmbAmount: '',
    remark: '',
  }
}

// 關閉彈窗
function handleClose() {
  emit('update:visible', false)
  resetForm()
}

// 提交訂單
async function handleSubmit() {
  if (!form.value.taobaoUrl) {
    showToast({ type: 'fail', message: '請輸入商品連結' })
    return
  }
  
  const rmbAmount = parseFloat(form.value.rmbAmount)
  if (isNaN(rmbAmount) || rmbAmount <= 0) {
    showToast({ type: 'fail', message: '請輸入有效的金額' })
    return
  }

  isLoading.value = true
  
  try {
    const res = await orderApi.create({
      taobaoUrl: form.value.taobaoUrl,
      rmbAmount,
      remark: form.value.remark,
    })
    
    if (res.data.success) {
      showToast({ 
        type: 'success', 
        message: `✅ 申請已提交！需支付 NT$ ${twdAmount.value}` 
      })
      emit('success')
      handleClose()
    }
  } catch (error) {
    console.error('提交失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 監聽彈窗打開，刷新匯率
watch(() => props.visible, (val) => {
  if (val) {
    rateStore.fetchRate()
  }
})
</script>

<template>
  <van-popup 
    :show="visible" 
    @update:show="emit('update:visible', $event)"
    position="bottom" 
    round 
    :style="{ height: '60%' }"
    closeable
  >
    <div class="form-container">
      <h3 class="form-title">代付申請</h3>
      
      <van-form @submit="handleSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.taobaoUrl"
            label="商品連結"
            placeholder="請貼上淘寶/1688連結"
            required
            clearable
          >
            <template #left-icon>
              <div class="i-carbon-link text-lg text-gray-400"></div>
            </template>
          </van-field>
          
          <van-field
            v-model="form.rmbAmount"
            type="number"
            label="淘寶金額 (¥)"
            placeholder="輸入人民幣金額"
            required
          >
            <template #left-icon>
              <div class="i-carbon-currency-yen text-lg text-gray-400"></div>
            </template>
          </van-field>
          
          <van-field
            :model-value="twdAmount ? `NT$ ${twdAmount}` : ''"
            label="需支付台幣"
            placeholder="自動換算"
            readonly
            disabled
          >
            <template #left-icon>
              <div class="i-carbon-currency-dollar text-lg text-gray-400"></div>
            </template>
          </van-field>
          
          <van-field
            v-model="form.remark"
            type="textarea"
            label="備註"
            placeholder="選填"
            rows="2"
            autosize
          />
        </van-cell-group>

        <div class="rate-hint">
          匯率：1 RMB = {{ rateStore.rate }} TWD
        </div>

        <div class="form-actions">
          <van-button 
            block 
            type="primary" 
            native-type="submit"
            :loading="isLoading"
            color="#1989fa"
            size="large"
          >
            {{ isLoading ? '提交中...' : '提交申請' }}
          </van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<style scoped>
.form-container {
  padding: 20px 0;
}

.form-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}

.rate-hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 12px 0;
}

.form-actions {
  padding: 0 16px;
  margin-top: 20px;
}
</style>
