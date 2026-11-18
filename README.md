# CodeMesh — MVP v0.9 (Windows packaging in progress)

CodeMesh is a local-first programming classroom prototype. v0.3 replaced the student code textarea with Monaco Editor. v0.4 began an incremental React + TypeScript renderer migration; v0.5 strengthens the existing SSE classroom transport and restores authoritative state after temporary network loss.

## v0.7 progress
Request bodies have a 2 MB hard limit. Oversized declared-length and chunked requests return HTTP 413 without retaining the full payload. Invalid join-code attempts are limited to 8 per IP per minute, and valid admission requests to 10 per IP per active session per minute. Rate-limit state is bounded and expired buckets are pruned.

The renderer build uses React and TypeScript. The shared navigation/header shell is now a React component; teacher/student screen content remains behind a legacy compatibility adapter during the incremental migration. Shared classroom contracts and a typed HTTP client are in place.

Classroom events use versioned, validated envelopes over SSE. Streams send heartbeats and authenticate student bearer tokens in the Authorization header. Clients reconnect with bounded exponential backoff and jitter, then fetch the teacher's current session state or the student's workspace before applying new events. Connection state is shown in the interface. `/api/health` reports current stream counts and cumulative event fan-out metrics. SSE remains in use; the metrics provide evidence for future transport decisions.

Monaco 0.57.0 is pinned as a runtime dependency and bundled locally with esbuild. The host serves its editor, language and worker assets from the ignored build directory; the app does not load Monaco from a CDN. `npm start`, `npm run desktop`, `npm test` and `npm run check` build those assets automatically. After dependencies have been installed, editing works without an internet connection.

## Execution modes (intentional architecture split)

| Mode | Python | Java |
|---|---|---|
| Browser version | Pyodide (local assets) | TeaVM (separate browser-runtime integration; not yet wired in this MVP) |
| Electron desktop version | Installed local Python 3 | Installed local JDK (`javac` + `java`) |

The desktop Run button invokes local interpreters/compilers and displays stdout, stderr, compilation errors and exit status in the integrated output panel. It does **not** use Pyodide or TeaVM.

### Desktop execution details

- Python: `py -3 -u file.py` on Windows when the Python launcher exists; otherwise `python` / `python3`.
- Java: compiles all `.java` files in the workspace with `javac`, then runs the active source file's main class.
- The Electron main process accepts only a narrow IPC request from its own loopback renderer. It delegates to `native-runner.cjs`, which stages workspace files in a temporary directory and spawns allowlisted executable names with `shell: false`.
- Execution has an 8-second timeout, a 256 KB combined output cap, file-count/size limits, path traversal checks and temporary-directory cleanup.
- Java package declarations are supported for a simple active main class. Complex multi-module/build-tool projects are outside this MVP.

**Important:** Native execution runs arbitrary code with the operating-system permissions of the logged-in student. The timeout and file staging are guardrails, not a true sandbox. Do not use untrusted code or deploy this as a secure exam environment without OS-level isolation (for example, a properly configured container/VM or restricted OS account).

## Features carried over from v0.1

- Teacher creates and ends a classroom session.
- Host generates a cryptographically random joining code.
- Students request admission; teacher approves/rejects.
- Approved students receive an individual workspace.
- Workspace changes save to the host; local draft recovery is available.
- Teacher can monitor student work, publish exercises/starter code, lock editors, disconnect students and review submissions.
- SQLite persistence and real-time server events (SSE).
- LAN classroom operation without internet for core classroom coordination.

## Requirements

- Node.js 22.13+ and npm are needed to run from source; the host uses Node's built-in `node:sqlite`.
- The packaged Windows desktop app uses Electron's bundled Node runtime and does not require a separate Node.js installation.
- For desktop development: npm and Electron dependencies.
- For the editor: the pinned Monaco package installed by `npm install`.
- For native Python: Python 3 installed and discoverable through PATH (Windows Python Launcher `py -3` is supported).
- For native Java: a JDK installed with both `javac` and `java` on PATH.
- Windows is the primary target for the current desktop execution flow. Linux/macOS may work if Node, Python and JDK are correctly installed.

## Run the LAN host in a browser

```bash
npm start
```

Open `http://localhost:4173` on the teacher laptop. Students on the same Wi-Fi/LAN open the displayed host address. Browser clients continue to use the browser execution path (offline Python requires local Pyodide assets).

## Run the Electron desktop app

```bash
npm install
npm run desktop
```

Electron starts the local host server and opens the desktop interface. Use the role switch to select Teacher or Student. A student can enter the teacher's LAN host URL and join the session. Student workspaces use Monaco with Python/Java syntax highlighting based on file extension, local autosave, line numbers, indentation, bracket matching and automatic resize layout. On that student's Electron desktop app, the Run button continues to use that student's installed Python/JDK.

The Electron desktop app also starts a local host service on each machine so the same UI can be served locally. For a student joining another teacher's host, use the teacher's displayed LAN address in the Join Classroom form.

## Build the Windows installer

On Windows, install the locked development dependencies and build the x64 NSIS installer:

```bash
npm install
npm run dist:win
```

The configured output directory is `release/`. The installer is set up for a per-user install, and uninstall leaves classroom data in the user's `~/.codemesh` directory. The v0.9 packaging workflow and clean-machine install/upgrade/uninstall behavior still need verification. The current build is blocked by missing CSS imports in the pinned Monaco 0.57.0 ESM package, so no installer has been produced. The installer currently has no project icon or publisher signature.

## Test and inspect

The native runner was smoke-tested in the build environment with Python 3.13 and OpenJDK 21: both printed the expected CodeMesh greeting. This verifies the runner path, not the Electron GUI or your particular Windows installation.

```bash
npm test
npm run check
```

## Browser offline Python assets

The browser-only version can download Pyodide assets before a classroom session:

PowerShell:
```powershell
.\scripts\setup-pyodide.ps1
```

macOS/Linux:
```bash
./scripts/setup-pyodide.sh
```

The Electron desktop Run button does not use these assets.

## Known limitations / next work

- v0.8 LAN/offline validation is underway. See [the LAN validation guide](docs/lan-validation.md) for router setup, troubleshooting, and the outstanding physical-device/load test record.

- The React + TypeScript migration is underway. Teacher and student screen content still uses the legacy renderer adapter and needs incremental component migration and feature-parity checks.
- The remaining legacy screen renderer is bundled for local delivery; it has not yet been converted into typed React components.
- SSE event history is not replayed; clients recover snapshots after reconnect. Two-device reconnect and LAN load testing remain outstanding.
- Browser Java/TeaVM runtime is not wired in this build.
- TLS/certificate pairing, hardened LAN transport, OS-level sandboxing, signed installers and 30-client load testing remain outstanding.
- Electron packaging/Windows installer has not yet been built or tested.
- Native Python/JDK installation checks happen at Run time; there is no guided installer yet.
- Java support currently targets straightforward source files with a main class, not arbitrary Maven/Gradle projects, JNI, GUI apps or every JDK feature.

## Network setup

- Teacher laptop preferably connects to the router using Ethernet.
- Student laptops connect to the same Wi-Fi/LAN.
- Disable AP/client isolation if it blocks LAN-to-host traffic.
- This MVP uses unencrypted HTTP on the LAN. Use only on a controlled development network until TLS/certificate trust is implemented.

## Data

Classroom data is stored in `~/.codemesh/codemesh.db` (Windows: the user's home directory `.codemesh` folder). Native execution staging directories are temporary and removed after each run.
