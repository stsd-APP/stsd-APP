// ============================================
// 積分錢包 API
// ============================================

import { api } from './index'

export interface PointLog {
  id: string
  userId: string
  amount: number
  type: 'ORDER_REWARD' | 'ORDER_DEDUCT' | 'ADMIN_ADJUST' | 'REFUND'
  description: string | null
  orderId: string | null
  balanceAfter: number
  createdAt: string
}

export interface WalletBalance {
  points: number
  valueTwd: number
  pointsValue: number
}

export interface DeductionInfo {
  availablePoints: number
  maxDeductiblePoints: number
  maxDeductibleTwd: number
  pointsValue: number
}

export const walletApi = {
  // 獲取積分餘額
  getBalance: () => {
    return api.get<{ success: boolean; data: WalletBalance }>('/wallet/balance')
  },

  // 獲取積分記錄
  getLogs: (params?: { page?: number; limit?: number }) => {
    return api.get<{ success: boolean; data: { logs: PointLog[]; pagination: any } }>('/wallet/logs', { params })
  },

  // 計算可抵扣金額
  calculateDeduction: (maxDeductTwd?: number) => {
    return api.get<{ success: boolean; data: DeductionInfo }>('/wallet/calculate-deduction', {
      params: maxDeductTwd ? { maxDeductTwd } : undefined,
    })
  },

  // [Admin] 調整積分
  adminAdjust: (userId: string, amount: number, description?: string) => {
    return api.post<{ success: boolean; message: string }>('/wallet/admin/adjust', {
      userId,
      amount,
      description,
    })
  },
}

export default walletApi
