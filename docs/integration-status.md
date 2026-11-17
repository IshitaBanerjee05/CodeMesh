# CodeMesh integration status — v0.4 migration in progress

## v0.4 progress
- React and TypeScript dependencies are pinned by the package lockfile.
- The local build produces a React renderer bundle served by the existing Node host; no CDN is used.
- The shared sidebar navigation and header/role switch are rendered by React. Existing screen markup is passed through a compatibility adapter while those screens are migrated.
- Shared TypeScript contracts describe sessions, students, workspaces, exercises, submissions, classroom events, and native execution results.
- A typed HTTP client is used by existing renderer API calls, and the desktop bridge has a narrow declared type.
- Teacher/student screen content remains in the legacy adapter. Screen-by-screen React migration and feature-parity verification remain outstanding.
- The existing Electron main process, preload bridge, classroom server, and native runner remain in place.

## Implemented
- Teacher/student classroom flow, SQLite persistence and SSE updates carried forward from v0.1/v0.2.
- Electron-only native Python and Java execution through the existing narrow preload IPC bridge and native runner.
- Monaco Editor 0.57.0 pinned as a runtime dependency and bundled locally with pinned esbuild 0.27.7.
- The host serves generated Monaco JavaScript, CSS and worker files from the ignored `dist/monaco` directory under `/monaco/`; runtime assets are same-origin and require no CDN.
- Student workspace uses Monaco with Python/Java syntax modes selected from file extensions, line numbers, four-space indentation, word wrap, bracket matching and automatic layout.
- Editor changes continue to update local drafts, autosave to the host and use the existing workspace API and native Run path.
- Teacher lock events make Monaco read-only and disable file editing controls; the server continues to reject locked workspace writes.
- Monaco asset route rejects paths outside the build directory and serves editor/worker assets from the same origin.

## Verified in this environment
- v0.2 baseline before changes: `npm run check` passed and `npm test` passed (7 tests).
- Monaco dependency installed from npm at the pinned version.

## Verification and manual checks
- `npm run check` passed after the implementation.
- `npm test` passed: 9 tests, including Monaco language mapping, local asset serving and traversal rejection.
- Desktop smoke check confirmed the Electron app launches and the teacher dashboard renders from the local app server.
- Full student workspace checks for Python/Java highlighting, resize behavior, autosave, native Run and locked editing remain to be exercised interactively.
- Two-device LAN and internet-disconnected classroom checks remain outstanding.

## Known limitations
- Only the Monaco entry and worker are bundled; the rest of the renderer remains vanilla JavaScript and HTML.
- Monaco provides syntax highlighting here, not language-server diagnostics, completion or debugger features.
- Native code execution still runs with the logged-in OS user's permissions; process timeouts and temporary staging are not a security sandbox.
- TLS/certificate pairing, OS-level execution isolation and approximately 30-client load testing are not complete.
