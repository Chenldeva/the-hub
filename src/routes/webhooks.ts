import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { verifyShipStationWebhook, verifyWebhookSignature } from '../utils/webhook';

const router = Router();

/**
 * ShipStation webhook 端点
 * 支持 HMAC-SHA256 签名验证
 * 使用原始请求体进行签名验证
 */
router.post('/shipstation', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-shipstation-signature'] as string;
    const secret = process.env.SHIPSTATION_WEBHOOK_SECRET;

    if (!secret) {
      logger.warn('ShipStation webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // 使用原始请求体进行签名验证
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    
    if (!req.rawBody) {
      logger.warn('Raw body not available, using parsed body for signature verification', {
        source: 'shipstation',
      });
    }

    if (signature) {
      const isValid = verifyShipStationWebhook(rawBody, signature, secret);
      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          source: 'shipstation',
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      logger.warn('Missing webhook signature', {
        source: 'shipstation',
      });
      // 根据配置决定是否要求签名
      // 这里暂时允许无签名（开发环境），生产环境应该要求签名
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
