// ============================================
// S3 存儲服務 - 兼容 Cloudflare R2
// ============================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// @ts-ignore - Optional dependency
let getSignedUrl: any;
try {
  getSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
} catch {
  getSignedUrl = null;
}
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface FileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket: string = '';
  private publicUrl: string = '';
  private localMode = true;
  private localDir = 'uploads';

  onModuleInit() {
    this.initClient();
  }

  private initClient() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (endpoint && accessKeyId && secretAccessKey && bucket) {
      this.client = new S3Client({
        endpoint,
        region: process.env.S3_REGION || 'auto',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.bucket = bucket;
      this.publicUrl = publicUrl || endpoint;
      this.localMode = false;
      
      this.logger.log('S3 存儲服務已初始化 (雲端模式)');
    } else {
      this.logger.warn('未配置 S3 環境變量，使用本地存儲模式');
      this.ensureLocalDir();
    }
  }

  private ensureLocalDir() {
    const dir = path.join(process.cwd(), this.localDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`創建本地上傳目錄: ${dir}`);
    }
  }

  // ========================================
  // 生成文件 Key
  // ========================================
  private generateKey(originalname: string, folder: string = 'images'): string {
    const ext = path.extname(originalname).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    return `${folder}/${date}/${hash}${ext}`;
  }

  // ========================================
  // 上傳文件
  // ========================================
  async uploadFile(file: FileInput, folder: string = 'images'): Promise<UploadResult> {
    const key = this.generateKey(file.originalname, folder);

    try {
      if (this.localMode) {
        return this.uploadLocal(file.buffer, key);
      }
      return this.uploadToS3(file.buffer, key, file.mimetype);
    } catch (error) {
      this.logger.error(`上傳失敗: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // 上傳到 S3/R2
  // ========================================
  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
    if (!this.client) {
      return { success: false, error: 'S3 客戶端未初始化' };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 年緩存
    });

    await this.client.send(command);

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`文件已上傳到 S3: ${key}`);

    return { success: true, url, key };
  }

  // ========================================
  // 本地存儲 (Mock 模式)
  // ========================================
  private async uploadLocal(buffer: Buffer, key: string): Promise<UploadResult> {
    const filePath = path.join(process.cwd(), this.localDir, key);
    const dir = path.dirname(filePath);

    // 確保目錄存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${key}`;
    this.logger.log(`文件已保存到本地: ${filePath}`);

    return { success: true, url, key };
  }

  // ========================================
  // 刪除文件
  // ========================================
  async deleteFile(key: string): Promise<boolean> {
    try {
      if (this.localMode) {
        const filePath = path.join(process.cwd(), this.localDir, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`本地文件已刪除: ${key}`);
        }
        return true;
      }

      if (!this.client) return false;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.logger.log(`S3 文件已刪除: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`刪除文件失敗: ${error.message}`);
      return false;
    }
  }

  // ========================================
  // 生成預簽名 URL (用於大文件直傳)
  // ========================================
  async getPresignedUploadUrl(filename: string, contentType: string, folder: string = 'images'): Promise<{ url: string; key: string } | null> {
    if (this.localMode || !this.client) {
      this.logger.warn('本地模式不支持預簽名 URL');
      return null;
    }

    try {
      const key = this.generateKey(filename, folder);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

      return { url, key };
    } catch (error) {
      this.logger.error(`生成預簽名 URL 失敗: ${error.message}`);
      return null;
    }
  }

  // ========================================
  // 獲取文件 URL
  // ========================================
  getFileUrl(key: string): string {
    if (this.localMode) {
      return `/uploads/${key}`;
    }
    return `${this.publicUrl}/${key}`;
  }

  // ========================================
  // 檢查存儲模式
  // ========================================
  isCloudMode(): boolean {
    return !this.localMode;
  }
}
