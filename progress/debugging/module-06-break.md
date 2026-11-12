# Module 06 Break Analysis: Duplicate Analytics Events Post-Invalidation

## Problem Statement
Following the deployment of the cache invalidation fix for Bug #9, the analytics team reported duplicate analytics events: every time a link is deleted and subsequently re-created with the identical short code, analytics jobs process twice, doubling click counts for re-created links.

---

## Hypotheses

### Hypothesis 1: Shared Redis Namespace & Over-Eager Pattern Deletion
If the cache invalidation logic executed a wildcard pattern deletion or flushed keys matching the short code (e.g. `del *{code}*`), it inadvertently deleted BullMQ's deduplication set (`bull:analytics-clicks:id:*` or idempotency keys) stored on the same Redis instance. Without BullMQ's job deduplication state in Redis, duplicate click events that were previously suppressed are allowed to enqueue and execute a second time.

### Hypothesis 2: Dual Telemetry Dispatch on Cache Miss vs Cache Hit
In `RedirectController`, when a cache HIT occurs, telemetry is dispatched asynchronously once:
```typescript
if (longUrl) {
  this.linksService.findByCode(code).then(link => this.enqueueTelemetry(...));
  return res.redirect(302, longUrl);
}
```
When a cache MISS occurs, telemetry is dispatched at line 57:
```typescript
this.enqueueTelemetry(link._id.toString(), code, requestId, req);
```
If link recreation triggers concurrent requests right as the cache is invalidated, both branches or a race between cache repopulation and the fallback path causes dual invocation of `enqueueTelemetry`.

### Hypothesis 3: Idempotency Key Tied to Short Code Instead of Unique Event UUID
If the analytics deduplication mechanism used `link.code` instead of a persistent immutable event ID (`request_id` or `uuid`), re-creating a link under the same short code causes the worker to treat previous historical jobs as belonging to the new link or vice-versa, breaking idempotent upserts in MongoDB.

