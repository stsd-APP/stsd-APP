// ============================================
// 郵件服務 - Email Service
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP 郵件服務已初始化');
    } else {
      this.logger.warn('未配置 SMTP，郵件服務將使用 Mock 模式');
    }
  }

  // ========================================
  // 發送郵件
  // ========================================
  async send(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.log(`[Mock] 發送郵件: ${options.to} - ${options.subject}`);
        return true;
      }

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`郵件已發送: ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`郵件發送失敗: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // 發送歡迎郵件
  // ========================================
  async sendWelcome(email: string, name: string): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #C0392B, #E74C3C); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 歡迎加入叁通速達</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>親愛的 <strong>${name}</strong>，</p>
          <p>感謝您註冊叁通速達！我們是專業的大件家具跨境物流平台。</p>
          <p>您現在可以：</p>
          <ul>
            <li>🛋️ 瀏覽精選家具商城</li>
            <li>📦 使用集運服務，省心省錢</li>
            <li>💰 申請成為代理，推薦賺佣金</li>
          </ul>
          <p style="text-align: center; margin-top: 30px;">
            <a href="https://3links.tw/mall" style="background: #C0392B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
              立即逛商城
            </a>
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>叁通速達 | 大件家具跨境物流專家</p>
        </div>
      </div>
    `;

    return this.send({
      to: email,
      subject: '🎉 歡迎加入叁通速達',
      html,
    });
  }

  // ========================================
  // 發送密碼重置郵件
  // ========================================
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `https://3links.tw/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #333; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 密碼重置</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>您好，</p>
          <p>我們收到了重置密碼的請求。如果這不是您本人操作，請忽略此郵件。</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #C0392B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
              重置密碼
            </a>
          </p>
          <p style="color: #999; font-size: 12px;">此連結 24 小時內有效。</p>
        </div>
      </div>
    `;

    return this.send({
      to: email,
      subject: '🔐 叁通速達 - 密碼重置',
      html,
    });
  }

  // ========================================
  // 發送訂單狀態變更郵件
  // ========================================
  async sendOrderStatusUpdate(
    email: string, 
    orderId: string, 
    status: string,
    statusText: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1989fa; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📦 訂單狀態更新</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>您好，</p>
          <p>您的訂單 <strong>#${orderId.slice(-8)}</strong> 狀態已更新：</p>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #1989fa;">${statusText}</span>
          </div>
          <p style="text-align: center;">
            <a href="https://3links.tw/orders" style="background: #333; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">
              查看訂單詳情
            </a>
          </p>
        </div>
      </div>
    `;

    return this.send({
      to: email,
      subject: `📦 訂單 #${orderId.slice(-8)} 狀態更新: ${statusText}`,
      html,
    });
  }
}
