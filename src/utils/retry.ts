import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 30000, // 30 秒
  maxDelay: 300000,    // 5 分钟
  backoffFactor: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: { operation: string; [key: string]: any }
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let delay = opts.initialDelay;
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxRetries) {
        logger.error('Retry exhausted', {
          ...context,
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          error: lastError.message,
        });
        throw lastError;
      }

      logger.warn('Retry attempt failed', {
        ...context,
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        nextRetryIn: delay,
        error: lastError.message,
      });

      await sleep(delay);
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError!;
}
