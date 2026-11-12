# Module 05: Incident Response & Severity Classification Context

## Micro-Exercise Severity Classifications:
1. **Broken Product Images on Homepage**:
   - Classification: **SEV2** (for customer-facing e-commerce / conversion funnel; customers cannot evaluate goods, severe revenue impact) or **SEV3** (for internal/back-office applications).
2. **Horizontal IDOR / Cross-Tenant Private Data Leak**:
   - Classification: **SEV1** (Active data breach and confidentiality compromise; immediate regulatory, legal, and privacy exposure; requires all-hands mitigation, paging, and external disclosure readiness).
3. **Delayed Weekly Analytics Reporting Job (2 hours)**:
   - Classification: **SEV3** (Non-destructive, asynchronous batch job; reports are delayed but not corrupted or permanently lost; can be monitored and reconciled during normal business hours).

## Core Triaging Principles:
- **Triage before Action**: Five minutes classifying blast radius prevents a panic-pushed fix from transforming a contained SEV3 into an all-system SEV1 outage.
- **Audience-Appropriate Communication**: Separate engineering diagnostic cadence from executive/customer blast-radius status updates.
