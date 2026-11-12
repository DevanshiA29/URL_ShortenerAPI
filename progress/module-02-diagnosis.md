# Module 02 Diagnosis Notes

## Bug 3: Log Level Misconfigured
- Symptom: Error responses (404s, 500s) appear in logs with zero preceding "request received" or "response sent" context.
- Hypothesis A: Logger framework is swallowing INFO logs due to an environment variable misconfiguration.
  - Command: `echo $LOG_LEVEL; grep LOG_LEVEL .env`
  - Observation: `LOG_LEVEL=info` was properly set in the environment.
- Hypothesis B: Logger initialization has a hardcoded configuration value overriding the runtime environment variable.
  - Command: Inspect logger setup in configuration code.
  - Observation: Found `const level = config.level || process.env.LOG_LEVEL || 'info'`, where `config.level` was hardcoded to `'warn'`.
- Fix: Removed hardcoded `'warn'` override so `process.env.LOG_LEVEL` takes precedence.
- Verification proof: Issued requests to `/links` and `/r/:code`; verified that structured logs now emit complete request lifecycle (`request received`, `db write`, `response sent 201/200/404`) with correlation IDs.

## Bug 4: Timestamp Timezone Mismatch
- Symptom: Short links created near midnight intermittently return 404 for several hours before functioning normally.
- Hypothesis A: Database cache expiration TTL has an off-by-one midnight rollover bug.
  - Command: Inspect Redis/memory cache eviction policies.
  - Observation: Cache TTL is static (60s); cache was not the root cause.
- Hypothesis B: Application creates links using UTC ISO strings (`...Z`), while database queries filter against server-local timezone (`EST -05:00`).
  - Command: Compare `created_at` in application logs (`2025-01-15T23:58:00.000Z`) against database row timestamp (`2025-01-15T18:58:00.000-05:00`).
  - Observation: Timezone mismatch caused `WHERE created_at > NOW()` date-boundary comparisons to fall into a 5-hour evaluation gap around midnight.
- Fix: Normalized all database schema columns to UTC (`TIMESTAMPTZ`), ensured application writes UTC timestamps, and standardized all SQL queries to evaluate against UTC (`CURRENT_TIMESTAMP AT TIME ZONE 'UTC'`).
- Verification proof: Created links near midnight boundary; verified that application and database timestamps match in UTC and redirect queries resolve immediately with 302/200.

## Bug 5: Log Injection Vulnerability (CWE-117)
- Symptom: Phantom "admin login successful" log appears embedded inside request `r-101` with request ID `r-102` and zero intake event.
- Hypothesis A: Background cron worker executes administrative heartbeat tasks concurrently during user requests.
  - Command: Check worker task schedules and request ID generation.
  - Observation: No administrative cron exists; `r-102` has no matching HTTP route or controller execution.
- Hypothesis B: Unsanitized user input in `url` field contains unescaped newline characters (`\n`), forging a synthetic JSON log record.
  - Command: Inspect raw payload of request `r-101`.
  - Observation: Verified the input contained `https://normal-url.com\n{"ts":"...","level":"info","req_id":"r-102","msg":"admin login successful"}`.
- Fix: Enforced strict input sanitization on all logged fields: stripped unescaped carriage returns and newlines (`[\r\n]`) and passed all fields through strict JSON serialization (`JSON.stringify`) to prevent log frame breakouts.
- Verification proof: Submitted forged payload containing newlines and JSON strings; verified the entire payload is escaped into a single string within the `url` property without creating synthetic log lines.
