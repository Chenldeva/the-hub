import * as dotenv from 'dotenv';
import { getDb, closeDb } from '../config/database';
import { logger } from '../utils/logger';

dotenv.config();

async function testDatabase() {
  try {
    logger.info('Testing database connection...');
    const db = getDb();
    
    // 测试连接
    await db.raw('SELECT 1');
    logger.info('Database connection successful');

    // 测试表是否存在
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    logger.info('Database tables:', {
      tables: tables.rows.map((r: any) => r.table_name),
    });

    // 测试配置表
    const configCount = await db('configs').count('* as count').first();
    logger.info('Config records:', { count: configCount?.count || 0 });

    await closeDb();
    logger.info('Database test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database test failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await closeDb();
    process.exit(1);
  }
}

testDatabase();
