// ============================================
// 叁通速達 - 匯率狀態管理
// ============================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { rateApi } from '../api/rate'

export const useRateStore = defineStore('rate', () => {
  // ============================================
  // State
  // ============================================
  const rate = ref<number>(4.6)
  const loading = ref(false)
  const lastUpdated = ref<string>('')
  const error = ref<string | null>(null)

  // ============================================
  // Getters
  // ============================================
  const rateDisplay = computed(() => `1 RMB = ${rate.value} TWD`)

  // ============================================
  // Actions
  // ============================================

  /**
   * 從後端獲取當前匯率
   */
  async function fetchRate(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      console.log('[Rate] 獲取匯率...')

      const res = await rateApi.getRate()

      if (res.data.success && res.data.data) {
        rate.value = res.data.data.rate
        lastUpdated.value = res.data.data.updatedAt || new Date().toISOString()

        console.log('[Rate] 當前匯率:', rate.value)
      }
    } catch (err: any) {
      console.error('[Rate] 獲取匯率失敗:', err)
      error.value = err.message || '獲取匯率失敗'
      // 保持默認值 4.6
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新匯率（管理員）
   */
  async function updateRate(newRate: number): Promise<{ success: boolean; message?: string }> {
    loading.value = true
    error.value = null

    try {
      console.log('[Rate] 更新匯率:', newRate)

      const res = await rateApi.updateRate(newRate)

      if (res.data.success) {
        rate.value = res.data.data?.rate || newRate
        lastUpdated.value = res.data.data?.updatedAt || new Date().toISOString()

        console.log('[Rate] 匯率已更新:', rate.value)

        return { success: true }
      }

      return {
        success: false,
        message: res.data.message || '更新失敗',
      }
    } catch (err: any) {
      console.error('[Rate] 更新匯率失敗:', err)

      const message = err.response?.data?.message || '更新匯率失敗'
      error.value = message

      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 計算 TWD 金額
   */
  function calculateTWD(rmb: number): number {
    if (isNaN(rmb) || rmb <= 0) return 0
    return Math.round(rmb * rate.value * 100) / 100
  }

  /**
   * 計算 RMB 金額（反向計算）
   */
  function calculateRMB(twd: number): number {
    if (isNaN(twd) || twd <= 0 || rate.value <= 0) return 0
    return Math.round((twd / rate.value) * 100) / 100
  }

  return {
    // State
    rate,
    loading,
    lastUpdated,
    error,
    // Getters
    rateDisplay,
    // Actions
    fetchRate,
    updateRate,
    calculateTWD,
    calculateRMB,
  }
})
