// ============================================
// 叁通速達 - 認證狀態管理 (含代理系統)
// ============================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api'

interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  balance: number
  // 代理系統字段
  isAgent?: boolean
  agentCode?: string
  agentName?: string
  commissionBalance?: number
  referrerId?: string
  createdAt?: string
}

export const useAuthStore = defineStore('auth', () => {
  // ============================================
  // State
  // ============================================
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  // ============================================
  // Getters
  // ============================================
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isAgent = computed(() => user.value?.isAgent === true)
  const userName = computed(() => {
    if (user.value?.name) return user.value.name
    if (user.value?.email) return user.value.email.split('@')[0]
    return '用戶'
  })

  // ============================================
  // Actions
  // ============================================
  
  /**
   * 初始化認證狀態（從 localStorage 恢復）
   */
  function initAuth() {
    if (initialized.value) return
    
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      token.value = savedToken
      try {
        user.value = JSON.parse(savedUser)
        console.log('[Auth] 已從本地恢復登錄狀態:', user.value?.email)
      } catch (e) {
        console.error('[Auth] 解析用戶數據失敗:', e)
        logout()
      }
    }
    
    initialized.value = true
  }

  /**
   * 用戶登錄
   */
  async function login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    loading.value = true
    
    try {
      console.log('[Auth] 嘗試登錄:', email)
      
      const res = await api.post('/auth/login', { email, password })
      
      console.log('[Auth] 登錄響應:', res.data)
      
      if (res.data.success && res.data.data) {
        const { token: newToken, user: userData } = res.data.data
        
        token.value = newToken
        user.value = userData
        
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(userData))
        
        console.log('[Auth] 登錄成功:', userData.email, '角色:', userData.role, '代理:', userData.isAgent)
        
        return { success: true }
      }
      
      return { 
        success: false, 
        message: res.data.message || '登錄失敗' 
      }
    } catch (error: any) {
      console.error('[Auth] 登錄錯誤:', error)
      
      const message = error.response?.data?.message || '登錄失敗，請檢查帳號密碼'
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用戶註冊 (支持推薦碼)
   */
  async function register(
    email: string, 
    password: string, 
    name?: string,
    refCode?: string
  ): Promise<{ success: boolean; message?: string }> {
    loading.value = true
    
    try {
      console.log('[Auth] 嘗試註冊:', email, refCode ? `推薦碼: ${refCode}` : '')
      
      const res = await api.post('/auth/register', { 
        email, 
        password, 
        name,
        refCode, // 推薦碼
      })
      
      if (res.data.success && res.data.data) {
        const { token: newToken, user: userData } = res.data.data
        
        token.value = newToken
        user.value = userData
        
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(userData))
        
        console.log('[Auth] 註冊成功:', userData.email, userData.referrerId ? '已綁定推薦人' : '')
        
        return { 
          success: true,
          message: res.data.message || '註冊成功',
        }
      }
      
      return { 
        success: false, 
        message: res.data.message || '註冊失敗' 
      }
    } catch (error: any) {
      console.error('[Auth] 註冊錯誤:', error)
      
      const message = error.response?.data?.message || '註冊失敗，請稍後再試'
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 獲取用戶資料
   */
  async function fetchProfile(): Promise<void> {
    if (!token.value) return
    
    try {
      const res = await api.get('/auth/profile')
      
      if (res.data.success && res.data.data) {
        user.value = res.data.data
        localStorage.setItem('user', JSON.stringify(res.data.data))
        console.log('[Auth] 用戶資料已更新')
      }
    } catch (error) {
      console.error('[Auth] 獲取用戶資料失敗:', error)
      logout()
    }
  }

  /**
   * 登出
   */
  function logout(): void {
    console.log('[Auth] 用戶登出')
    
    token.value = null
    user.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    // State
    user,
    token,
    initialized,
    loading,
    // Getters
    isAuthenticated,
    isAdmin,
    isAgent,
    userName,
    // Actions
    initAuth,
    login,
    register,
    fetchProfile,
    logout,
  }
})
