# Technical Explanation: REST-to-GraphQL Migration

## Decision Summary
ShopStream is migrating its public-facing API from REST to GraphQL over an 8-week rollout to eliminate 15 redundant aggregation endpoints and reduce frontend API calls by 40%. A REST API exposes fixed data endpoints like a fixed-dish restaurant menu, whereas GraphQL is a query language that operates like a buffet, allowing client apps to request exactly the fields they need in a single round-trip. During the 8-week dual-run migration window, both legacy REST endpoints and the new GraphQL schema will operate concurrently to ensure zero downtime.

---

## Why We Chose This
The migration directly solves our frontend development bottleneck and eliminates duplicative backend endpoints.

### Core Problems with Our Current REST Setup
- **Endpoint Proliferation**: Our backend currently maintains 47 separate REST endpoints, with 15 existing solely because our mobile and web clients demand different data shapes for identical screens.
- **Sprint Capacity Loss**: Frontend engineers dedicate 30% of every sprint to writing custom aggregation endpoints that stitch together data from disparate underlying microservices.

### Why GraphQL Solves the Problem
- **Single Request Efficiency**: Mobile and web clients fetch nested relationships in a single network round-trip, cutting total mobile network requests by 40%.
- **Client-Driven Shaping**: UI developers select exact field requirements without requiring backend engineers to create single-use endpoints.

### Alternatives Evaluated and Rejected
1. **Backend-for-Frontend (BFF) Pattern**: Building separate translation layers for web and mobile was rejected because it introduces additional microservices to deploy, monitor, and scale.
2. **Schema Standardization across REST**: Standardizing JSON payload schemas across REST was rejected because it does not resolve the fundamental differences between mobile bandwidth constraints and desktop layouts.

---

## Risks and Mitigations

| Identified Risk | System Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Deeply Nested Query Performance** | Malicious or complex queries could overload databases with Cartesian joins (N+1 query problem). | The backend team implements query depth limiting and DataLoader batching to prevent unbounded queries. |
| **HTTP Caching Complexity** | Unlike REST's deterministic GET URL caching, GraphQL uses HTTP POST requests with dynamic query bodies. | The infrastructure team enables persisted queries and edge response caching via Apollo Server caching plugins. |
| **Team Learning Curve** | Two of the three dedicated migration engineers are ramping up on GraphQL semantics for the first time. | The team pairs senior engineers daily and conducts structured schema design reviews for each domain model. |

---

## What This Means for Priya
Welcome to the ShopStream backend team! You join at a foundational stage where your contributions will directly shape our core GraphQL architecture.

- **Role and Focus**: You will work alongside Marcus and Elena on the API core team, focusing on domain schema definitions and query resolvers for the Product Catalog service.
- **Ramping Up**: You are not expected to know GraphQL on Day 1; two other engineers are also learning the technology during this project cycle.
- **Primary Support**: Marcus Vance (Tech Lead) will serve as your onboarding buddy and provide daily 1-on-1 pairing sessions during your first two sprints.

---

## Next Steps

1. **Review Architecture Docs (Monday Morning)**: Read the GraphQL Schema Design Guidelines in Notion at `go/shopstream-graphql-rfc`.
2. **Setup Local Dev Environment (Monday Afternoon)**: Clone the repository `shopstream/api-gateway`, install local dependencies via `npm install`, and launch the Apollo Sandbox at `http://localhost:4000/graphql`.
3. **Join Onboarding Sync (Tuesday 10:00 AM)**: Attend the weekly Schema Review meeting with Marcus and Elena on Google Meet (`meet.google.com/xyz-shopstream`).
4. **First PR Assignment (By Thursday)**: Implement the field resolver for `Product.pricingTier` in branch `feat/priya/product-pricing-resolver`.

