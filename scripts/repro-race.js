// scripts/repro-race.js
// Minimal reproduction: concurrent redirects on a single short link triggering check-then-act race condition
const http = require('http');

const SHORT_CODE = 'test-link';
const CONCURRENCY = 10;
const BASE_URL = `http://localhost:3000/${SHORT_CODE}`;

async function makeRequest() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', (err) => {
      resolve(500);
    });
  });
}

async function runTest() {
  const requests = Array.from({ length: CONCURRENCY }, () => makeRequest());
  const results = await Promise.all(requests);

  const successes = results.filter(code => code === 301 || code === 302 || code === 200);
  const errors = results.filter(code => code === 500);

  console.log(`Results: ${successes.length} redirects, ${errors.length} errors`);
  return { successes: successes.length, errors: errors.length };
}

if (require.main === module) {
  runTest();
}

module.exports = { runTest };

