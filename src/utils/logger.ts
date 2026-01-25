import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  defaultMeta: { service: 'the-hub' },
  transports: [
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ],
});

// 敏感信息脱敏函数
function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'api_secret', 'refresh_token'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

// 导出脱敏函数供外部使用
export { sanitizeData };

// 注意：Winston 的类型定义比较复杂，直接覆盖方法会导致类型错误
// 建议在使用日志时手动调用 sanitizeData 对敏感数据进行脱敏
// 例如：logger.info('message', sanitizeData(meta))

export default logger;
