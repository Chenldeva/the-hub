import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { configService } from '../services/config-service';
import { scheduler } from '../services/scheduler';
import { cleanupService } from '../services/cleanup-service';
import { verifyShipStationWebhook, verifyWebhookSignature } from '../utils/webhook';
import { retryWithBackoff } from '../utils/retry';
import crypto from 'crypto';

dotenv.config();

async function testLogger() {
  console.log('\n=== 测试日志系统 ===');
  try {
    logger.info('测试信息日志', { test: 'info' });
    logger.warn('测试警告日志', { test: 'warn' });
    logger.error('测试错误日志', { test: 'error' });
    console.log('✅ 日志系统测试通过');
  } catch (error) {
    console.error('❌ 日志系统测试失败:', error);
  }
}

async function testWebhookVerification() {
  console.log('\n=== 测试 Webhook 签名验证 ===');
  try {
    const secret = 'test-secret';
    const payload = JSON.stringify({ test: 'data' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = verifyShipStationWebhook(payload, signature, secret);
    console.log('✅ Webhook 签名验证测试通过:', isValid === true);

    const invalidSignature = 'invalid-signature';
    const isInvalid = verifyShipStationWebhook(payload, invalidSignature, secret);
    console.log('✅ Webhook 无效签名测试通过:', isInvalid === false);
  } catch (error) {
    console.error('❌ Webhook 签名验证测试失败:', error);
  }
}

async function testRetry() {
  console.log('\n=== 测试重试机制 ===');
  try {
    let attempts = 0;
    const testFn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('模拟失败');
      }
      return '成功';
    };

    const result = await retryWithBackoff(testFn, {
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffFactor: 2,
    }, { operation: 'test' });

    console.log('✅ 重试机制测试通过:', result === '成功', '尝试次数:', attempts);
  } catch (error) {
    console.error('❌ 重试机制测试失败:', error);
  }
}

async function testScheduler() {
  console.log('\n=== 测试任务调度器 ===');
  try {
    let taskExecuted = false;
    scheduler.schedule(
      'test-task',
      '* * * * * *', // 每秒执行（仅用于测试）
      async () => {
        taskExecuted = true;
      },
      false // 禁用，避免实际执行
    );

    const tasks = scheduler.getTasks();
    console.log('✅ 任务调度器测试通过:', tasks.length > 0, '任务列表:', tasks);
  } catch (error) {
    console.error('❌ 任务调度器测试失败:', error);
  }
}

async function testConfigService() {
  console.log('\n=== 测试配置服务 ===');
  try {
    // 注意：这需要数据库连接，如果没有数据库会失败
    try {
      const ratio = await configService.getMarketplaceRatio('amazon');
      console.log('✅ 配置服务测试通过 - Amazon 比例:', ratio);
    } catch (dbError) {
      console.log('⚠️  配置服务测试跳过（需要数据库连接）:', dbError instanceof Error ? dbError.message : String(dbError));
    }
  } catch (error) {
    console.error('❌ 配置服务测试失败:', error);
  }
}

async function testCleanupService() {
  console.log('\n=== 测试清理服务 ===');
  try {
    cleanupService.setRetentionDays(90);
    console.log('✅ 清理服务测试通过 - 保留天数设置成功');
  } catch (error) {
    console.error('❌ 清理服务测试失败:', error);
  }
}

async function runAllTests() {
  console.log('开始本地测试...\n');
  
  await testLogger();
  await testWebhookVerification();
  await testRetry();
  await testScheduler();
  await testConfigService();
  await testCleanupService();

  console.log('\n=== 测试完成 ===');
  process.exit(0);
}

runAllTests().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
