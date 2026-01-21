// ============================================
// 代理分銷 API
// ============================================

import { api } from './index'

export interface AgentStats {
  agentCode: string
  agentName: string
  commissionRate: number
  clientCount: number
  balance: number
  totalEarnings: number
  monthEarnings: number
  promotionLink: string
}

export interface Client {
  id: string
  name: string
  email: string
  registeredAt: string
  orderCount: number
  packageCount: number
  lastOrderAt: string | null
  lastOrderAmount: number | null
}

export interface CommissionRecord {
  id: string
  agentId: string
  orderId: string | null
  amount: number
  type: 'ORDER' | 'SHIPPING' | 'BONUS' | 'WITHDRAWAL'
  description: string | null
  balanceAfter: number
  createdAt: string
}

export const agentApi = {
  // 驗證推薦碼
  verifyCode: (code: string) => {
    return api.get<{ success: boolean; data?: { agentId: string; agentName: string }; message?: string }>(`/agent/verify/${code}`)
  },

  // 申請成為代理
  apply: (data: { agentName: string; agentCode?: string }) => {
    return api.post<{ success: boolean; message: string; data: { agentCode: string; agentName: string } }>('/agent/apply', data)
  },

  // 獲取代理統計
  getStats: () => {
    return api.get<{ success: boolean; data: AgentStats }>('/agent/stats')
  },

  // 獲取客戶列表
  getClients: (params?: { page?: number; limit?: number }) => {
    return api.get<{ success: boolean; data: { clients: Client[]; pagination: any } }>('/agent/clients', { params })
  },

  // 獲取佣金記錄
  getCommissions: (params?: { page?: number; limit?: number }) => {
    return api.get<{ success: boolean; data: { records: CommissionRecord[]; pagination: any } }>('/agent/commissions', { params })
  },
}

export default agentApi
