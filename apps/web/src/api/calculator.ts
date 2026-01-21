// ============================================
// 運費計算器 API
// ============================================

import { api } from './index'

export interface CalculateQuoteParams {
  length: number  // cm
  width: number   // cm
  height: number  // cm
  weight?: number // kg
}

export interface QuoteResult {
  length: number
  width: number
  height: number
  weight: number | null
  volumeCbm: number
  volumetricWeight: number
  chargeableWeight: number
  volumeFee: number
  weightFee: number
  calculatedFee: number
  minCharge: number
  finalFee: number
  ruleName: string
  pricePerCbm: number
  pricePerKg: number | null
  estimatedDays: number | null
  note: string
}

export interface LogisticsRule {
  id: string
  name: string
  code: string
  pricePerCbm: number
  pricePerKg: number | null
  minCharge: number
  estimatedDays: number | null
  description: string | null
  isActive: boolean
  isDefault: boolean
}

export const calculatorApi = {
  // 運費試算
  calculateQuote: (data: CalculateQuoteParams) => {
    return api.post<{ success: boolean; data: QuoteResult }>('/calculator/quote', data)
  },

  // 獲取物流規則
  getRules: () => {
    return api.get<{ success: boolean; data: LogisticsRule[] }>('/calculator/rules')
  },

  // [Admin] 更新物流規則
  updateRule: (id: string, data: Partial<LogisticsRule>) => {
    return api.put<{ success: boolean; message: string; data: LogisticsRule }>(`/calculator/rules/${id}`, data)
  },
}

export default calculatorApi
