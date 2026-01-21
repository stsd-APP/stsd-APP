// ============================================
// 匯率相關 API
// ============================================

import { api } from './index'

// ============================================
// 類型定義
// ============================================
export interface RateInfo {
  rate: number
  currency: {
    from: string
    to: string
  }
  description: string
  updatedAt: string
}

export interface RateResponse {
  success: boolean
  data: RateInfo
}

export interface UpdateRateResponse {
  success: boolean
  message: string
  data: {
    rate: number
    updatedAt: string
  }
}

export interface CalculateResponse {
  success: boolean
  data: {
    rmb: number
    twd: number
    rate: number
  }
}

// ============================================
// API 方法
// ============================================
export const rateApi = {
  /**
   * 獲取當前匯率
   */
  getRate: () => {
    return api.get<RateResponse>('/rate')
  },

  /**
   * [Admin] 更新匯率
   */
  updateRate: (rate: number) => {
    return api.post<UpdateRateResponse>('/rate', { rate })
  },

  /**
   * 計算 TWD 金額
   */
  calculate: (rmb: number) => {
    return api.get<CalculateResponse>(`/rate/calculate?rmb=${rmb}`)
  },
}

export default rateApi
