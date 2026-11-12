# Module 04: Performance Debugging & Profiling

## Key Insights
- **Blueprints vs Reality**: Code inspection cannot catch dynamic runtime resource leaks; active runtime profiling (CPU and memory) is required.
- **CPU vs Memory Profiling**:
  - CPU profiling isolates execution hotspots (e.g. tight loops, unindexed queries, blocking I/O).
  - Memory profiling tracks allocations, unbus-ed retention, leak trajectories, and uncollected references.
- **Leak Archetypes**: Unclosed database connections on error branches, unbounded event listeners, growing cache maps without eviction.
- **N+1 Query Patterns**: Iterative serial queries per record instead of batch lookups, multiplying round trips by N.
