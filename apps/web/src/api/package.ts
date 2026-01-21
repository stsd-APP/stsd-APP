// ============================================
// 包裹相關 API
// 含驗貨報告 (QC Report) 功能
// ============================================

import { api } from './index'

export interface QcReport {
  status: 'PASSED' | 'ISSUE_FOUND'
  statusText: string
  statusColor: string
  images: string[]
  note: string | null
  isReinforced: boolean
  qcAt: string | null
  message: string
}

export interface Package {
  id: string
  userId: string
  trackingNumber: string
  logisticsCompany: string | null
  description: string | null
  weight: number | null
  volume: number | null
  quantity: number
  status: 'PREDICTED' | 'IN_WAREHOUSE' | 'PACKED' | 'SHIPPED' | 'DELIVERED'
  remark: string | null
  inboundAt: string | null
  shippedAt: string | null
  createdAt: string
  updatedAt: string
  // 驗貨報告字段
  qcStatus?: string | null
  qcImages?: string[]
  qcNote?: string | null
  isReinforced?: boolean
  qcAt?: string | null
  qcReport?: QcReport
  user?: {
    id: string
    email: string
    name: string
    phone?: string
  }
}

export interface Warehouse {
  id: string
  name: string
  contactName: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  postalCode: string | null
}

export interface CreatePackageParams {
  trackingNumber: string
  logisticsCompany?: string
  description?: string
  remark?: string
}

export interface QueryPackagesParams {
  page?: number
  limit?: number
  status?: string
  trackingNumber?: string
}

export interface SubmitQcParams {
  qcStatus: 'PASSED' | 'ISSUE_FOUND'
  qcImages: string[]
  qcNote?: string
  isReinforced?: boolean
}

export const packageApi = {
  // 獲取倉庫地址
  getWarehouse: () => {
    return api.get<{ success: boolean; data: Warehouse | null }>('/packages/warehouse')
  },

  // 預報包裹
  create: (data: CreatePackageParams) => {
    return api.post<{ success: boolean; message: string; data: Package }>('/packages', data)
  },

  // 我的包裹列表
  getMyPackages: (params?: QueryPackagesParams) => {
    return api.get<{ success: boolean; data: { packages: Package[]; stats: any; pagination: any } }>('/packages/my', { params })
  },

  // 獲取單個包裹詳情 (含驗貨報告)
  getPackageDetail: (id: string) => {
    return api.get<{ success: boolean; data: Package }>(`/packages/my/${id}`)
  },

  // [Admin] 所有包裹
  getAllPackages: (params?: QueryPackagesParams) => {
    return api.get<{ success: boolean; data: { packages: Package[]; stats: any; pagination: any } }>('/packages/admin/all', { params })
  },

  // [Admin] 待驗貨列表
  getPendingQc: (params?: QueryPackagesParams) => {
    return api.get<{ success: boolean; data: { packages: Package[]; pagination: any } }>('/packages/admin/pending-qc', { params })
  },

  // [Admin] 按單號查詢
  searchByTracking: (trackingNumber: string) => {
    return api.get<{ success: boolean; data: Package | null }>(`/packages/admin/search/${trackingNumber}`)
  },

  // [Admin] 確認入庫
  inbound: (id: string, data: { weight: number; volume?: number; remark?: string }) => {
    return api.post<{ success: boolean; message: string; data: Package }>(`/packages/admin/${id}/inbound`, data)
  },

  // [Admin] 提交驗貨報告
  submitQc: (id: string, data: SubmitQcParams) => {
    return api.post<{ success: boolean; message: string; data: Package }>(`/packages/admin/${id}/qc`, data)
  },

  // [Admin] 新建並入庫
  createAndInbound: (data: any) => {
    return api.post<{ success: boolean; message: string; data: Package }>('/packages/admin/create-inbound', data)
  },

  // [Admin] 更新狀態
  updateStatus: (id: string, status: string) => {
    return api.patch<{ success: boolean; message: string; data: Package }>(`/packages/admin/${id}/status`, { status })
  },

  // 獲取物流軌跡
  getTracking: (id: string) => {
    return api.get<{ success: boolean; data: any }>(`/packages/my/${id}/tracking`)
  },

  // [Admin] 更新物流狀態
  updateLogisticsStatus: (id: string, data: { status: string; location?: string; description?: string }) => {
    return api.patch<{ success: boolean; message: string }>(`/packages/admin/${id}/logistics-status`, data)
  },
}

export default packageApi
