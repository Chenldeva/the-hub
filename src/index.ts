import express, { Express, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';
import { getDb, closeDb } from './config/database';
import { scheduler } from './services/scheduler';
import { cleanupService } from './services/cleanup-service';
import { webhookBodyParser } from './middleware/raw-body';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';

// 加载环境变量
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// 请求日志中间件（在所有路由之前）
app.use((req: Request, res: Response, next) => {
  logger.info('HTTP request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// 路由
// Webhook 路由使用特殊的 body parser 以保存原始请求体用于签名验证
// 注意：webhookBodyParser() 内部使用 express.raw()，会跳过全局的 express.json()
app.use('/webhooks', webhookBodyParser(), webhookRoutes);

// 非 webhook 路由使用标准的 JSON 解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 其他路由
app.use('/health', healthRoutes);

// 根路径
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'the-hub',
    version: '1.0.0',
    status: 'running',
  });
});

// 初始化数据库连接
async function initializeDatabase(): Promise<void> {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// 初始化任务调度器
function initializeScheduler(): void {
  // 数据清理任务：每天凌晨 2 点执行
  scheduler.schedule(
    'data-cleanup',
    '0 2 * * *',
    async () => {
      await cleanupService.cleanupOldData();
    },
    true
  );

  // TODO: M1 时添加订单拉取任务
  // scheduler.schedule('order-pull-amazon', '*/10 * * * *', async () => {
  //   await orderOrchestrator.pullOrders('amazon');
  // });

  // TODO: M1 时添加 tracking 兜底轮询任务
  // scheduler.schedule('tracking-poll', '*/5 * * * *', async () => {
  //   await trackingOrchestrator.pollShipStation();
  // });

  scheduler.start();
  logger.info('Task scheduler initialized');
}

// 优雅关闭
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  scheduler.stop();
  logger.info('Task scheduler stopped');

  await closeDb();
  logger.info('Database connection closed');

  process.exit(0);
}

// 启动服务器
async function startServer(): Promise<void> {
  try {
    // 初始化数据库
    await initializeDatabase();

    // 初始化任务调度器
    initializeScheduler();

    // 启动 HTTP 服务器
    app.listen(port, () => {
      logger.info('Server started', {
        port,
        environment: process.env.NODE_ENV || 'development',
        webhookBaseUrl: process.env.WEBHOOK_BASE_URL || `http://localhost:${port}/webhooks`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// 处理关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
startServer();
