import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { verifyShipStationWebhook, verifyWebhookSignature } from '../utils/webhook';

const router = Router();

/**
 * ShipStation webhook 验证端点（GET）
 * ShipStation 在保存 webhook 时可能会发送 GET 请求来验证端点
 */
router.get('/shipstation', (req: Request, res: Response) => {
  logger.info('ShipStation webhook verification request', {
    source: 'shipstation',
    method: 'GET',
  });
  res.status(200).json({ 
    status: 'ok', 
    message: 'ShipStation webhook endpoint is ready',
    endpoint: '/webhooks/shipstation',
  });
});

/**
 * ShipStation webhook 端点
 * 支持 HMAC-SHA256 签名验证
 * 使用原始请求体进行签名验证
 */
router.post('/shipstation', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-shipstation-signature'] as string;
    const secret = process.env.SHIPSTATION_WEBHOOK_SECRET;

    // 只有在有 signature 和 secret 时才进行签名验证
    // ShipStation 可能不发送签名，所以 secret 是可选的
    if (signature && secret) {
      // 使用原始请求体进行签名验证
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      
      if (!req.rawBody) {
        logger.warn('Raw body not available, using parsed body for signature verification', {
          source: 'shipstation',
        });
      }

      const isValid = verifyShipStationWebhook(rawBody, signature, secret);
      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          source: 'shipstation',
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
      logger.info('ShipStation webhook signature verified', {
        source: 'shipstation',
      });
    } else if (signature && !secret) {
      logger.warn('Webhook signature received but secret not configured, skipping verification', {
        source: 'shipstation',
      });
    } else if (!signature) {
      logger.info('ShipStation webhook received without signature (secret may not be configured in ShipStation)', {
        source: 'shipstation',
      });
    }

    logger.info('ShipStation webhook received', {
      source: 'shipstation',
      payload: req.body,
    });

    // TODO: M1 时实现具体的处理逻辑
    // 这里先返回成功响应
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', {
      source: 'shipstation',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Zoho Inventory webhook 端点
 */
router.post('/zoho', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-zoho-signature'] as string;
    const secret = process.env.ZOHO_WEBHOOK_SECRET;

    if (secret && signature) {
      // 使用原始请求体进行签名验证
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      
      if (!req.rawBody) {
        logger.warn('Raw body not available, using parsed body for signature verification', {
          source: 'zoho',
        });
      }
      
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          source: 'zoho',
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    logger.info('Zoho webhook received', {
      source: 'zoho',
      payload: req.body,
    });

    // TODO: M2 时实现具体的处理逻辑
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', {
      source: 'zoho',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 通用 webhook 端点（用于其他系统）
 */
router.post('/:source', async (req: Request, res: Response) => {
  try {
    const source = req.params.source;
    logger.info('Generic webhook received', {
      source,
      payload: req.body,
    });

    // TODO: 根据 source 实现具体的处理逻辑
    res.status(200).json({ received: true, source });
  } catch (error) {
    logger.error('Webhook processing failed', {
      source: req.params.source,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
