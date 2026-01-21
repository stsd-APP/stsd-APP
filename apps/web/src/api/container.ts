// ============================================
// 裝櫃管理 API
// ============================================

import { api } from './index'

export interface Container {
  id: string
  containerNo: string
  vesselName: string | null
  voyageNo: string | null
  etd: string | null
  eta: string | null
  atd: string | null
  ata: string | null
  status: 'LOADING' | 'SEALED' | 'SHIPPED' | 'ARRIVED' | 'CLEARED' | 'COMPLETED'
  totalWeight: number
  totalVolume: number
  totalPieces: number
  remark: string | null
  createdAt: string
  updatedAt: string
  packageCount?: number
  packages?: any[]
}

export const containerApi = {
  // 創建集裝箱
  create: (data: {
    containerNo: string
    vesselName?: string
    voyageNo?: string
    etd?: string
    eta?: string
    remark?: string
  }) => {
    return api.post<{ success: boolean; message: string; data: Container }>('/containers', data)
  },

  // 獲取集裝箱列表
  getList: (params?: { status?: string; page?: number; limit?: number }) => {
    return api.get<{ success: boolean; data: { containers: Container[]; pagination: any } }>('/containers', { params })
  },

  // 獲取集裝箱詳情
  getDetail: (id: string) => {
    return api.get<{ success: boolean; data: Container }>(`/containers/${id}`)
  },

  // 獲取待裝櫃包裹
  getAvailablePackages: (params?: { page?: number; limit?: number }) => {
    return api.get<{ success: boolean; data: { packages: any[]; pagination: any } }>('/containers/available-packages', { params })
  },

  // 裝櫃操作
  loadPackages: (containerId: string, packageIds: string[]) => {
    return api.post<{ success: boolean; message: string }>(`/containers/${containerId}/load`, { packageIds })
  },

  // 封櫃
  seal: (containerId: string) => {
    return api.post<{ success: boolean; message: string }>(`/containers/${containerId}/seal`)
  },

  // 更新狀態
  updateStatus: (containerId: string, status: string, data?: { atd?: string; ata?: string }) => {
    return api.patch<{ success: boolean; message: string }>(`/containers/${containerId}/status`, { status, ...data })
  },

  // 導出 Packing List (返回 Blob)
  exportPackingList: (containerId: string) => {
    return api.get(`/containers/${containerId}/packing-list`, { responseType: 'blob' })
  },
}

export default containerApi
