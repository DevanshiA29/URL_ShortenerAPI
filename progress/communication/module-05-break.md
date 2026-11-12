# Module 05 BREAK: Deconstructing Marcus's Jargon-Laden Stakeholder Email

## Part 1: Jargon Count & Catalog
Total Jargon Terms Counted: **36 distinct technical phrases** that a Head of Product or non-specialist VP cannot evaluate:
1. *EOL*
2. *Kong 2.8.x*
3. *NGINX reverse proxy*
4. *Custom Lua plugins*
5. *Rate limiting*
6. *JWT validation*
7. *mTLS termination*
8. *Service mesh*
9. *Zero-trust policies east-west*
10. *Autoscaling group*
11. *c5.2xlarge instances*
12. *12,000 RPS*
13. *p95 < 200ms*
14. *p99 spike to 1.8 seconds*
15. *Cascaded into timeout errors*
16. *Checkout SLO 99.95%*
17. *Dipped to 99.2% for 47 minutes*
18. *Envoy-based ingress*
19. *Kubernetes clusters*
20. *Istio sidecars*
21. *Circuit breaking at mesh level*
22. *Retry budgets*
23. *WASM filters*
24. *GitOps CI/CD pipelines*
25. *StatsD + Grafana*
26. *OpenTelemetry collectors*
27. *Datadog tenant*
28. *Blue-green deployment*
29. *Customer-facing downtime*
30. *Synthetic load tests*
31. *2x production traffic*
32. *24K RPS at p95 < 150ms*
33. *128MB pod memory overhead*
34. *340 pods*
35. *42.5 GB cluster memory*
36. *Reserved capacity for autoscaling events*

---

## Part 2: The Buried Risk
The email conceals three dangerous operational risks:
1. **Unverified Cluster OOM Risk**: The upgrade adds 42.5 GB of memory overhead across 340 microservice pods. Marcus casually admits: *"we have not validated this against the reserved capacity for autoscaling events."* Under heavy traffic, this could cause Kubernetes nodes to run out of memory, evicting pods and triggering a catastrophic cluster outage during high-traffic events.
2. **Hidden Feature Velocity Cost**: Marcus asks for 2 engineers for 8 weeks (16 engineering weeks) without explaining which product roadmap commitments will be deferred.
3. **Passive, Unactionable Close**: Marcus concludes with *"Let me know if you have questions"*—a total failure of leadership that abdicates decision-making and provides no deadline, approval request, or trade-off evaluation.

---

## Part 3: Executive BLUF Rewrite of the Opening

> **Subject: Approval Request: 8-Week Gateway Upgrade to Prevent Black Friday Checkout Outages**
> 
> Hi Sarah and David,
> 
> We are requesting your approval to dedicate 2 platform engineers for 8 weeks in Q3 to upgrade our core website traffic gateway. 
> 
> **Why this matters**: Last November, our checkout system slowed to a crawl for 47 minutes during Black Friday peak shopping because our traffic gateway reached maximum capacity. This upgrade doubles our traffic capacity so we can easily handle projected Black Friday volume without slowing down. The migration runs in parallel with our current system, ensuring zero customer downtime.
> 
> **The Ask**: We need your formal sign-off by July 15 to commit 2 engineers from the platform team. Can we take 20 minutes this Thursday at 2 PM to review the roadmap tradeoff and finalize approval?

