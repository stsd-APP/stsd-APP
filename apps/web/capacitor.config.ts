// ============================================
// Capacitor 配置 - iOS/Android APP 打包
// ============================================
// 用法：
// 1. pnpm build (先構建前端)
// 2. npx cap sync (同步到原生項目)
// 3. npx cap open ios / npx cap open android

import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // APP ID (唯一標識)
  appId: 'com.3links.app',
  
  // APP 名稱
  appName: '叁通速達',
  
  // 前端構建目錄
  webDir: 'dist',
  
  // 開發服務器配置 (調試用)
  server: {
    // 開發模式下使用本地服務
    // url: 'http://192.168.1.100:5173',
    // cleartext: true,
    
    // 生產模式使用打包後的靜態文件
    androidScheme: 'https',
  },
  
  // iOS 配置
  ios: {
    // 狀態欄樣式
    contentInset: 'automatic',
    // 允許滾動
    allowsLinkPreview: true,
    // 背景色
    backgroundColor: '#ffffff',
  },
  
  // Android 配置
  android: {
    // 允許混合內容
    allowMixedContent: true,
    // 背景色
    backgroundColor: '#ffffff',
  },
  
  // 插件配置
  plugins: {
    // 啟動畫面
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ee0a24',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    
    // 狀態欄
    StatusBar: {
      style: 'light',
      backgroundColor: '#ee0a24',
    },
    
    // 鍵盤
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
