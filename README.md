# CodeMesh — Local-first Programming Classroom

A first runnable MVP based on the supplied architecture and the Kalash / Ishita / Kalyani development briefs.

## What works in this build

- Teacher creates and ends a classroom session.
- Host generates a cryptographically random 12-character join code.
- Student submits name, roll number and code; teacher approves or rejects.
- Admission is required before a student receives a scoped session token.
- Approved student receives an individual workspace.
- Student files autosave to the host and are cached in browser local storage for recovery.
- Teacher can inspect the latest synced workspace, publish an exercise/starter file, lock/unlock all editors, disconnect a student and review submissions.
- Server events update the teacher and student screens in real time using Server-Sent Events (SSE).
- SQLite persistence uses Node 22's built-in `node:sqlite` module.
- Python execution runs in a browser Web Worker through Pyodide once the offline runtime assets have been downloaded.
- A secure Electron BrowserWindow shell is scaffolded.

## Important MVP limitations

This is a demonstrable vertical slice, not the finished production system described in the architecture.

- The current UI is dependency-free HTML/CSS/JavaScript, not yet React + TypeScript.
- The editor is a code textarea, not Monaco Editor yet.
- Live events use SSE, not the specified WebSocket gateway.
- Python works only after Pyodide assets are installed locally. Java/TeaVM execution is not implemented in this build.
- Electron desktop shell requires installing Electron; the no-dependency LAN host can run directly under Node.js.
- LAN HTTP is unencrypted. The teacher control endpoints are restricted to loopback, but production classroom deployment still needs HTTPS/certificate pairing, stronger rate limiting, audit logging, and security review.
- Student local recovery is a browser-local draft cache; conflict-aware merge/recovery is not yet implemented.
- No claim of 30-client readiness is made. Run load tests on the actual router and teacher laptop before classroom deployment.

## Requirements

- Node.js 22.13+ (Node 22 with built-in `node:sqlite`).
- Windows, macOS or Linux.

## Run the host (no npm install required)

```bash
npm start
```

Open `http://localhost:4173` on the teacher laptop. The terminal prints the LAN address, for example `http://192.168.50.10:4173`. Students connect to that address from the same Wi-Fi/LAN.

Keep the teacher dashboard open on `localhost`; teacher-only API routes reject requests coming from other LAN devices.

Data is stored in `~/.codemesh/codemesh.db` (Windows: the user's home directory `.codemesh` folder).

## Enable offline Python execution

Run this once while internet is available, before the classroom session:

PowerShell:

```powershell
.\scripts\setup-pyodide.ps1
```

macOS/Linux:

```bash
./scripts/setup-pyodide.sh
```

The script downloads Pyodide 0.29.4 into `apps/desktop/src/renderer/pyodide`. Once present, Python programs execute in a Web Worker on the student's computer. Runtime assets are served locally; classroom execution does not fetch them from a CDN.

Example:

```python
name = "CodeMesh"
print(f"Hello from {name}!")
```

Expected output: `Hello from CodeMesh!`

Java/TeaVM is not yet wired into this build; the UI deliberately does not pretend that Java execution is available.

## Electron shell (optional)

The Electron entry point and hardened preload are in `apps/desktop/src/main/electron.cjs` and `apps/desktop/src/preload/index.cjs`. Install Electron in the project and launch that entry point to run the desktop wrapper. The host server remains a separate Node child process.

## Tests

```bash
npm test
npm run check
```

## Network notes

- Teacher laptop should preferably connect to the router using Ethernet.
- Student laptops connect to the same Wi-Fi SSID.
- Disable AP/client isolation if it blocks LAN-to-host traffic.
- Use a dedicated classroom network and strong Wi-Fi password.
- This MVP's LAN HTTP traffic is not encrypted; use only on a controlled test network until TLS/certificate trust is implemented.
