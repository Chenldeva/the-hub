import { Router, Request, Response } from 'express';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { scheduler } from '../services/scheduler';

const router = Router();

// 监控指标（Prometheus 格式或 JSON）
const metrics: {
  apiCalls: { [key: string]: { total: number; success: number; failed: number } };
  taskExecutions: { [key: string]: { total: number; success: number; failed: number } };
  dbStatus: 'healthy' | 'unhealthy';
  lastCheck: Date;
} = {
  apiCalls: {},
  taskExecutions: {},
  dbStatus: 'healthy',
  lastCheck: new Date(),
};

/**
 * 健康检查端点
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 检查数据库连接
    const db = getDb();
    await db.raw('SELECT 1');
    metrics.dbStatus = 'healthy';

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        scheduler: scheduler.getTasks().length > 0 ? 'running' : 'stopped',
      },
    };

    res.status(200).json(health);
  } catch (error) {
    metrics.dbStatus = 'unhealthy';
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * 监控指标端点（Prometheus 格式）
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.raw('SELECT 1');

    const dbStatus = metrics.dbStatus === 'healthy' ? 0 : 1;
    const schedulerStatus = scheduler.getTasks().length > 0 ? 0 : 1;

    // Prometheus 格式指标
    const prometheusMetrics = [
      `# HELP hub_health_status Health status of the hub (0=healthy, 1=unhealthy)`,
      `# TYPE hub_health_status gauge`,
      `hub_health_status ${dbStatus === 0 && schedulerStatus === 0 ? 0 : 1}`,
      ``,
      `# HELP db_connection_status Database connection status (0=healthy, 1=unhealthy)`,
      `# TYPE db_connection_status gauge`,
      `db_connection_status ${dbStatus}`,
      ``,
      `# HELP task_scheduler_status Task scheduler status (0=running, 1=stopped)`,
      `# TYPE task_scheduler_status gauge`,
      `task_scheduler_status ${schedulerStatus}`,
    ];

    // 添加 API 调用指标
    for (const [connector, stats] of Object.entries(metrics.apiCalls)) {
      prometheusMetrics.push(
        `# HELP api_call_total Total API calls by connector and status`,
        `# TYPE api_call_total counter`,
        `api_call_total{connector="${connector}",status="success"} ${stats.success}`,
        `api_call_total{connector="${connector}",status="failed"} ${stats.failed}`,
        ``
      );
    }

    res.set('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics.join('\n'));
  } catch (error) {
    logger.error('Metrics endpoint failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 监控指标端点（JSON 格式）
 */
router.get('/metrics/json', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.raw('SELECT 1');

    const dbStatus = metrics.dbStatus === 'healthy' ? 0 : 1;
    const schedulerStatus = scheduler.getTasks().length > 0 ? 0 : 1;

    const jsonMetrics = {
      hub_health_status: dbStatus === 0 && schedulerStatus === 0 ? 0 : 1,
      db_connection_status: dbStatus,
      task_scheduler_status: schedulerStatus,
      api_calls: metrics.apiCalls,
      task_executions: metrics.taskExecutions,
      last_check: metrics.lastCheck.toISOString(),
    };

    res.status(200).json(jsonMetrics);
  } catch (error) {
    logger.error('Metrics endpoint failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 记录 API 调用指标（供其他模块使用）
 */
export function recordApiCall(connector: string, success: boolean): void {
  if (!metrics.apiCalls[connector]) {
    metrics.apiCalls[connector] = { total: 0, success: 0, failed: 0 };
  }
  metrics.apiCalls[connector].total++;
  if (success) {
    metrics.apiCalls[connector].success++;
  } else {
    metrics.apiCalls[connector].failed++;
  }
}

/**
 * 记录任务执行指标（供其他模块使用）
 */
export function recordTaskExecution(taskName: string, success: boolean): void {
  if (!metrics.taskExecutions[taskName]) {
    metrics.taskExecutions[taskName] = { total: 0, success: 0, failed: 0 };
  }
  metrics.taskExecutions[taskName].total++;
  if (success) {
    metrics.taskExecutions[taskName].success++;
  } else {
    metrics.taskExecutions[taskName].failed++;
  }
}

export default router;
