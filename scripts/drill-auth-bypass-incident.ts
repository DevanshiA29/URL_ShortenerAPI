import * as crypto from 'crypto';

const JWT_SECRET = 'incident-drill-jwt-secret-key-32chars';

function verifyToken(token: string, secret: string): { sub: string; role: string } {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Malformed token structure');
  }
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  if (signatureB64 !== expectedSig) {
    throw new Error('Invalid token signature');
  }
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
}

function createToken(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

// Vulnerable Middleware
function vulnerableAuthMiddleware(req: { headers: { authorization?: string }; user?: any }): { status: number; error?: string } {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { status: 401, error: 'Authorization required' };
  }
  const parts = authHeader.split(' ');
  const token = parts[1];
  try {
    if (token === undefined) {
      req.user = { role: 'admin', bypass: true };
      return { status: 200 };
    }
    const decoded = verifyToken(token, JWT_SECRET);
    req.user = decoded;
    return { status: 200 };
  } catch (err: any) {
    return { status: 401, error: 'Invalid token' };
  }
}

// Hardened Middleware (Defense in depth)
function hardenedAuthMiddleware(req: { headers: { authorization?: string }; user?: any }): { status: number; error?: string } {
  const authHeader = req.headers.authorization;

  // 1. Ensure string exists and has non-whitespace content
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.trim()) {
    return { status: 401, error: 'Authorization required' };
  }

  // 2. Validate format: exactly 2 tokens starting with 'Bearer'
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { status: 401, error: 'Invalid authorization format' };
  }

  // 3. Extract and validate token string
  const token = parts[1];
  if (!token || token.trim().length === 0) {
    return { status: 401, error: 'Token missing' };
  }

  // 4. Verify cryptographic signature
  try {
    const decoded = verifyToken(token, JWT_SECRET);
    req.user = decoded;
    return { status: 200 };
  } catch (err: any) {
    return { status: 401, error: 'Invalid token' };
  }
}

async function runIncidentDrill() {
  console.log('=== PHASE 1 & 3: SIMULATING AUTH BYPASS EXPLOITATION ===');
  const exploitRes = vulnerableAuthMiddleware({ headers: { authorization: 'Bearer' } });
  console.log(`[EXPLOIT ATTEMPT] Header: 'Authorization: Bearer' -> Status: ${exploitRes.status} (Bypass Succeeded!)`);

  console.log('\n=== PHASE 5: VERIFYING HARDENED AUTH MIDDLEWARE (5 BOUNDARY TESTS) ===');
  const validToken = createToken({ sub: 'admin-1', role: 'admin' }, JWT_SECRET);

  const testCases = [
    { name: '1. Empty string authorization', header: '', expected: 401 },
    { name: '2. Whitespace-only authorization', header: '   ', expected: 401 },
    { name: '3. Bearer without token', header: 'Bearer', expected: 401 },
    { name: '4. Valid Bearer token', header: `Bearer ${validToken}`, expected: 200 },
    { name: '5. Missing authorization header', header: undefined, expected: 401 },
  ];

  let allPassed = true;
  for (const tc of testCases) {
    const req = { headers: { authorization: tc.header }, user: undefined };
    const res = hardenedAuthMiddleware(req);
    const passed = res.status === tc.expected;
    if (!passed) allPassed = false;
    console.log(`Test: ${tc.name} -> Status: ${res.status} [Expected ${tc.expected}] ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  }

  if (allPassed) {
    console.log('\n[SUCCESS] All 5 auth boundary conditions verified. Patch ready for production deployment.');
  } else {
    throw new Error('Boundary verification failed!');
  }
}

runIncidentDrill().catch(console.error);
