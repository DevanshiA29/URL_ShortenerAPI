import CircuitBreaker from 'opossum';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: number;
  retryableErrors?: string[];
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 2000,
    jitter = 50,
    retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'MongooseServerSelectionError',
      'MongoNetworkError',
      'MongoServerSelectionError',
    ],
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const errorCode = error?.code || error?.name;
      const isRetryable =
        retryableErrors.includes(errorCode) ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNREFUSED');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitterOffset = Math.floor(Math.random() * jitter * 2) - jitter;
      const delay = Math.max(0, exponentialDelay + jitterOffset);

      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'retry_attempt',
          service_name: 'url-shortener',
          attempt: attempt + 1,
          max_retries: maxRetries,
          delay_ms: delay,
          error_code: errorCode,
          error_message: error?.message,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export interface BreakerConfig {
  name: string;
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
  fallback?: (args: any, error: any) => any;
}

export function createResilientCircuitBreaker<T>(
  action: (...args: any[]) => Promise<T>,
  config: BreakerConfig,
): CircuitBreaker {
  const breaker = new CircuitBreaker(action, {
    timeout: config.timeout ?? 1000,
    errorThresholdPercentage: config.errorThresholdPercentage ?? 50,
    resetTimeout: config.resetTimeout ?? 10000,
    volumeThreshold: config.volumeThreshold ?? 3,
  });

  breaker.on('open', () => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'circuit_opened',
        service_name: 'url-shortener',
        dependency: config.name,
      }),
    );
  });

  breaker.on('halfOpen', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'circuit_half_open',
        service_name: 'url-shortener',
        dependency: config.name,
      }),
    );
  });

  breaker.on('close', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'circuit_closed',
        service_name: 'url-shortener',
        dependency: config.name,
      }),
    );
  });

  breaker.on('timeout', () => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        event: 'dependency_timeout',
        service_name: 'url-shortener',
        dependency: config.name,
        timeout_ms: config.timeout ?? 1000,
      }),
    );
  });

  if (config.fallback) {
    breaker.fallback(config.fallback);
  }

  return breaker;
}

