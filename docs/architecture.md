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

## Event transport

SSE is used as a deliberately small first implementation. Teacher clients receive classroom events; authenticated student clients receive only classroom-wide lock/exercise/session events plus their own disconnect event. Replace SSE with the specified authenticated WebSocket gateway before implementing high-frequency collaboration/Yjs updates.

## Student editor

Student workspaces use Monaco's local package assets. Python and Java language modes are selected from the active file extension; other files use plain text. Editor changes continue through the existing local-draft/autosave path and host workspace API. Automatic layout handles container resizing, and teacher lock events recreate the editor as read-only. The host still rejects workspace writes while locked.

The existing renderer remains unbundled; a small esbuild step bundles only Monaco's ESM entry and worker into the ignored `dist/monaco` directory. The static server exposes those outputs through a path-bounded `/monaco/` route. Workers are same-origin module workers, so the Electron policy does not need `unsafe-eval` or blob workers. The planned v0.4 React/TypeScript build can absorb this focused bundle into the renderer build.

## Execution

In Electron desktop mode, student code continues to run through the existing native Python/JDK runner on the student's computer. In browser mode, Python is delegated to locally hosted Pyodide assets and Java TeaVM is not yet integrated. Web Workers are not a complete security boundary; add memory/output constraints and robust cancellation before production use.
