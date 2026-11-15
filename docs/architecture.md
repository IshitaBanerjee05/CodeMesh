# CodeMesh Architecture — MVP implementation

## Physical layout

Teacher laptop runs the host process and teacher UI. The teacher laptop should connect by Ethernet to a dedicated router/access point. Student devices connect by Wi-Fi to the same subnet. Internet/WAN is optional.

## Runtime components

- `apps/desktop/src/main/server.mjs`: Node HTTP API, SQLite persistence, LAN interface discovery, admission, workspace and submission services, SSE event fan-out.
- `apps/desktop/src/renderer`: teacher/student UI and browser-side workspace client.
- `apps/desktop/src/renderer/workers/python.worker.js`: Pyodide Web Worker adapter.
- `apps/desktop/src/main/electron.cjs`: optional Electron shell with context isolation, renderer sandbox, and Node integration disabled.
- `apps/desktop/src/preload/index.cjs`: narrow read-only desktop metadata bridge.

## Trust boundaries

Teacher control API routes and teacher event stream are loopback-only. Student workspace and submission routes require an approved per-student bearer token scoped to the active session. Tokens are stored as SHA-256 hashes in SQLite; a newly approved token is delivered once to the matching pending request status poll. Ending a session revokes all its participant tokens. A student cannot use a token from a previous session to access a new session.

The MVP still uses unencrypted HTTP over LAN. This is a known production blocker. Add TLS with a pairing/trust workflow before using on an untrusted network.

## Storage

SQLite is stored in the user's `.codemesh` directory. Workspace files and submissions are JSON-serialized records in SQLite for the first MVP. The architecture can later move larger workspace blobs to the host filesystem with SQLite metadata and hashes.

## Event transport

SSE is used as a deliberately small first implementation. Teacher clients receive classroom events; authenticated student clients receive only classroom-wide lock/exercise/session events plus their own disconnect event. Replace SSE with the specified authenticated WebSocket gateway before implementing high-frequency collaboration/Yjs updates.

## Execution

Student code executes in the student's browser worker, not on the teacher host. Python is delegated to locally hosted Pyodide assets. Java TeaVM is not yet integrated. Web Workers are not a complete security boundary; add memory/output constraints and robust cancellation before production use.
