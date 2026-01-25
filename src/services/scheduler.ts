import cron from 'node-cron';
import { logger } from '../utils/logger';

export type TaskFunction = () => Promise<void>;

export interface ScheduledTask {
  name: string;
  schedule: string;
  task: TaskFunction;
  enabled: boolean;
}

export class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * 注册定时任务
   */
  schedule(name: string, schedule: string, task: TaskFunction, enabled: boolean = true): void {
    if (!enabled) {
      logger.info('Task disabled', { name, schedule });
      return;
    }

    // 验证 cron 表达式
    if (!cron.validate(schedule)) {
      logger.error('Invalid cron schedule', { name, schedule });
      throw new Error(`Invalid cron schedule for task: ${name}`);
    }

    const scheduledTask = cron.schedule(schedule, async () => {
      const startTime = Date.now();
      logger.info('Task started', { name, schedule });

      try {
        await task();
        const duration = Date.now() - startTime;
        logger.info('Task completed', { name, schedule, duration });
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Task failed', {
          name,
          schedule,
          duration,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.tasks.set(name, scheduledTask);
    logger.info('Task scheduled', { name, schedule });
  }

  /**
   * 取消任务
   */
  unschedule(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info('Task unscheduled', { name });
    }
  }

  /**
   * 启动所有任务
   */
  start(): void {
    logger.info('Task scheduler started', { taskCount: this.tasks.size });
  }

  /**
   * 停止所有任务
   */
  stop(): void {
    for (const [name, task] of this.tasks.entries()) {
      task.stop();
      logger.info('Task stopped', { name });
    }
    this.tasks.clear();
  }

  /**
   * 获取所有已注册的任务
   */
  getTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export const scheduler = new TaskScheduler();
