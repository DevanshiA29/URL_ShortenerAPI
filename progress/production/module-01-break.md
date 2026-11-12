# Module 01 BREAK: Root Cause Analysis of Slow Builds & Leaked Secrets

## 1. Symptom 1: Full Dependency Reinstall on Minor Source Edits
- **Observed Behavior**: Editing a trivial comment or source file triggers a complete `npm ci` dependency reinstall, slowing build velocity from seconds to minutes.
- **Root Cause**: **Broken Docker Layer Caching Hierarchy**.
  - If a generic `COPY . .` instruction is executed before `RUN npm ci`, any source modification alters the checksum of that layer.
  - Docker's layer cache operates hierarchically: invalidating an upstream layer automatically invalidates all subsequent downstream layers, forcing `npm ci` to re-execute every build.
- **Correct Pattern**:
  ```dockerfile
  # Cache dependencies separately based solely on package manifests
  COPY package*.json ./
  RUN npm ci --omit=dev
  # Only copy application source code after dependency installation
  COPY dist ./dist
  ```

## 2. Symptom 2: Sensitive Configuration Files Leaking into the Image
- **Observed Behavior**: Container image filesystem contains `.env`, `.git` repositories, or secret credentials.
- **Root Cause**: **Missing or Incomplete `.dockerignore` Specification**.
  - When `COPY . .` executes, Docker sends the entire directory context to the daemon unless explicitly excluded.
  - Without `.env`, `.git`, and test files in `.dockerignore`, secrets and private repository metadata are permanently embedded into immutable image layers, creating severe security vulnerabilities (CWE-200 / CWE-312).
- **Correct Pattern**:
  Enforce a strict `.dockerignore` containing:
  ```text
  .env*
  .git
  node_modules
  npm-debug.log
  .DS_Store
  test/
  coverage/
  ```

