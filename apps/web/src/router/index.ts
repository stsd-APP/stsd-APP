// ============================================
// 叁通速達 - 路由配置 (含代理分銷追踪)
// ============================================
// 策略：
// 1. 首屏只加載商城 (FB 廣告優化)
// 2. 監聽 ?ref=xxx 參數，存入 localStorage

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// ============================================
// 路由分組 - 按業務優先級懶加載
// ============================================

// 【首屏核心】商城相關
const MallHome = () => import(/* webpackChunkName: "mall" */ '../views/mall/Home.vue')
const ProductDetail = () => import(/* webpackChunkName: "mall" */ '../views/mall/Detail.vue')

// 【工具頁】
const Calculator = () => import(/* webpackChunkName: "tools" */ '../views/tool/Calculator.vue')

// 【用戶中心】
const UserHome = () => import(/* webpackChunkName: "user" */ '../views/dashboard/UserHome.vue')
const Orders = () => import(/* webpackChunkName: "user" */ '../views/dashboard/Orders.vue')
const Warehouse = () => import(/* webpackChunkName: "user" */ '../views/dashboard/Warehouse.vue')

// 【認證頁】
const Login = () => import(/* webpackChunkName: "auth" */ '../views/auth/Login.vue')
const Register = () => import(/* webpackChunkName: "auth" */ '../views/auth/Register.vue')

// 【代理中心】
const AgentDashboard = () => import(/* webpackChunkName: "agent" */ '../views/agent/Dashboard.vue')

// 【物流追蹤】
const Tracking = () => import(/* webpackChunkName: "tracking" */ '../views/tracking/Tracking.vue')

// 【管理後台】
const AdminHome = () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminHome.vue')
const WarehouseOps = () => import(/* webpackChunkName: "admin" */ '../views/admin/WarehouseOps.vue')
const ProductManage = () => import(/* webpackChunkName: "admin" */ '../views/admin/ProductManage.vue')
const ContainerManage = () => import(/* webpackChunkName: "admin" */ '../views/admin/ContainerManage.vue')

// ============================================
// 路由配置
// ============================================
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/mall' },

  // 【商城】
  {
    path: '/mall',
    name: 'Mall',
    component: MallHome,
    meta: { title: '叁通家具' },
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: ProductDetail,
    meta: { title: '商品詳情' },
  },

  // 【工具】
  {
    path: '/calculator',
    name: 'Calculator',
    component: Calculator,
    meta: { title: '運費計算器' },
  },

  // 【認證】
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true, title: '登錄' },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guest: true, title: '註冊' },
  },

  // 【用戶中心】
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: UserHome,
    meta: { requiresAuth: true, title: '我的首頁' },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    meta: { requiresAuth: true, title: '我的訂單' },
  },
  {
    path: '/warehouse',
    name: 'Warehouse',
    component: Warehouse,
    meta: { requiresAuth: true, title: '我的集運' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: UserHome,
    meta: { requiresAuth: true, title: '個人中心' },
  },

  // 【代理中心】
  {
    path: '/agent',
    name: 'Agent',
    component: AgentDashboard,
    meta: { requiresAuth: true, title: '代理中心' },
  },

  // 【管理後台】
  {
    path: '/admin',
    name: 'Admin',
    component: AdminHome,
    meta: { requiresAuth: true, requiresAdmin: true, title: '管理後台' },
  },
  {
    path: '/admin/warehouse',
    name: 'AdminWarehouse',
    component: WarehouseOps,
    meta: { requiresAuth: true, requiresAdmin: true, title: '倉庫操作台' },
  },
  {
    path: '/admin/products',
    name: 'AdminProducts',
    component: ProductManage,
    meta: { requiresAuth: true, requiresAdmin: true, title: '商品管理' },
  },
  {
    path: '/admin/containers',
    name: 'AdminContainers',
    component: ContainerManage,
    meta: { requiresAuth: true, requiresAdmin: true, title: '裝櫃管理' },
  },

  // 【物流追蹤】
  {
    path: '/tracking/:id',
    name: 'Tracking',
    component: Tracking,
    meta: { requiresAuth: true, title: '物流追蹤' },
  },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/mall' },
]

// ============================================
// 創建路由實例
// ============================================
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

// ============================================
// 推薦碼存儲 Key
// ============================================
const REF_CODE_KEY = '3links_ref_code'
const REF_CODE_EXPIRY_KEY = '3links_ref_code_expiry'
const REF_CODE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 天有效期

// ============================================
// 獲取存儲的推薦碼
// ============================================
export function getStoredRefCode(): string | null {
  const code = localStorage.getItem(REF_CODE_KEY)
  const expiry = localStorage.getItem(REF_CODE_EXPIRY_KEY)
  
  if (!code || !expiry) return null
  
  // 檢查是否過期
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem(REF_CODE_KEY)
    localStorage.removeItem(REF_CODE_EXPIRY_KEY)
    return null
  }
  
  return code
}

// ============================================
// 路由守衛
// ============================================
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 初始化認證狀態
  if (!authStore.initialized) {
    authStore.initAuth()
  }

  // ============================================
  // 【關鍵】監聽推薦碼參數
  // ============================================
  const refCode = to.query.ref as string
  if (refCode) {
    // 存入 localStorage，設置 30 天有效期
    localStorage.setItem(REF_CODE_KEY, refCode.toUpperCase())
    localStorage.setItem(REF_CODE_EXPIRY_KEY, String(Date.now() + REF_CODE_TTL))
    console.log('[推薦系統] 已記錄推薦碼:', refCode)
    
    // 移除 URL 中的 ref 參數（美化 URL）
    if (Object.keys(to.query).length === 1) {
      return next({ path: to.path, replace: true })
    } else {
      const query = { ...to.query }
      delete query.ref
      return next({ path: to.path, query, replace: true })
    }
  }

  // 設置頁面標題
  if (to.meta.title) {
    document.title = `${to.meta.title} - 叁通速達`
  }

  // 認證檢查
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  // 管理員權限檢查
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'Dashboard' })
  }

  // 已登錄用戶不能訪問 guest 頁面
  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: 'Mall' })
  }

  next()
})

export default router
