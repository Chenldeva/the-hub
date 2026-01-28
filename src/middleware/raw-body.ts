import { Request, Response, NextFunction } from 'express';
import express from 'express';
import { logger } from '../utils/logger';

// 扩展 Request 类型以包含原始请求体和解析后的 body
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * 创建用于 webhook 路由的中间件
 * 使用 express.raw() 保存原始请求体，然后手动解析 JSON
 * GET 请求直接通过，不处理 body
 */
export function webhookBodyParser() {
  // 使用 express.raw() 保存原始请求体
  const rawParser = express.raw({ type: 'application/json' });
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // GET 请求没有 body，直接通过
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    
    rawParser(req, res, (err) => {
      if (err) {
        logger.error('Error parsing raw body', {
          error: err.message,
          path: req.path,
        });
        return next(err);
      }
      
      // 保存原始请求体
      if (req.body && Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
        
        // 手动解析 JSON
        try {
          req.body = JSON.parse(req.body.toString('utf8'));
        } catch (parseError) {
          logger.warn('Failed to parse JSON body', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            path: req.path,
          });
          req.body = {};
        }
      }
      
      next();
    });
  };
}
