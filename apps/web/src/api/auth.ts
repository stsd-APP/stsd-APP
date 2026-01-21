// ============================================
// 認證相關 API
// ============================================

import { api } from './index'

// ============================================
// 類型定義
// ============================================
export interface LoginParams {
  email: string
  password: string
}

export interface RegisterParams {
  email: string
  password: string
  name?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  balance: number
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

export interface ProfileResponse {
  success: boolean
  data: User
}

// ============================================
// API 方法
// ============================================
export const authApi = {
  /**
   * 用戶登錄
   */
  login: (data: LoginParams) => {
    return api.post<AuthResponse>('/auth/login', data)
  },

  /**
   * 用戶註冊
   */
  register: (data: RegisterParams) => {
    return api.post<AuthResponse>('/auth/register', data)
  },

  /**
   * 獲取當前用戶資料
   */
  getProfile: () => {
    return api.get<ProfileResponse>('/auth/profile')
  },
}

export default authApi
