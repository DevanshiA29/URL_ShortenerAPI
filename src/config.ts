import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load .env file — dotenv default: existing env vars take priority over .env values.
// This means Docker -e flags and CI secrets always win over any .env file present.
// IMPORTANT: .env must NEVER be baked into the Docker image (.dockerignore excludes .env*).
dotenv.config();

const envSchema = z.object({
  // REQUIRED — no defaults. Missing any of these causes immediate crash at startup.
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI must be a non-empty connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN must be set — no localhost default in production'),

  // OPTIONAL — safe defaults that do not mask misconfigurations.
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration — service cannot start:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

// Announce startup context — no secrets logged.
// Log shows environment name so operators can confirm the right config loaded.
// MONGODB_URI, JWT_SECRET are intentionally omitted to prevent secret leakage.
console.log(
  JSON.stringify({
    message: 'Service starting',
    environment: config.NODE_ENV,
    port: config.PORT,
    log_level: config.LOG_LEVEL,
    cors_origin: config.CORS_ORIGIN, // non-secret: safe to log the allowed origin
  }),
);
