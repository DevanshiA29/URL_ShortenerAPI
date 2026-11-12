# Revisions for Jamie Chen's Event Processing Pipeline Design Document

## 1. Missing Section: Alternatives Considered

### Alternative 1: Managed Cloud Queue (AWS SQS + Lambda / Auto-scaled Workers)
- **Description**: Publish events directly to AWS SQS FIFO or Standard queues, consumed by auto-scaling worker nodes.
- **Pros**: Completely eliminates the operational burden of provisioning, patching, and maintaining a self-hosted 3-broker ZooKeeper/Kafka cluster; built-in Dead Letter Queue (DLQ), native encryption, and zero cluster management.
- **Cons & Rejection Rationale**: SQS per-request pricing becomes cost-prohibitive as event volumes scale into billions of monthly events. SQS does not support persistent replay/retention from offset (unlike Kafka's log abstraction), preventing replay of past events for backfills and new analytics models.

### Alternative 2: In-Memory Micro-Batching with Periodic Flush
- **Description**: Buffer events in API server process memory and flush in bulk batches (e.g., every 2 seconds or 500 events) directly to the analytics database using bulk insert operations.
- **Pros**: Zero additional infrastructure required (no Kafka, no external queue brokers); drastically reduces database write IOPS by combining hundreds of single-row inserts into a single bulk network round-trip.
- **Cons & Rejection Rationale**: Volatile in-memory buffers risk permanent data loss during server crashes, pod restarts, or deployments. Memory footprint scales with traffic spikes, creating container out-of-memory (OOM) risks under heavy load.

---

## 2. Refactored Assumption: Converted to Open Question with Validation Plan

**Previous text (hidden assumption):**  
*"The analytics database can handle the write volume. Our current peak is around 2,000 events/second, and the database benchmarks show capacity for 10,000 writes/second, so we have plenty of headroom."*

**Rewritten Open Question:**  
**Open Question 1: Can the analytics database sustain 10K writes/sec under production concurrency and indexing patterns?**  
- **Context & Risk**: The cited 10k writes/sec benchmark was performed on an unindexed prototype table without concurrent read queries. In production, write amplification from secondary indexes and concurrent analytical dashboards will reduce disk I/O throughput.
- **Validation Plan**: The Database Engineering team will execute a load test during Week 2 using production-equivalent schemas, full secondary indexing, and concurrent read traffic.
- **Decision Trigger**: If sustained write capacity falls below 5,000 writes/sec, we will implement a Redis write-ahead buffer or evaluate a columnar time-series store (e.g., ClickHouse) prior to Week 4 implementation.

---

## 3. Concrete Risk Mitigation: Replacing Vague Wishes with Actionable Runbooks

**Previous text (vague wish):**  
*"Mitigation: we will monitor consumer lag closely and scale up consumers if needed."*

**Rewritten Actionable Runbook:**  
**Mitigation for Consumer Lag:**
1. **Metric Measured**: Kafka consumer group lag (unprocessed message count) tracked via Datadog.
2. **Trigger Threshold**: Datadog P2 alert fires if consumer lag exceeds 50,000 messages for >3 consecutive minutes, or if message processing latency exceeds 30 seconds.
3. **Action & Execution**:
   - Automated: Kubernetes Horizontal Pod Autoscaler (HPA) triggers scaling up consumer pods from 3 to a maximum of 12 (matching partition count).
   - Manual (if alert persists): On-call engineer runs `kubectl scale deployment/event-consumer --replicas=12` and inspects `event-consumer` logs for database lock contention.
4. **Owner**: Primary On-Call Platform Engineer.
5. **SLA**: Initial automated scale response within 60 seconds; manual escalation to Technical Lead if lag does not decrease within 15 minutes.

