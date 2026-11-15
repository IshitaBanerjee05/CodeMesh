# Integration status

## Implemented in MVP

- Kalash scope: local host, SQLite, join-code/admission/token flow, LAN address discovery, role-scoped routes, workspace persistence, lock/disconnect/session lifecycle, exercise and submission APIs.
- Ishita scope: teacher dashboard, classroom creation, joining code, admission approve/reject, participant monitor, read-only workspace view, exercise publishing, lock/unlock, disconnect, submissions.
- Kalyani scope: student join/waiting flow, individual workspace/file creation, autosave/recovery cache, lock handling, submission, Pyodide worker adapter.

## Deliberately incomplete

- React + TypeScript migration and shared typed contracts.
- Monaco Editor integration.
- Authenticated WebSocket gateway and Yjs sync.
- Offline Pyodide runtime download/package step must be run separately.
- Java TeaVM compiler/runtime bridge.
- TLS/certificate pairing, audit trail, advanced rate limiting, and formal security review.
- 30-client load test and real classroom router test.

## Validation

A local HTTP integration smoke test has been run for session creation, join request, approval, one-time token retrieval, workspace fetch/save, submission, and submission listing. Syntax checks have also been run. Real LAN multi-device and Electron package tests remain outstanding.
