// ============================================
// 叁通速達 - API 請求封裝
// ============================================

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { showToast } from 'vant'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 請求攔截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 響應攔截器
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const message = error.response?.data?.message || '請求失敗'
    
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        showToast({ type: 'fail', message: '登錄已過期' })
        setTimeout(() => { window.location.href = '/login' }, 1000)
      }
    } else if (status === 403) {
      showToast({ type: 'fail', message: '無權限訪問' })
    } else {
      showToast({ type: 'fail', message })
    }
    
    return Promise.reject(error)
  }
)

export { authApi } from './auth'
export { orderApi } from './order'
export { rateApi } from './rate'
export { packageApi } from './package'
export { productApi } from './product'
export { calculatorApi } from './calculator'
export { agentApi } from './agent'

export default api
