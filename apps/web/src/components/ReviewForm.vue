<script setup lang="ts">
// ============================================
// 評價表單組件
// 支持打分、多圖上傳、文字輸入
// ============================================
import { ref, computed } from 'vue'
import { showToast, showSuccessToast, type UploaderFileListItem } from 'vant'
import { reviewApi } from '../api/review'

// ============================================
// Props & Emits
// ============================================
const props = defineProps<{
  orderId: string
  productName?: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success', data: { pointsEarned: number; currentPoints: number }): void
}>()

// ============================================
// 狀態
// ============================================
const rating = ref(5)
const content = ref('')
const images = ref<UploaderFileListItem[]>([])
const isAnonymous = ref(false)
const submitting = ref(false)

// 控制彈窗顯示
const showPopup = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

// ============================================
// 上傳配置
// ============================================
const uploadUrl = '/api/upload/image' // 實際項目中替換為真實上傳接口

function afterRead(file: UploaderFileListItem | UploaderFileListItem[]) {
  const files = Array.isArray(file) ? file : [file]
  files.forEach((f) => {
    f.status = 'uploading'
    f.message = '上傳中...'
    
    // 模擬上傳 (實際項目中調用真實接口)
    setTimeout(() => {
      f.status = 'done'
      f.message = ''
      // 使用 base64 作為預覽 (實際項目中使用返回的 URL)
      if (f.content) {
        f.url = f.content
      }
    }, 500)
  })
}

// ============================================
// 提交評價
// ============================================
async function submitReview() {
  if (rating.value < 1) {
    showToast({ type: 'fail', message: '請選擇評分' })
    return
  }

  submitting.value = true

  try {
    // 收集已上傳圖片的 URL
    const imageUrls = images.value
      .filter((img) => img.status === 'done' && img.url)
      .map((img) => img.url as string)

    const res = await reviewApi.create({
      orderId: props.orderId,
      rating: rating.value,
      content: content.value || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      productName: props.productName,
      isAnonymous: isAnonymous.value,
    })

    if (res.data.success) {
      showSuccessToast(res.data.message)
      emit('success', {
        pointsEarned: res.data.data.pointsEarned,
        currentPoints: res.data.data.currentPoints,
      })
      showPopup.value = false
      resetForm()
    }
  } catch (error: any) {
    showToast({
      type: 'fail',
      message: error.response?.data?.message || '提交失敗',
    })
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  rating.value = 5
  content.value = ''
  images.value = []
  isAnonymous.value = false
}
</script>

<template>
  <van-popup
    v-model:show="showPopup"
    position="bottom"
    round
    :style="{ maxHeight: '90%' }"
    closeable
    close-icon-position="top-right"
  >
    <div class="review-form">
      <!-- 標題 -->
      <div class="form-header">
        <h3>發表評價</h3>
        <p class="reward-tip">🎁 評價成功可獲得 50 積分獎勵</p>
      </div>

      <!-- 評分 -->
      <div class="form-section">
        <label class="section-label">商品評分</label>
        <van-rate
          v-model="rating"
          :size="28"
          color="#F5A623"
          void-icon="star"
          void-color="#E8E8E8"
          allow-half
        />
        <span class="rating-text">
          {{ rating === 5 ? '非常滿意' : rating >= 4 ? '滿意' : rating >= 3 ? '一般' : rating >= 2 ? '不滿意' : '非常不滿意' }}
        </span>
      </div>

      <!-- 圖片上傳 -->
      <div class="form-section">
        <label class="section-label">
          上傳買家秀
          <span class="optional">(選填，最多6張)</span>
        </label>
        <van-uploader
          v-model="images"
          :max-count="6"
          :max-size="5 * 1024 * 1024"
          accept="image/*"
          :after-read="afterRead"
          result-type="dataUrl"
          multiple
        >
          <template #preview-cover="{ file }">
            <div class="preview-cover" v-if="file.status === 'uploading'">
              <van-loading type="spinner" size="20" />
            </div>
          </template>
        </van-uploader>
        <p class="upload-tip">上傳真實買家秀，有機會被精選展示</p>
      </div>

      <!-- 文字評價 -->
      <div class="form-section">
        <label class="section-label">
          評價內容
          <span class="optional">(選填)</span>
        </label>
        <van-field
          v-model="content"
          type="textarea"
          :rows="4"
          :maxlength="500"
          show-word-limit
          placeholder="分享您的購物體驗，幫助其他買家做出選擇..."
          :border="false"
          class="content-input"
        />
      </div>

      <!-- 匿名選項 -->
      <div class="form-section anonymous-section">
        <van-switch v-model="isAnonymous" size="20" />
        <span class="anonymous-label">匿名評價</span>
      </div>

      <!-- 購買商品信息 -->
      <div class="product-info" v-if="productName">
        <van-icon name="bag-o" />
        <span>評價商品：{{ productName }}</span>
      </div>

      <!-- 提交按鈕 -->
      <div class="form-actions">
        <van-button
          type="primary"
          block
          round
          :loading="submitting"
          loading-text="提交中..."
          @click="submitReview"
        >
          提交評價
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
/* ============================================
   評價表單 - 北歐極簡風格
   ============================================ */
.review-form {
  padding: 24px 20px;
  padding-bottom: 40px;
  background: var(--bg-secondary, #fff);
}

.form-header {
  text-align: center;
  margin-bottom: 28px;
}

.form-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary, #2C3E50);
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.reward-tip {
  font-size: 13px;
  color: var(--color-accent, #B84E43);
  margin: 0;
  background: rgba(184, 78, 67, 0.08);
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
  font-weight: 500;
}

.form-section {
  margin-bottom: 28px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary, #2C3E50);
  margin-bottom: 12px;
}

.section-label .optional {
  font-weight: 400;
  color: var(--color-tertiary, #95A5A6);
  font-size: 12px;
}

/* 評分區 */
.rating-text {
  margin-left: 12px;
  font-size: 14px;
  color: #F5A623;
  font-weight: 500;
}

/* 上傳區 */
.upload-tip {
  font-size: 12px;
  color: var(--color-tertiary, #95A5A6);
  margin: 10px 0 0;
}

.preview-cover {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 文字輸入 */
.content-input {
  background: var(--bg-primary, #F7F8FA);
  border-radius: var(--radius-md, 10px);
  padding: 14px;
}

.content-input :deep(.van-field__control) {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-primary, #2C3E50);
}

.content-input :deep(.van-field__control)::placeholder {
  color: var(--color-placeholder, #BDC3C7);
}

/* 匿名選項 */
.anonymous-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--bg-tertiary, #EBEEF5);
  border-bottom: 1px solid var(--bg-tertiary, #EBEEF5);
}

.anonymous-label {
  font-size: 14px;
  color: var(--color-secondary, #5D6D7E);
}

/* 商品信息 */
.product-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-tertiary, #95A5A6);
  margin: 18px 0;
}

/* 提交按鈕 */
.form-actions {
  margin-top: 28px;
}

.form-actions .van-button {
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
