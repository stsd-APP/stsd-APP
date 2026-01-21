// ============================================
// 商品相關 API
// ============================================

import { api } from './index'

export interface Product {
  id: string
  title: string
  description: string | null
  price: number
  priceTWD?: number
  exchangeRate?: number
  images: string[]
  category: 'SOFA' | 'BED' | 'TABLE' | 'CHAIR' | 'CABINET' | 'OTHER'
  length: number | null
  width: number | null
  height: number | null
  weight: number | null
  volume: number | null
  isFreeShipping: boolean
  stock: number
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: string
  shippingTag?: string | null
  shippingFee?: number
  totalPriceTWD?: number
  marketingText?: string
}

export interface QueryProductsParams {
  page?: number
  limit?: number
  category?: string
  keyword?: string
  featured?: boolean
}

export interface CreateProductParams {
  title: string
  description?: string
  price: number
  images?: string[]
  category?: string
  length?: number
  width?: number
  height?: number
  weight?: number
  isFreeShipping?: boolean
  stock?: number
  isActive?: boolean
  isFeatured?: boolean
  sortOrder?: number
}

export const productApi = {
  // 商品列表 (前台)
  getProducts: (params?: QueryProductsParams) => {
    return api.get<{ success: boolean; data: { products: Product[]; pagination: any; exchangeRate: number } }>('/products', { params })
  },

  // 推薦商品
  getFeatured: () => {
    return api.get<{ success: boolean; data: { products: Product[] } }>('/products/featured')
  },

  // 商品詳情
  getDetail: (id: string) => {
    return api.get<{ success: boolean; data: Product }>(`/products/${id}`)
  },

  // [Admin] 所有商品
  getAllProducts: (params?: QueryProductsParams) => {
    return api.get<{ success: boolean; data: { products: Product[]; pagination: any } }>('/products/admin/all', { params })
  },

  // [Admin] 創建商品
  create: (data: CreateProductParams) => {
    return api.post<{ success: boolean; message: string; data: Product }>('/products/admin', data)
  },

  // [Admin] 更新商品
  update: (id: string, data: CreateProductParams) => {
    return api.put<{ success: boolean; message: string; data: Product }>(`/products/admin/${id}`, data)
  },

  // [Admin] 刪除商品
  delete: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/products/admin/${id}`)
  },
}

export default productApi
