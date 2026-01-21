// ============================================
// 訂單相關 API
// ============================================

import { api } from './index'

// ============================================
// 類型定義
// ============================================
export interface CreateOrderParams {
  taobaoUrl: string
  rmbAmount: number
  remark?: string
}

export interface QueryOrdersParams {
  page?: number
  limit?: number
  status?: 'PENDING' | 'PAID' | 'COMPLETED' | 'REJECTED'
}

export interface UpdateStatusParams {
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'REJECTED'
  remark?: string
}

export interface Order {
  id: string
  userId: string
  taobaoUrl: string
  rmbAmount: number
  exchangeRate: number
  twdAmount: number
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'REJECTED'
  logs: string | null
  remark: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    email: string
    name: string
  }
}

export interface OrdersResponse {
  success: boolean
  data: {
    orders: Order[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    stats?: {
      PENDING: number
      PAID: number
      COMPLETED: number
      REJECTED: number
    }
  }
}

export interface StatsResponse {
  success: boolean
  data: {
    totalOrders: number
    pendingOrders: number
    totalAmount: number
  }
}

// ============================================
// API 方法
// ============================================
export const orderApi = {
  /**
   * 創建代付訂單
   */
  create: (data: CreateOrderParams) => {
    return api.post<{ success: boolean; message: string; data: Order }>('/orders', data)
  },

  /**
   * 獲取我的訂單列表
   */
  getMyOrders: (params?: QueryOrdersParams) => {
    return api.get<OrdersResponse>('/orders/my', { params })
  },

  /**
   * 獲取訂單詳情
   */
  getDetail: (id: string) => {
    return api.get<{ success: boolean; data: Order }>(`/orders/${id}`)
  },

  /**
   * 獲取用戶統計數據
   */
  getStats: () => {
    return api.get<StatsResponse>('/orders/stats')
  },

  /**
   * [Admin] 獲取所有訂單列表
   */
  getAllOrders: (params?: QueryOrdersParams) => {
    return api.get<OrdersResponse>('/orders/admin/all', { params })
  },

  /**
   * [Admin] 獲取全局統計數據
   */
  getAdminStats: () => {
    return api.get<StatsResponse>('/orders/admin/stats')
  },

  /**
   * [Admin] 更新訂單狀態
   */
  updateStatus: (id: string, status: string, remark?: string) => {
    return api.patch<{ success: boolean; message: string; data: Order }>(
      `/orders/admin/${id}/status`,
      { status, remark }
    )
  },
}

export default orderApi
