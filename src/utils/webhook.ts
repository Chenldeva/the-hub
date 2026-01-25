import crypto from 'crypto';
import { logger } from './logger';

/**
 * 验证 ShipStation webhook 的 HMAC-SHA256 签名
 */
export function verifyShipStationWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 使用 timing-safe comparison 防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * 验证通用 HMAC-SHA256 webhook 签名
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // 确保两个 Buffer 长度相同
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
      algorithm,
    });
    return false;
  }
}
