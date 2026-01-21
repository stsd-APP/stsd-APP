// ============================================
// Review API - 買家評價接口
// ============================================

import { api } from './index'

// ============================================
// 類型定義
// ============================================
export interface Review {
  id: string
  userId: string
  orderId: string
  rating: number
  content: string | null
  images: string[]
  isFeatured: boolean
  reply: string | null
  repliedAt: string | null
  productName: string | null
  isAnonymous: boolean
  createdAt: string
  updatedAt: string
}

export interface FeaturedReview {
  id: string
  rating: number
  content: string | null
  images: string[]
  productName: string | null
  displayName: string
  reply: string | null
  createdAt: string
}

export interface CreateReviewData {
  orderId: string
  rating: number
  content?: string
  images?: string[]
  productName?: string
  isAnonymous?: boolean
}

// ============================================
// API 方法
// ============================================
export const reviewApi = {
  // 獲取首頁精選評價 (公開)
  getFeatured(limit = 10) {
    return api.get<{ success: boolean; data: FeaturedReview[] }>(
      '/reviews/featured',
      { params: { limit } }
    )
  },

  // 提交評價
  create(data: CreateReviewData) {
    return api.post<{
      success: boolean
      message: string
      data: {
        review: Review
        pointsEarned: number
        currentPoints: number
      }
    }>('/reviews', data)
  },

  // 獲取我的評價列表
  getMyReviews(page = 1, limit = 10) {
    return api.get<{
      success: boolean
      data: {
        reviews: Review[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }
    }>('/reviews/my', { params: { page, limit } })
  },

  // 檢查訂單是否可評價
  checkReviewable(orderId: string) {
    return api.get<{
      success: boolean
      data: {
        canReview: boolean
        reason?: string
        review?: Review
      }
    }>(`/reviews/check/${orderId}`)
  },

  // ============================================
  // 管理員接口
  // ============================================
  
  // 獲取所有評價
  adminGetAll(params: {
    page?: number
    limit?: number
    isFeatured?: boolean
    rating?: number
  } = {}) {
    return api.get<{
      success: boolean
      data: {
        reviews: (Review & { user: { id: string; name: string; email: string } })[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }
    }>('/reviews/admin/all', { params })
  },

  // 切換精選狀態
  adminToggleFeatured(reviewId: string) {
    return api.patch<{ success: boolean; message: string; data: Review }>(
      `/reviews/admin/${reviewId}/feature`
    )
  },

  // 回復評價
  adminReply(reviewId: string, reply: string) {
    return api.patch<{ success: boolean; message: string; data: Review }>(
      `/reviews/admin/${reviewId}/reply`,
      { reply }
    )
  },

  // 刪除評價
  adminDelete(reviewId: string) {
    return api.delete<{ success: boolean; message: string }>(
      `/reviews/admin/${reviewId}`
    )
  },
}
