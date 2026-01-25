import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { Knex } from 'knex';

export class CleanupService {
  private db: Knex;
  private retentionDays: number = 90;

  constructor() {
    this.db = getDb();
  }

  /**
   * 设置数据保留天数
   */
  setRetentionDays(days: number): void {
    this.retentionDays = days;
  }

  /**
   * 清理超过保留期的数据
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    logger.info('Starting data cleanup', {
      retentionDays: this.retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    try {
      // 清理任务执行记录（保留90天）
      const taskExecutionsDeleted = await this.db('task_executions')
        .where('created_at', '<', cutoffDate)
        .delete();

      logger.info('Task executions cleaned up', {
        deleted: taskExecutionsDeleted,
        cutoffDate: cutoffDate.toISOString(),
      });

      // 注意：其他表（order_mappings, tracking_returns, inventory_publications）
      // 可能需要更长的保留期或永久保留，根据业务需求调整
      // 这里只清理 task_executions 作为示例

      logger.info('Data cleanup completed', {
        retentionDays: this.retentionDays,
        taskExecutionsDeleted,
      });
    } catch (error) {
      logger.error('Data cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
        retentionDays: this.retentionDays,
      });
      throw error;
    }
  }

  /**
   * 清理特定表的旧数据
   */
  async cleanupTable(tableName: string, dateColumn: string = 'created_at'): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    try {
      const deleted = await this.db(tableName)
        .where(dateColumn, '<', cutoffDate)
        .delete();

      logger.info('Table cleaned up', {
        table: tableName,
        dateColumn,
        deleted,
        cutoffDate: cutoffDate.toISOString(),
      });

      return deleted;
    } catch (error) {
      logger.error('Table cleanup failed', {
        table: tableName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const cleanupService = new CleanupService();
