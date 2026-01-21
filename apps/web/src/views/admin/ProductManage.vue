<script setup lang="ts">
// ============================================
// 管理員 - 商品發布中心 + 運費規則設置
// ============================================
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { productApi, type Product } from '../../api/product'
import { calculatorApi, type LogisticsRule } from '../../api/calculator'

const router = useRouter()
const authStore = useAuthStore()

// 權限檢查
onMounted(() => {
  if (!authStore.isAdmin) {
    showToast({ type: 'fail', message: '需要管理員權限' })
    router.push('/dashboard')
    return
  }
  fetchProducts()
  fetchRules()
})

// ============================================
// 狀態
// ============================================
const activeTab = ref('products')
const products = ref<Product[]>([])
const rules = ref<LogisticsRule[]>([])
const loading = ref(false)
const refreshing = ref(false)

// 商品表單
const showProductDialog = ref(false)
const editingProduct = ref<Product | null>(null)
const productForm = ref({
  title: '',
  description: '',
  price: '',
  category: 'OTHER',
  length: '',
  width: '',
  height: '',
  weight: '',
  stock: '',
  isFreeShipping: true,
  isActive: true,
  isFeatured: false,
})
const submitting = ref(false)

// 物流規則表單
const showRuleDialog = ref(false)
const editingRule = ref<LogisticsRule | null>(null)
const ruleForm = ref({
  pricePerCbm: '',
  pricePerKg: '',
  minCharge: '',
  estimatedDays: '',
  description: '',
})

// 分類選項
const categoryOptions = [
  { text: '沙發', value: 'SOFA' },
  { text: '床', value: 'BED' },
  { text: '桌子', value: 'TABLE' },
  { text: '椅子', value: 'CHAIR' },
  { text: '櫃子', value: 'CABINET' },
  { text: '其他', value: 'OTHER' },
]

const categoryNames: Record<string, string> = {
  SOFA: '沙發', BED: '床', TABLE: '桌子', CHAIR: '椅子', CABINET: '櫃子', OTHER: '其他',
}

// 計算體積
const calculatedVolume = computed(() => {
  const l = parseInt(productForm.value.length)
  const w = parseInt(productForm.value.width)
  const h = parseInt(productForm.value.height)
  if (l && w && h) {
    return ((l * w * h) / 1000000).toFixed(3)
  }
  return '-'
})

// ============================================
// API
// ============================================
async function fetchProducts() {
  loading.value = true
  try {
    const res = await productApi.getAllProducts({ limit: 100 })
    if (res.data.success) {
      products.value = res.data.data.products
    }
  } catch (error) {
    console.error('獲取商品失敗:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function fetchRules() {
  try {
    const res = await calculatorApi.getRules()
    if (res.data.success) {
      rules.value = res.data.data
    }
  } catch (error) {
    console.error('獲取規則失敗:', error)
  }
}

function openCreateDialog() {
  editingProduct.value = null
  productForm.value = {
    title: '',
    description: '',
    price: '',
    category: 'OTHER',
    length: '',
    width: '',
    height: '',
    weight: '',
    stock: '',
    isFreeShipping: true,
    isActive: true,
    isFeatured: false,
  }
  showProductDialog.value = true
}

function openEditDialog(product: Product) {
  editingProduct.value = product
  productForm.value = {
    title: product.title,
    description: product.description || '',
    price: product.price.toString(),
    category: product.category,
    length: product.length?.toString() || '',
    width: product.width?.toString() || '',
    height: product.height?.toString() || '',
    weight: product.weight?.toString() || '',
    stock: product.stock.toString(),
    isFreeShipping: product.isFreeShipping,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  }
  showProductDialog.value = true
}

async function submitProduct() {
  if (!productForm.value.title.trim()) {
    showToast({ type: 'fail', message: '請輸入商品名稱' })
    return
  }

  const price = parseFloat(productForm.value.price)
  if (isNaN(price) || price <= 0) {
    showToast({ type: 'fail', message: '請輸入有效的價格' })
    return
  }

  // 驗證尺寸
  const length = parseInt(productForm.value.length)
  const width = parseInt(productForm.value.width)
  const height = parseInt(productForm.value.height)
  
  if (!length || !width || !height) {
    showToast({ type: 'fail', message: '請輸入完整的包裝尺寸' })
    return
  }

  submitting.value = true
  try {
    const data: any = {
      title: productForm.value.title,
      description: productForm.value.description,
      price,
      category: productForm.value.category,
      length,
      width,
      height,
      weight: parseFloat(productForm.value.weight) || undefined,
      stock: parseInt(productForm.value.stock) || 0,
      isFreeShipping: productForm.value.isFreeShipping,
      isActive: productForm.value.isActive,
      isFeatured: productForm.value.isFeatured,
    }

    if (editingProduct.value) {
      await productApi.update(editingProduct.value.id, data)
      showSuccessToast('商品已更新')
    } else {
      await productApi.create(data)
      showSuccessToast('商品已創建')
    }

    showProductDialog.value = false
    await fetchProducts()
  } catch (error) {
    console.error('提交失敗:', error)
  } finally {
    submitting.value = false
  }
}

async function deleteProduct(product: Product) {
  try {
    await showConfirmDialog({
      title: '確認刪除',
      message: `確定刪除「${product.title}」？`,
    })

    await productApi.delete(product.id)
    showSuccessToast('商品已刪除')
    await fetchProducts()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

function openRuleDialog(rule: LogisticsRule) {
  editingRule.value = rule
  ruleForm.value = {
    pricePerCbm: rule.pricePerCbm.toString(),
    pricePerKg: rule.pricePerKg?.toString() || '',
    minCharge: rule.minCharge.toString(),
    estimatedDays: rule.estimatedDays?.toString() || '',
    description: rule.description || '',
  }
  showRuleDialog.value = true
}

async function submitRule() {
  if (!editingRule.value) return

  submitting.value = true
  try {
    await calculatorApi.updateRule(editingRule.value.id, {
      pricePerCbm: parseFloat(ruleForm.value.pricePerCbm),
      pricePerKg: parseFloat(ruleForm.value.pricePerKg) || null,
      minCharge: parseFloat(ruleForm.value.minCharge),
      estimatedDays: parseInt(ruleForm.value.estimatedDays) || null,
      description: ruleForm.value.description,
    })

    showSuccessToast('規則已更新')
    showRuleDialog.value = false
    await fetchRules()
  } catch (error) {
    console.error('提交失敗:', error)
  } finally {
    submitting.value = false
  }
}

function refresh() {
  refreshing.value = true
  fetchProducts()
}
</script>

<template>
  <div class="product-manage">
    <!-- 導航欄 -->
    <van-nav-bar
      title="商品管理"
      left-arrow
      @click-left="router.push('/admin')"
      fixed
      placeholder
    />

    <!-- 標籤頁 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46" color="#ee0a24">
      <van-tab name="products" title="商品列表" />
      <van-tab name="logistics" title="運費規則" />
    </van-tabs>

    <!-- ============================================ -->
    <!-- 商品列表 -->
    <!-- ============================================ -->
    <div v-show="activeTab === 'products'" class="products-panel">
      <div class="panel-header">
        <van-button type="danger" size="small" icon="plus" @click="openCreateDialog">
          發布商品
        </van-button>
        <van-button size="small" icon="replay" @click="refresh" :loading="refreshing">
          刷新
        </van-button>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="refresh">
        <van-empty v-if="products.length === 0 && !loading" description="暫無商品" />

        <div v-else class="products-list">
          <div
            v-for="product in products"
            :key="product.id"
            class="product-item"
          >
            <div class="product-image">
              <img :src="product.images[0] || 'https://picsum.photos/200/150'" />
              <div class="product-status" :class="{ inactive: !product.isActive }">
                {{ product.isActive ? '上架中' : '已下架' }}
              </div>
            </div>
            <div class="product-info">
              <div class="product-title">{{ product.title }}</div>
              <div class="product-meta">
                <van-tag type="primary" plain size="small">{{ categoryNames[product.category] }}</van-tag>
                <van-tag type="danger" plain size="small" v-if="product.isFeatured">推薦</van-tag>
                <van-tag type="success" plain size="small" v-if="product.isFreeShipping">包郵</van-tag>
              </div>
              <div class="product-specs">
                <span v-if="product.volume">{{ product.volume.toFixed(2) }} m³</span>
                <span v-if="product.weight">{{ product.weight }} kg</span>
              </div>
              <div class="product-price">¥ {{ product.price.toLocaleString() }}</div>
            </div>
            <div class="product-actions">
              <van-button type="primary" size="small" plain @click="openEditDialog(product)">
                編輯
              </van-button>
              <van-button type="danger" size="small" plain @click="deleteProduct(product)">
                刪除
              </van-button>
            </div>
          </div>
        </div>
      </van-pull-refresh>
    </div>

    <!-- ============================================ -->
    <!-- 運費規則 -->
    <!-- ============================================ -->
    <div v-show="activeTab === 'logistics'" class="logistics-panel">
      <div class="rules-list">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="rule-card"
          @click="openRuleDialog(rule)"
        >
          <div class="rule-header">
            <span class="rule-name">{{ rule.name }}</span>
            <van-tag :type="rule.isDefault ? 'danger' : 'default'" plain size="small">
              {{ rule.isDefault ? '默認' : '備用' }}
            </van-tag>
          </div>
          <div class="rule-body">
            <div class="rule-row">
              <span class="rule-label">每CBM單價</span>
              <span class="rule-value highlight">NT$ {{ rule.pricePerCbm.toLocaleString() }}</span>
            </div>
            <div class="rule-row" v-if="rule.pricePerKg">
              <span class="rule-label">每KG單價</span>
              <span class="rule-value">NT$ {{ rule.pricePerKg }}</span>
            </div>
            <div class="rule-row">
              <span class="rule-label">最低消費</span>
              <span class="rule-value">NT$ {{ rule.minCharge.toLocaleString() }}</span>
            </div>
            <div class="rule-row" v-if="rule.estimatedDays">
              <span class="rule-label">預計天數</span>
              <span class="rule-value">{{ rule.estimatedDays }} 天</span>
            </div>
          </div>
          <div class="rule-desc" v-if="rule.description">
            {{ rule.description }}
          </div>
          <div class="rule-tip">
            <van-icon name="edit" />
            點擊編輯
          </div>
        </div>

        <van-empty v-if="rules.length === 0" description="暫無物流規則" />
      </div>
    </div>

    <!-- ============================================ -->
    <!-- 商品編輯彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showProductDialog"
      :title="editingProduct ? '編輯商品' : '發布商品'"
      :show-confirm-button="false"
      :close-on-click-overlay="false"
    >
      <div class="product-form">
        <van-form @submit="submitProduct">
          <van-cell-group inset>
            <van-field
              v-model="productForm.title"
              label="商品名稱"
              placeholder="請輸入商品名稱"
              required
              :disabled="submitting"
            />
            
            <van-field
              v-model="productForm.price"
              type="number"
              label="價格 (RMB)"
              placeholder="請輸入人民幣價格"
              required
              :disabled="submitting"
            />

            <van-field
              v-model="productForm.category"
              is-link
              readonly
              label="分類"
              :disabled="submitting"
            >
              <template #input>
                {{ categoryNames[productForm.category] }}
              </template>
            </van-field>
          </van-cell-group>

          <div class="form-section-title">📦 包裝尺寸 (必填)</div>
          <van-cell-group inset>
            <van-field
              v-model="productForm.length"
              type="number"
              label="長 (cm)"
              placeholder="長度"
              required
              :disabled="submitting"
            />
            <van-field
              v-model="productForm.width"
              type="number"
              label="寬 (cm)"
              placeholder="寬度"
              required
              :disabled="submitting"
            />
            <van-field
              v-model="productForm.height"
              type="number"
              label="高 (cm)"
              placeholder="高度"
              required
              :disabled="submitting"
            />
            <van-cell title="🔢 預估體積" :value="`${calculatedVolume} m³`" />
          </van-cell-group>

          <van-cell-group inset style="margin-top: 12px">
            <van-field
              v-model="productForm.weight"
              type="number"
              label="重量 (kg)"
              placeholder="選填"
              :disabled="submitting"
            />
            <van-field
              v-model="productForm.stock"
              type="number"
              label="庫存"
              placeholder="0"
              :disabled="submitting"
            />
            <van-cell center title="🇹🇼 台灣包郵">
              <template #right-icon>
                <van-switch v-model="productForm.isFreeShipping" :disabled="submitting" />
              </template>
            </van-cell>
            <van-cell center title="上架狀態">
              <template #right-icon>
                <van-switch v-model="productForm.isActive" :disabled="submitting" />
              </template>
            </van-cell>
            <van-cell center title="首頁推薦">
              <template #right-icon>
                <van-switch v-model="productForm.isFeatured" :disabled="submitting" />
              </template>
            </van-cell>
          </van-cell-group>

          <van-cell-group inset style="margin-top: 12px">
            <van-field
              v-model="productForm.description"
              type="textarea"
              label="商品描述"
              placeholder="選填"
              rows="3"
              :disabled="submitting"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button @click="showProductDialog = false" :disabled="submitting">取消</van-button>
            <van-button type="danger" native-type="submit" :loading="submitting">
              {{ editingProduct ? '更新' : '發布' }}
            </van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>

    <!-- ============================================ -->
    <!-- 運費規則彈窗 -->
    <!-- ============================================ -->
    <van-dialog
      v-model:show="showRuleDialog"
      :title="`編輯: ${editingRule?.name}`"
      :show-confirm-button="false"
    >
      <div class="rule-form">
        <van-form @submit="submitRule">
          <van-cell-group inset>
            <van-field
              v-model="ruleForm.pricePerCbm"
              type="number"
              label="每CBM單價"
              placeholder="TWD/m³"
              required
              :disabled="submitting"
            >
              <template #extra>TWD</template>
            </van-field>
            <van-field
              v-model="ruleForm.pricePerKg"
              type="number"
              label="每KG單價"
              placeholder="選填"
              :disabled="submitting"
            >
              <template #extra>TWD</template>
            </van-field>
            <van-field
              v-model="ruleForm.minCharge"
              type="number"
              label="最低消費"
              placeholder="TWD"
              required
              :disabled="submitting"
            >
              <template #extra>TWD</template>
            </van-field>
            <van-field
              v-model="ruleForm.estimatedDays"
              type="number"
              label="預計天數"
              placeholder="選填"
              :disabled="submitting"
            >
              <template #extra>天</template>
            </van-field>
            <van-field
              v-model="ruleForm.description"
              type="textarea"
              label="說明"
              placeholder="選填"
              rows="2"
              :disabled="submitting"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button @click="showRuleDialog = false" :disabled="submitting">取消</van-button>
            <van-button type="danger" native-type="submit" :loading="submitting">保存</van-button>
          </div>
        </van-form>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.product-manage {
  min-height: 100vh;
  background: #f5f5f5;
}

.products-panel,
.logistics-panel {
  padding: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

/* 商品列表 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-item {
  display: flex;
  gap: 12px;
  background: white;
  padding: 12px;
  border-radius: 12px;
}

.product-image {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.product-status {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: #07c160;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.product-status.inactive {
  background: #969799;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.product-specs {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.product-specs span {
  margin-right: 8px;
}

.product-price {
  color: #ee0a24;
  font-weight: bold;
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 物流規則 */
.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  position: relative;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rule-name {
  font-weight: 600;
  font-size: 15px;
}

.rule-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.rule-label {
  color: #999;
}

.rule-value {
  color: #333;
  font-weight: 500;
}

.rule-value.highlight {
  color: #ee0a24;
  font-size: 16px;
}

.rule-desc {
  font-size: 12px;
  color: #999;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.rule-tip {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 11px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 表單 */
.product-form,
.rule-form {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-section-title {
  font-size: 13px;
  color: #ee0a24;
  padding: 16px 16px 8px;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}
</style>
