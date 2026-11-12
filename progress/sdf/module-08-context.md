# Module 08 Context: Search, Pagination & Input Guardrails

## Micro-Exercise Responses:
1. **Maximum `page_size` Allowance & Rationale**:
   - Limit: Clamped strictly to `max_page_size = 100` (default: 20).
   - Rationale: Unbounded query pagination (`limit=1000000`) allows callers to force full-collection scans and trigger Node.js V8 heap out-of-memory crashes. Clamping to 100 ensures bounded database memory footprints and sub-50ms execution times.

2. **Allowlisted Input to Prevent Injection**:
   - `sort_by`: Strictly restricted via enum allowlist: `['created_at', 'click_count', 'updated_at']`.
   - `sort_order`: Strictly restricted to `['asc', 'desc']`.
   - Rationale: User-controlled sort parameters without allowlisting enable NoSQL injection or force unindexed in-memory sorts that exceed MongoDB's 32MB RAM sort limit (`Executor error during find command: Sort exceeded memory limit`).
