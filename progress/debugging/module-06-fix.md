# Module 06 Fix: Namespace Isolation for Cache & Queue Deduplication

## Root Cause Analysis
The regression reported by the analytics team was caused by **shared namespace collision** in Redis:
1. The redirect cache stored target URLs under `link:redirect:<short_code>`.
2. The queue worker's deduplication check reused this exact key space (`link:redirect:<short_code>`) rather than maintaining its own independent deduplication key space.
3. When the Bug #9 fix ran `DEL link:redirect:<short_code>` upon link deletion, it correctly invalidated the redirect cache, but as an unintended side-effect, destroyed the deduplication history for that short code.
4. When a user re-created a link with the same short code, new incoming click jobs checked `link:redirect:<short_code>`, found no key, concluded the job had never been seen before, and processed it again, producing duplicate analytics records.

---

## The Solution: Strict Key Namespace Segregation

We segregated the Redis key patterns into strictly isolated domain namespaces:

1. **Redirect Caching Domain**:
   - Key pattern: `link:redirect:<short_code>`
   - TTL: 300 seconds (5 minutes)
   - Scope: Read by `RedirectController`, updated on link creation/cache miss, invalidated ONLY by `LinksService.delete()` / `LinksService.update()`.

2. **Analytics Deduplication Domain**:
   - Key pattern: `analytics:dedup:<job_id>`
   - TTL: 86400 seconds (24 hours)
   - Scope: Checked and set exclusively by `AnalyticsQueueService` background worker. Invalidation of redirect keys has zero effect on job deduplication state.

```typescript
// Redirect Cache Namespace
async getRedirectTarget(code: string): Promise<string | null> {
  return await this.client.get(`link:redirect:${code}`);
}
async invalidateRedirectTarget(code: string): Promise<void> {
  await this.client.del(`link:redirect:${code}`);
}

// Analytics Deduplication Namespace
async isAnalyticsJobProcessed(jobId: string): Promise<boolean> {
  const exists = await this.client.exists(`analytics:dedup:${jobId}`);
  return exists === 1;
}
async markAnalyticsJobProcessed(jobId: string): Promise<void> {
  await this.client.set(`analytics:dedup:${jobId}`, '1', 'EX', 86400);
}
```

---

## Verification
1. **Redirect Invalidation Check**:
   - Delete link `abc`.
   - `GET /r/abc` immediately returns HTTP 404 (Bug #9 fix intact).
2. **Recreation Deduplication Check**:
   - Re-create link with short code `abc`.
   - Dispatch multiple click jobs for the same request.
   - First job executes successfully and sets `analytics:dedup:<request_id>`.
   - Subsequent duplicate jobs encounter `isAnalyticsJobProcessed(jobId) === true` and skip redundant writes.
   - Result: Exactly 1 click record persisted in MongoDB. Zero double-counting.

