# CodeMesh Architecture — MVP implementation

## Physical layout

Teacher laptop runs the host process and teacher UI. The teacher laptop should connect by Ethernet to a dedicated router/access point. Student devices connect by Wi-Fi to the same subnet. Internet/WAN is optional.

## Runtime components

- `apps/desktop/src/main/server.mjs`: Node HTTP API, SQLite persistence, LAN interface discovery, admission, workspace and submission services, SSE event fan-out.
- `apps/desktop/src/renderer`: teacher/student UI, Monaco student editor and browser-side workspace client.
- `apps/desktop/src/renderer/monaco-editor.js`: local Monaco loader, language mapping, editor lifecycle and editor options.
- Monaco runtime: the pinned npm package is served from `/monaco/vs/` by a path-bounded static route; runtime assets are same-origin and require no CDN.
- `apps/desktop/src/renderer/workers/python.worker.js`: Pyodide Web Worker adapter.
- `apps/desktop/src/main/electron.cjs`: optional Electron shell with context isolation, renderer sandbox, and Node integration disabled.
- `apps/desktop/src/preload/index.cjs`: narrow read-only desktop metadata bridge.

## Trust boundaries

Teacher control API routes and teacher event stream are loopback-only. Student workspace and submission routes require an approved per-student bearer token scoped to the active session. Tokens are stored as SHA-256 hashes in SQLite; a newly approved token is delivered once to the matching pending request status poll. Ending a session revokes all its participant tokens. A student cannot use a token from a previous session to access a new session.

The MVP still uses unencrypted HTTP over LAN. This is a known production blocker. Add TLS with a pairing/trust workflow before using on an untrusted network.

## Storage

SQLite is stored in the user's `.codemesh` directory. Workspace files and submissions are JSON-serialized records in SQLite for the first MVP. The architecture can later move larger workspace blobs to the host filesystem with SQLite metadata and hashes.

## Event transport and recovery

SSE remains the classroom event transport in v0.5. Each message has a versioned, validated envelope and a server-instance/stream sequence ID. Teacher streams are loopback-only. Student streams authenticate with the bearer token in the Authorization header and receive classroom-wide lock, exercise and session events plus only their own disconnect event. Query-string tokens are rejected. The host sends SSE heartbeat comments every 15 seconds, disconnects streams with over 1 MiB of queued output, and exposes connection counts, event counts, backpressure and process resource metrics from `/api/health`.

Clients reconnect with bounded exponential backoff and jitter. After every stream connection they fetch authoritative session state or their own workspace before processing new events; duplicate event IDs are ignored, and stream gaps or server restarts trigger another snapshot. The host does not keep a replay log. SSE is retained because the current workflow needs low-rate notifications; measured fan-out metrics will inform any future transport change. High-frequency collaboration and Yjs remain out of scope until load testing demonstrates a need.

## Student editor

Student workspaces use Monaco's local package assets. Python and Java language modes are selected from the active file extension; other files use plain text. Editor changes continue through the existing local-draft/autosave path and host workspace API. Automatic layout handles container resizing, and teacher lock events recreate the editor as read-only. The host still rejects workspace writes while locked.

The existing renderer remains unbundled; a small esbuild step bundles only Monaco's ESM entry and worker into the ignored `dist/monaco` directory. The static server exposes those outputs through a path-bounded `/monaco/` route. Workers are same-origin module workers, so the Electron policy does not need `unsafe-eval` or blob workers. The planned v0.4 React/TypeScript build can absorb this focused bundle into the renderer build.

## Execution

In Electron desktop mode, student code continues to run through the existing native Python/JDK runner on the student's computer. In browser mode, Python is delegated to locally hosted Pyodide assets and Java TeaVM is not yet integrated. Web Workers are not a complete security boundary; add memory/output constraints and robust cancellation before production use.
