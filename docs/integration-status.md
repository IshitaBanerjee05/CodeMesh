# CodeMesh integration status — v0.9 Windows packaging in progress

## v0.9 packaging progress
- Pinned `electron-builder` 26.18.0 and configured an x64 NSIS per-user installer with local renderer/Monaco build assets.
- The Electron main process starts the classroom host through Electron's bundled Node utility process, avoiding a separate system Node.js requirement for the packaged desktop app.
- Classroom SQLite data remains in the existing user-profile `~/.codemesh` directory, outside the install directory, to preserve continuity and avoid a risky database migration.
- `npm run dist:win` completed on Windows and produced `release/CodeMesh-Setup-0.9.0-x64.exe` (92,827,412 bytes), with the unpacked app and `app.asar` containing the host, renderer, Monaco JavaScript, and generated Monaco CSS assets.
- A build plugin handles the published Monaco 0.57.0 ESM package's 11 missing imported CSS files by substituting empty stylesheet modules and retaining the available CSS; the installed dashboard launches, but editor visual behavior still needs verification.
- The installer was installed/upgraded in the current Windows profile and the installed app launched successfully to the teacher dashboard. Clean-machine install/launch, upgrade, and uninstall checks remain outstanding. Python/JDK remain separate student-side prerequisites; project icon and code signing are not configured.
- Dependency resolution reported 16 npm advisories (2 low, 5 moderate, 8 high, 1 critical); no automatic audit fixes were applied.

## v0.8 LAN/offline validation started
- Added `docs/lan-validation.md` with router topology, adapter selection guidance, troubleshooting, and a results template.
- Physical two-device, offline-LAN, interruption/reconnect, and 5/10/20/approximately-30-client measurements have not been run; results remain explicitly unverified.
- The existing host enumerates all non-loopback IPv4 adapters and displays them on the teacher dashboard. Students are given a host URL field and connection instructions.

## v0.7 progress
- Request bodies are capped at 2 MB using both the declared content length and actual streamed bytes.
- Oversized requests return HTTP 413; the reader stops retaining further chunks after the limit is crossed.
- Join-code guesses are limited to 8 per IP per minute. Valid admission requests are limited to 10 per IP and active session per minute.
- Rate-limit buckets expire and the in-memory maps are capped at 4,096 keys.
- Integration coverage exercises declared-length and chunked oversized requests, plus both join-code and admission limits.
- Full route/auth review, execution boundary review, TLS planning, OS isolation assessment, and physical security validation remain outstanding.

## v0.6 teacher workflow in progress
- Approved student roster reports live stream presence; presence changes use validated SSE events.
- Teacher monitor distinguishes online and offline students and shows whether each has submitted.
- Teacher can review a submission's files through a loopback-only, active-session-scoped read route.
- Session end revokes tokens and preserves existing records/submissions; automatic deletion policy remains intentionally undefined.
- Full teacher UI workflow and multi-device/manual LAN verification remain outstanding.

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
- Monaco 0.57.0 and React are build-time dependencies; their generated renderer, editor, language and worker bundles are packaged locally with pinned esbuild 0.27.7.
- The host serves generated Monaco JavaScript, CSS and worker files from the ignored `dist/monaco` directory under `/monaco/`; runtime assets are same-origin and require no CDN.
- Student workspace uses Monaco with Python/Java syntax modes selected from file extensions, line numbers, four-space indentation, word wrap, bracket matching and automatic layout.
- Editor changes continue to update local drafts, autosave to the host and use the existing workspace API and native Run path.
- Teacher lock events make Monaco read-only and disable file editing controls; the server continues to reject locked workspace writes.
- Monaco asset route rejects paths outside the build directory and serves editor/worker assets from the same origin.

## Verification and manual checks
- `npm run check` passed: renderer/Monaco bundles build, JavaScript syntax checks pass and TypeScript reports no errors.
- `npm test` passed: 14 tests, including SSE authentication/heartbeats, versioned payload validation, retry backoff/cancellation, snapshot recovery, deduplication, retry-safe actions, workspace isolation, presence transitions and submission detail retrieval.
- Server integration tests create two students, verify token-scoped workspace isolation, and exercise SSE authentication, heartbeats, event delivery and disconnect notifications. Client unit tests simulate a dropped stream and snapshot recovery.
- Manual Wi-Fi interruption/reconnection across two physical devices, offline-LAN operation and host CPU/memory/fan-out measurements under representative classroom load remain outstanding.

## Known limitations
- Only the Monaco entry and worker are bundled; the rest of the renderer remains vanilla JavaScript and HTML.
- SSE does not store or replay missed events. Reconnection recovers from authoritative session/workspace snapshots; unsaved local student drafts are kept and retried when the host is reachable.
- The automated reconnect tests use local streams and do not model real Wi-Fi/AP interruption, roaming, or mobile sleep/wake behavior.
- Monaco provides syntax highlighting here, not language-server diagnostics, completion or debugger features.
- Native code execution still runs with the logged-in OS user's permissions; process timeouts and temporary staging are not a security sandbox.
- TLS/certificate pairing, OS-level execution isolation and approximately 30-client load testing are not complete.
