# RFC: Distributed Rate Limiting for Public APIs

**Author:** Staff / Senior Software Engineer  
**Date:** November 2026  
**Status:** PROPOSED (Request for Comments)  
**Target Reviewers:** Platform Team, API Engineering, SRE / Infrastructure  

---

## 1. Problem Statement

Our public API currently lacks automated rate limiting. Over the last 30 days, this omission led to three critical business and operational failures:

1. **Service Degradation from Accidental Denial-of-Service**: An enterprise integration customer mistakenly ran an unthrottled load script that generated 50,000 requests per minute against our search endpoint, saturating backend database connections and elevating p99 latency from 45ms to 3,800ms for all tenants.
2. **Operational Fragility**: The on-call engineer had to manually block the abusive customer's API key at 2:00 AM by hardcoding an exclusion in application configuration and executing an emergency production deployment.
3. **Product Monetization Blocker**: The Product team cannot roll out the upcoming tiered subscription model (Free: 60 req/min, Pro: 600 req/min, Enterprise: 6,000 req/min) because we have no mechanism to meter or enforce request quotas.

**The Cost of Inaction**: Continued operation without rate limiting exposes us to cascading platform outages, high infrastructure egress costs, customer churn from noisy neighbors, and an inability to launch the paid API product line.

---

## 2. Proposed Approach

We propose implementing a **distributed Token Bucket rate limiter** utilizing our existing **Redis cluster**, enforced at the **API Gateway / Middleware layer**.

### 2.1 Architectural Flow

```
  Client Request (with API Key / Bearer Token)
                      │
                      ▼
            [ API Gateway / Middleware ]
                      │
                      ▼
         [ Check Token Bucket in Redis ]
               (Lua Script Execution)
             /                        \
    Tokens Available              Bucket Empty
           │                            │
           ▼                            ▼
  [ Decrement Bucket & ]        [ Return HTTP 429 ]
  [ Forward to Service ]        [ Headers: Retry-After, ]
                                [ X-RateLimit-Remaining ]
```

### 2.2 Algorithm & Storage Mechanics

- **Algorithm**: **Token Bucket**. Each client identifier (API Key or authenticated Account ID) has a bucket with a maximum capacity $B$ and a refill rate $R$ tokens per second. Token bucket smoothly handles bursty developer traffic while enforcing a strict sustained ceiling.
- **Atomic State in Redis**: State is maintained via an atomic Redis Lua script storing `{ last_refill_timestamp, token_count }`. Evaluating arrival time, computing refilled tokens, and decrementing the bucket executes in a single round-trip without race conditions or distributed locking.
- **Client Contract**:
  - Allowed requests pass through with response headers:
    - `X-RateLimit-Limit`: Maximum tokens in window
    - `X-RateLimit-Remaining`: Remaining tokens
    - `X-RateLimit-Reset`: UTC epoch timestamp when bucket reaches full capacity
  - Throttled requests immediately return:
    - Status: `HTTP 429 Too Many Requests`
    - Header: `Retry-After: <seconds>`
    - Body: Safe error envelope `{"error": {"code": "RATE_LIMIT_EXCEEDED", "message": "API rate limit exceeded. Retry in 14 seconds.", "request_id": "<uuid>"}}`

---

## 3. Alternatives Considered

### Alternative 1: Local In-Memory Rate Limiting (Instance-Scoped Fixed Window)
- **Description**: Implement rate limiting in application memory on each container node using a local cache library (e.g., LRU cache or Guava).
- **Pros**: Zero network overhead (sub-millisecond evaluation); zero external infrastructure dependencies.
- **Cons & Rejection Rationale**: In an auto-scaling environment running 10 pods behind a round-robin load balancer, a client's limit is effectively multiplied by the number of active pods (60 req/min becomes 600 req/min if evenly balanced). Furthermore, pod restarts or scale-down events wipe client counters, allowing burst traffic through. This is unsuitable for SLA-backed paid tiers.

### Alternative 2: Edge / Cloudflare WAF Rate Limiting
- **Description**: Configure Cloudflare or AWS WAF rate-limiting rules at the network perimeter before traffic reaches application servers.
- **Pros**: Blocks abusive requests before they reach our VPC; shields compute instances completely from volumetrically large DDoS attacks.
- **Cons & Rejection Rationale**: Edge WAFs cannot dynamically evaluate per-customer tiered quotas stored in our internal billing database without expensive enterprise edge-worker integrations. Furthermore, edge WAF rate limiting cannot easily inspect authenticated customer JWTs and internal subscription state that changes dynamically upon tier upgrades.

---

## 4. Risks and Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Redis Outage / Unreachability** | Could cause all API requests to fail if rate limiter blocks synchronously. | **Fail-Open Graceful Degradation**: Wrap Redis calls in a 15ms circuit-breaker timeout. If Redis fails or times out, log a high-priority alert and allow requests through rather than failing customer traffic. |
| **Redis Performance Bottleneck** | Adding a Redis round-trip to every API request increases hot-path latency. | Use atomic Lua scripts executed on local Redis read-replicas or connection-pooled primary nodes. Benchmarks show Redis Lua operations execute in under 0.8ms. |
| **Noisy Neighbor on Shared Redis** | Rate limiting keys could crowd out application cache keys. | Dedicated Redis logical database or key prefix with separate memory eviction policy (`volatile-lru` with explicit TTLs on inactive client buckets). |

---

## 5. Open Questions for Reviewers

1. **Tier Propagation Latency**: When a customer upgrades from Free to Pro via Stripe, what is the maximum acceptable delay before Redis reflects their updated token capacity? (Proposal: 5-second asynchronous event sync via webhook consumer).
2. **Burst Allowance for Paid Tiers**: Should Enterprise customers be permitted to burst up to 2x their sustained limit for up to 10 seconds, or should the bucket capacity be strictly hard-capped?
3. **Exemptions for Internal Webhooks**: Do internal service-to-service calls passing through the gateway require mutual TLS exemption, or should they have a dedicated unbounded tier?

