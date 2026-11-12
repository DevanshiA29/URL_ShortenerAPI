# Module 06 Context: Documentation & Runbook Hygiene

## Micro-Exercise: The Truth About Documentation Rot

### 1. The New Hire / Vacation Test
In most engineering organizations, a new hire cannot set up the project locally on Day 1 using only the README. Common points of failure include:
- **Implicit Environment Assumptions**: Hidden prerequisites (e.g. Node 22 vs 18, Docker daemon running, global pnpm installation) that existing engineers take for granted.
- **Missing Configuration Blueprints**: A `.env` file that requires secrets or connection strings without an up-to-date `.env.example` explaining expected shapes.
- **Untracked Seed Data**: Missing instructions for database initialization, migrations, or local seeding, leaving the API returning 500s on empty collections.

### 2. When Was It Last Verified?
READMEs and runbooks typically rot within 60–90 days because documentation is decoupled from the build pipeline. The moment an engineer changes a port, introduces a mandatory environment variable, or upgrades a backup tool (like GitLab switching from pg_dump to LVM snapshots in 2017), the documentation becomes actively dangerous.

**The Production Rule**:
> Documentation is only as reliable as its last automated test. Just as unit tests protect code, automated CI smoke tests (e.g., executing the exact README bootstrap commands on a clean, empty runner container) are required to keep documentation living and verified.

