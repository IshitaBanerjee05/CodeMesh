# v0.7 security hardening

v0.7 now enforces request-body limits and per-IP join/admission rate limits with bounded in-memory buckets. Continue to preserve the v0.5 SSE recovery behavior and the local-only teacher control boundary.

1. Complete React + TypeScript screen migration and establish feature parity across teacher and student workflows.
2. Exercise real Wi-Fi interruption/reconnect on two devices; check saved workspace recovery and offline local draft retention.
3. Measure stream fan-out, event latency, host CPU/memory and backpressure at 5, 10, 20 and approximately 30 clients; consider WebSocket only if observed needs justify it.
4. Add starter-code version reconciliation and conflict prompts for changed server-side classroom content.
5. Complete Python runtime packaging, cancellation and memory/output limits; integrate and compatibility-test TeaVM Java in a separate worker.
6. Add TLS with an explicit pairing/certificate trust flow, audit events, stricter request validation, per-IP and per-session rate limiting, and security review.
7. Expand end-to-end coverage and simulate realistic reconnects/loads, then test with the actual classroom router and laptops.
8. Package Electron with a bundled Node runtime and offline runtime assets so student/teacher computers do not need a separate Node installation.
