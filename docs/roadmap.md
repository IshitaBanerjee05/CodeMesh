# Next implementation milestones

1. Migrate the UI to React + TypeScript and establish shared typed contracts/client SDK packages.
2. Replace the textarea with Monaco Editor, preserving per-file models and read-only teacher viewer.
3. Replace SSE with authenticated WebSocket (`ws`), central event schemas and reconnect/resync handling.
4. Add proper local draft/server version reconciliation and starter-code version conflict prompts.
5. Complete Python runtime packaging, cancellation and memory/output limits; integrate and compatibility-test TeaVM Java in a separate worker.
6. Add TLS with an explicit pairing/certificate trust flow, audit events, stricter schema validation, per-IP and per-session rate limiting, and security review.
7. Add unit/integration/E2E coverage and simulate 30 clients; then test with the actual classroom router and laptops.
8. Package Electron with a bundled Node runtime and offline runtime assets so student/teacher computers do not need a separate Node installation.
