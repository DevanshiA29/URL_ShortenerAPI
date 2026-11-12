import {
  createResilientCircuitBreaker,
  retryWithBackoff,
} from '../src/common/resilience/resilience';

async function runDrill() {
  console.log('=== Step 1: Testing retryWithBackoff with transient errors and jitter ===');
  let attempts = 0;
  try {
    await retryWithBackoff(
      async () => {
        attempts++;
        const err: any = new Error('Connection reset');
        err.code = 'ECONNRESET';
        throw err;
      },
      { maxRetries: 2, baseDelay: 50, jitter: 10 },
    );
  } catch (err: any) {
    console.log(`Retry test concluded as expected after ${attempts} attempts: ${err.message}`);
  }

  console.log('\n=== Step 2: Testing Circuit Breaker failure, trip, fallback, and recovery ===');
  let isDown = true;
  let callCount = 0;

  const breaker = createResilientCircuitBreaker(
    async (id: string) => {
      callCount++;
      if (isDown) {
        const err: any = new Error('Database unreachable ECONNREFUSED');
        err.code = 'ECONNREFUSED';
        throw err;
      }
      return { id, status: 'ok', data: 'success' };
    },
    {
      name: 'database',
      timeout: 300,
      errorThresholdPercentage: 50,
      resetTimeout: 1000,
      volumeThreshold: 3,
    },
  );

  breaker.fallback((id: string) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        event: 'circuit_open_fallback',
        dependency: 'database',
        id,
      }),
    );
    return { id, status: 'degraded', fallback: true };
  });

  console.log('Sending initial failing calls to trip circuit breaker...');
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    try {
      const res = await breaker.fire(`req-${i}`);
      console.log(`Call ${i} (elapsed: ${Date.now() - start}ms) => ${JSON.stringify(res)}`);
    } catch (err: any) {
      console.log(`Call ${i} (elapsed: ${Date.now() - start}ms) failed with error: ${err.message}`);
    }
  }

  console.log(`\nCircuit breaker state: opened=${breaker.opened}`);
  console.log('Sending requests while circuit is OPEN (verifying fast fallback under 10ms)...');
  for (let i = 6; i <= 8; i++) {
    const start = Date.now();
    const res = await breaker.fire(`req-${i}`);
    console.log(`Call ${i} (elapsed: ${Date.now() - start}ms) => ${JSON.stringify(res)}`);
  }

  console.log('\nRestoring dependency health and waiting for resetTimeout (1000ms)...');
  isDown = false;
  await new Promise((r) => setTimeout(r, 1100));

  console.log('Sending call in HALF-OPEN state to close circuit...');
  const recoverRes = await breaker.fire('req-recovery');
  console.log(`Recovery call => ${JSON.stringify(recoverRes)}`);
  console.log(`Circuit breaker state: closed=${!breaker.opened}`);
  console.log('\n=== Drill completed successfully ===');
}

runDrill().catch((err) => {
  console.error('Drill failed:', err);
  process.exit(1);
});

