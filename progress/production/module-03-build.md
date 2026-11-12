# Module 03 — BUILD Evidence: Environment Configuration System

## What Was Built

### 1. Config Validation Module (`src/config.ts`)
- Uses `zod` for schema-based startup validation
- Required vars: `NODE_ENV` (enum), `PORT` (number), `MONGODB_URI` (string), `JWT_SECRET` (min 32 chars)
- Optional with defaults: `CORS_ORIGIN`, `LOG_LEVEL`
- On failure: `process.exit(1)` with named field errors — no silent starts
- Startup log announces `environment`, `port`, `log_level` — secrets intentionally excluded

### 2. `.env.example` Template
- Documents every variable with REQUIRED/OPTIONAL annotation
- Example values provided for all fields
- Instructions to rotate if `.env` was ever committed

### 3. `main.ts` Updated
- `import { config } from './config'` is first import — validates before NestJS boots
- Removed raw `process.env.PORT` usage; replaced with `config.PORT`

## Failure-First Drill Results

### Test 1: Missing `MONGODB_URI` (run from /tmp — no .env available)
```
❌ Invalid environment configuration — service cannot start:
{
  _errors: [],
  MONGODB_URI: { _errors: [ 'Invalid input: expected string, received undefined' ] }
}
```
**Result**: Service crashed immediately at startup. ✅

### Test 2: `NODE_ENV=banana` (invalid enum)
```
❌ Invalid environment configuration — service cannot start:
{
  _errors: [],
  NODE_ENV: {
    _errors: [
      'Invalid option: expected one of "development"|"staging"|"production"'
    ]
  }
}
```
**Result**: Service crashed immediately with allowed values listed. ✅

## Docker Image Clean Check
- `.dockerignore` contains `.env*` glob — excludes all env files
- `docker run --rm api-envtest ls -la` — no `.env` found in image ✅
- Image rebuilt to sha256:3dfd154... confirming latest config excluded

## Security Properties
- Secrets (`MONGODB_URI`, `JWT_SECRET`) never appear in startup logs
- `.env` excluded from git (`.gitignore`) and Docker image (`.dockerignore`)
- `.env.example` committed as onboarding contract — no real values

