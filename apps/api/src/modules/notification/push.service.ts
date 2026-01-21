// ============================================
// 推送服務 - Firebase FCM Push Service
// ============================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Firebase Admin 類型 (延遲導入避免未配置時報錯)
let firebaseAdmin: any = null;

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  async onModuleInit() {
    await this.initFirebase();
  }

  private async initFirebase() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      this.logger.warn('未配置 FIREBASE_SERVICE_ACCOUNT，推送服務將使用 Mock 模式');
      return;
    }

    try {
      firebaseAdmin = await import('firebase-admin');
      
      // 檢查是否已初始化
      if (firebaseAdmin.apps.length === 0) {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(JSON.parse(serviceAccount)),
        });
      }
      
      this.initialized = true;
      this.logger.log('Firebase FCM 推送服務已初始化');
    } catch (error) {
      this.logger.error(`Firebase 初始化失敗: ${error.message}`);
    }
  }

  // ========================================
  // 發送推送給單個設備
  // ========================================
  async sendToDevice(deviceToken: string, payload: PushPayload): Promise<boolean> {
    try {
      if (!this.initialized || !firebaseAdmin) {
        this.logger.log(`[Mock] 推送: ${deviceToken.slice(0, 20)}... - ${payload.title}`);
        return true;
      }

      const message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await firebaseAdmin.messaging().send(message);
      this.logger.log(`推送已發送: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`推送失敗: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // 發送推送給多個設備
  // ========================================
  async sendToDevices(deviceTokens: string[], payload: PushPayload): Promise<number> {
    if (deviceTokens.length === 0) return 0;

    try {
      if (!this.initialized || !firebaseAdmin) {
        this.logger.log(`[Mock] 批量推送: ${deviceTokens.length} 台設備 - ${payload.title}`);
        return deviceTokens.length;
      }

      const message = {
        tokens: deviceTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
      };

      const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
      this.logger.log(`批量推送: 成功 ${response.successCount}, 失敗 ${response.failureCount}`);
      return response.successCount;
    } catch (error) {
      this.logger.error(`批量推送失敗: ${error.message}`);
      return 0;
    }
  }

  // ========================================
  // 訂單狀態變更推送
  // ========================================
  async notifyOrderStatusChange(
    deviceToken: string,
    orderId: string,
    statusText: string,
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '📦 訂單狀態更新',
      body: `您的訂單 #${orderId.slice(-8)} ${statusText}`,
      data: {
        type: 'ORDER_STATUS',
        orderId,
      },
    });
  }

  // ========================================
  // 包裹入庫推送
  // ========================================
  async notifyPackageInbound(
    deviceToken: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '📬 包裹已入庫',
      body: `您的包裹 ${trackingNumber} 已到達我們的倉庫`,
      data: {
        type: 'PACKAGE_INBOUND',
        trackingNumber,
      },
    });
  }

  // ========================================
  // 包裹發貨推送
  // ========================================
  async notifyPackageShipped(
    deviceToken: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '🚚 包裹已發貨',
      body: `您的包裹 ${trackingNumber} 已發往台灣，預計 7-14 天到達`,
      data: {
        type: 'PACKAGE_SHIPPED',
        trackingNumber,
      },
    });
  }
}
