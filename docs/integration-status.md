# CodeMesh integration status — v0.5 real-time reliability

## v0.4 progress
- React and TypeScript dependencies are pinned by the package lockfile.
- The local build produces a React renderer bundle served by the existing Node host; no CDN is used.
- The shared sidebar navigation and header/role switch are rendered by React. Existing screen markup is passed through a compatibility adapter while those screens are migrated.
- Shared TypeScript contracts describe sessions, students, workspaces, exercises, submissions, classroom events, and native execution results.
- A typed HTTP client is used by existing renderer API calls, and the desktop bridge has a narrow declared type.
- Teacher/student screen content remains in the legacy adapter. Screen-by-screen React migration and feature-parity verification remain outstanding.
- The existing Electron main process, preload bridge, classroom server, and native runner remain in place.

## v0.5 implemented
- SSE events use the shared version 1 envelope and payload validators in `apps/desktop/src/shared/realtime-protocol.mjs`.
- The host sends SSE heartbeats, resumes each stream's sequence from `Last-Event-ID`, closes clients with more than 1 MiB of queued output, and reports active streams, event fan-out, byte totals, slow-client/backpressure counts, process memory and CPU time from `/api/health`.
- Teacher and student clients use bounded exponential retry with jitter. Each reconnection fetches the teacher's full session view or the student's workspace and settings before live events are applied.
- Clients expose connected, connecting, reconnecting, offline and unauthorized states, ignore duplicate event IDs and resynchronize on stream gaps or host restarts.
- Student stream tokens are sent in the Authorization header; token query strings are rejected. Workspace identity is derived from the bearer token, not a client-supplied participant ID.
- Repeated admission decisions, lock states and disconnect actions are idempotent when retried with the same outcome.
- The transport remains SSE. The new health metrics are available for future fan-out/load measurements; no WebSocket change was justified without representative LAN measurements.

## Implemented
- Teacher/student classroom flow, SQLite persistence and SSE updates carried forward from v0.1/v0.2.
- Electron-only native Python and Java execution through the existing narrow preload IPC bridge and native runner.
- Monaco Editor 0.57.0 pinned as a runtime dependency and bundled locally with pinned esbuild 0.27.7.
- The host serves generated Monaco JavaScript, CSS and worker files from the ignored `dist/monaco` directory under `/monaco/`; runtime assets are same-origin and require no CDN.
- Student workspace uses Monaco with Python/Java syntax modes selected from file extensions, line numbers, four-space indentation, word wrap, bracket matching and automatic layout.
- Editor changes continue to update local drafts, autosave to the host and use the existing workspace API and native Run path.
- Teacher lock events make Monaco read-only and disable file editing controls; the server continues to reject locked workspace writes.
- Monaco asset route rejects paths outside the build directory and serves editor/worker assets from the same origin.

## Verification and manual checks
- `npm run check` passed: renderer/Monaco bundles build, JavaScript syntax checks pass and TypeScript reports no errors.
- `npm test` passed: 14 tests, including SSE authentication/heartbeats, versioned payload validation, retry backoff and cancellation, snapshot recovery, deduplication, retry-safe actions and workspace identity isolation.
- Server integration tests create two students, verify token-scoped workspace isolation, and exercise SSE authentication, heartbeats, event delivery and disconnect notifications. Client unit tests simulate a dropped stream and snapshot recovery.
- Manual Wi-Fi interruption/reconnection across two physical devices, offline-LAN operation and host CPU/memory/fan-out measurements under representative classroom load remain outstanding.

## Known limitations
- Only the Monaco entry and worker are bundled; the rest of the renderer remains vanilla JavaScript and HTML.
- SSE does not store or replay missed events. Reconnection recovers from authoritative session/workspace snapshots; unsaved local student drafts are kept and retried when the host is reachable.
- The automated reconnect tests use local streams and do not model real Wi-Fi/AP interruption, roaming, or mobile sleep/wake behavior.
- Monaco provides syntax highlighting here, not language-server diagnostics, completion or debugger features.
- Native code execution still runs with the logged-in OS user's permissions; process timeouts and temporary staging are not a security sandbox.
- TLS/certificate pairing, OS-level execution isolation and approximately 30-client load testing are not complete.
