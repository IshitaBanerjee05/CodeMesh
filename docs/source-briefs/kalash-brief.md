# CodeMesh --- Individual Development Brief

## Owner: Kalash

### Role: Backend, Electron Core, Networking, Security & Integration Lead

> **How to use this document:** Give the entire contents of this file to
> your vibe-coding assistant as the project brief for your assigned
> work. Work only within your ownership areas unless the team explicitly
> agrees otherwise.

------------------------------------------------------------------------

# 1. Project mission

Build **CodeMesh**, a local-first desktop programming classroom
platform.

A teacher runs CodeMesh on a laptop connected by Ethernet to a dedicated
Wi-Fi router/access point. Around 30 student laptops connect to that
same local network. The teacher creates a classroom session and shares a
joining code. Students enter the code, submit their name and roll
number, and wait for teacher approval. Approved students receive their
own coding workspace.

The core classroom session must work without internet. The router
provides network connectivity; the teacher's laptop runs the CodeMesh
host server. Students execute their own programs locally rather than
sending arbitrary code to the teacher's computer.

## 2. Your ownership

You own the **backend and desktop foundation**:

-   Electron main process and application lifecycle.
-   Preload bridge and safe IPC APIs.
-   Local host HTTP server using Node.js and Express.
-   WebSocket server and event routing.
-   Classroom/session management.
-   Join-code generation, admission and authentication.
-   Role-based permissions.
-   SQLite persistence and host-side workspace storage.
-   Host network-interface detection and connection information.
-   Shared TypeScript contracts/API definitions.
-   Integration of Ishita's teacher UI and Kalyani's student/editor
    modules.
-   Build, packaging, integration tests and release documentation.

You are the integration lead. You do **not** own the detailed visual
design of the teacher or student screens, nor the Monaco editor
implementation.

------------------------------------------------------------------------

# 3. Fixed technology decisions

Use these technologies unless the team agrees to change them:

-   Electron.js
-   React.js + TypeScript
-   Node.js
-   Express.js
-   WebSocket using `ws`
-   SQLite
-   Zod or an equivalent runtime schema validator
-   Yjs integration through a clearly defined service boundary
-   Vite or the agreed Electron + Vite starter
-   Vitest/Jest and Playwright where appropriate

Do not introduce another backend framework, database, cloud dependency,
or competing state-management architecture without discussing it with
the team.

------------------------------------------------------------------------

# 4. Repository ownership and folder boundaries

Create and maintain the agreed repository structure. Suggested baseline:

``` text
codemesh/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/                 # YOU OWN
│       │   ├── preload/              # YOU OWN
│       │   └── renderer/
│       │       ├── shared/           # Shared contracts only; coordinate changes
│       │       ├── teacher/          # Ishita owns
│       │       └── student/          # Kalyani owns
│       └── package.json
├── packages/
│   ├── contracts/                    # YOU OWN
│   ├── host-server/                   # YOU OWN
│   ├── client-sdk/                    # YOU OWN
│   ├── editor/                        # Kalyani owns
│   └── ui/                            # Ishita owns shared visual components
├── tests/
│   ├── integration/                  # YOU OWN
│   └── load/                         # YOU OWN
├── docs/
├── scripts/
├── package.json
├── tsconfig.json
└── README.md
```

The team may adjust this structure once at project kickoff. After that,
do not rename or move shared folders without notifying both teammates.

### Ownership rules

-   You may edit `apps/desktop/src/main/**`,
    `apps/desktop/src/preload/**`, `packages/contracts/**`,
    `packages/host-server/**`, `packages/client-sdk/**`,
    `tests/integration/**`, and `tests/load/**`.
-   Ishita owns `apps/desktop/src/renderer/teacher/**` and
    `packages/ui/**`.
-   Kalyani owns `apps/desktop/src/renderer/student/**` and
    `packages/editor/**`.
-   Shared root configuration, dependency versions, build scripts, and
    package manifests are changed by you only, after notifying the team.
-   Do not edit teammates' files to fix integration issues without first
    discussing the change. Create an issue or ask the owner to make the
    change.

------------------------------------------------------------------------

# 5. First responsibility: establish the project foundation

Before parallel feature development, create a small working skeleton and
publish the contracts.

1.  Initialize the GitHub repository and protect the `main` branch.
2.  Set up the agreed monorepo or single-repository structure.
3.  Configure Electron + React + TypeScript + Vite.
4.  Create the desktop main process and preload bridge.
5.  Create a basic role selection screen placeholder that routes to
    Teacher or Student mode.
6.  Add linting, formatting, type checking, and a working build.
7.  Add environment/configuration handling that does not require
    internet.
8.  Publish `docs/architecture.md` and `docs/api-contracts.md`.
9.  Create issues for Ishita and Kalyani with exact folder boundaries.
10. Merge the foundation PR before feature branches diverge.

Do not build a giant application in one file. Use small modules with
explicit interfaces.

------------------------------------------------------------------------

# 6. Backend components to implement

## 6.1 Host lifecycle and local networking

Implement a host service that:

-   Starts only when the teacher selects **Create/Start Classroom**.
-   Binds to the appropriate LAN interface, not just `localhost`.
-   Displays the host IP address and port in the teacher UI through a
    safe IPC/API contract.
-   Provides a clear error if no usable network interface exists.
-   Stops cleanly when the teacher ends the session or exits.
-   Does not require the teacher's laptop to act as a Wi-Fi hotspot.
-   Assumes the dedicated router/access point provides DHCP and Wi-Fi.
-   Does not require internet access.

Do not blindly bind to every interface without considering exposure.
Document which interfaces are available and allow the teacher to select
a suitable LAN interface if necessary.

## 6.2 HTTP API

Create versioned API routes. Suggested logical endpoints:

``` text
GET    /api/v1/health
POST   /api/v1/sessions
GET    /api/v1/sessions/current
POST   /api/v1/sessions/:sessionId/end

POST   /api/v1/sessions/:sessionId/join-requests
GET    /api/v1/sessions/:sessionId/join-requests
POST   /api/v1/join-requests/:requestId/approve
POST   /api/v1/join-requests/:requestId/reject

GET    /api/v1/sessions/:sessionId/participants
POST   /api/v1/participants/:participantId/disconnect

GET    /api/v1/exercises
POST   /api/v1/exercises
POST   /api/v1/exercises/:exerciseId/publish

GET    /api/v1/workspaces/:studentId
GET    /api/v1/workspaces/:studentId/snapshot
POST   /api/v1/submissions
```

These are proposed contracts, not permission to implement every feature
immediately. Keep route handlers thin and move logic into services.

## 6.3 Classroom and session manager

Implement:

-   Create, start, pause if required, and end classroom session.
-   Unique session identifier.
-   Join-code generation and expiration.
-   Session status.
-   Participant tracking.
-   Session shutdown and token invalidation.
-   Recovery behavior if the host application restarts unexpectedly.

## 6.4 Secure joining and admission

The workflow must be:

1.  Teacher creates a session.
2.  Host generates a cryptographically random joining code.
3.  Student submits the code, display name, and roll number.
4.  Host validates code, session status, expiration, and rate limits.
5.  Host creates a pending admission request.
6.  Teacher approves or rejects.
7.  On approval, host issues a unique session token.
8.  Student authenticates future API/WebSocket requests with that token.
9.  Teacher can disconnect a student or revoke the token.

Security requirements:

-   Do not use sequential or predictable codes.
-   Do not treat the join code alone as identity proof.
-   Rate-limit incorrect attempts.
-   Validate all payloads with schemas.
-   Enforce role and session authorization on every sensitive action.
-   Restrict student file operations to that student's workspace.
-   Never trust a student-supplied path.
-   Use safe path resolution and prevent path traversal.
-   Keep tokens out of logs.
-   Design token revocation and session expiry from the beginning.
-   Plan encrypted local connections/certificate trust rather than
    assuming a LAN is automatically trusted.

## 6.5 SQLite and persistence

Create a migration-based SQLite database.

Suggested entities:

-   Classroom
-   Session
-   Student
-   SessionParticipant
-   Exercise
-   Workspace
-   WorkspaceFile metadata
-   Submission
-   AuditEvent

Store workspace files and snapshots in the host's application-data
directory. SQLite should store metadata and references/hashes rather
than repeatedly storing large file blobs.

Use transactions for admission, session changes, and submission records.
Handle database errors without crashing the server.

## 6.6 WebSocket gateway

Use WebSocket for:

-   Student presence and connection status.
-   Join/admission status notifications.
-   Teacher announcements.
-   Exercise publication.
-   Editor permission changes.
-   Workspace synchronization messages.
-   Submission status.
-   Reconnection and recovery notifications.

Every message must include a validated event type and payload.
Authenticate the connection before allowing classroom events. Authorize
each event by role, session, and participant.

Set reasonable payload limits, handle backpressure, and avoid
broadcasting every student's full workspace to all other students.

## 6.7 Workspace service and Yjs boundary

Provide a backend service interface for document/workspace
synchronization. Do not tightly couple the whole server to a specific
editor.

The service should support:

-   Workspace ownership by student.
-   Multiple files per workspace.
-   Document update messages.
-   Persistence/snapshots.
-   Reconnection and state recovery.
-   Teacher read-only monitoring access.
-   Explicit permission checks.

Yjs is intended for concurrent document editing. In the classroom's
individual-workspace model, each student's document is primarily edited
by that student; the teacher can monitor it. Do not add unnecessary
shared editing complexity to every workflow.

------------------------------------------------------------------------

# 7. Shared contracts --- publish these before teammates integrate

Create TypeScript types and runtime schemas in `packages/contracts`.
Ishita and Kalyani must import these types rather than inventing their
own.

At minimum define:

``` ts
type UserRole = "teacher" | "student";

type SessionStatus =
  | "created"
  | "active"
  | "paused"
  | "ended";

type AdmissionStatus =
  | "pending"
  | "approved"
  | "rejected";

interface HostConnectionInfo {
  host: string;
  port: number;
  protocol: "http" | "https";
}

interface JoinRequestInput {
  sessionCode: string;
  displayName: string;
  rollNumber: string;
}

interface JoinRequest {
  id: string;
  displayName: string;
  rollNumber: string;
  requestedAt: string;
  status: AdmissionStatus;
}

interface Participant {
  id: string;
  displayName: string;
  rollNumber: string;
  status: "connected" | "disconnected";
  joinedAt: string;
}

interface AuthSession {
  participantId: string;
  sessionId: string;
  token: string;
  role: UserRole;
}

interface ClassroomExercise {
  id: string;
  title: string;
  instructions: string;
  language: "python" | "java";
  starterFiles: Array<{
    path: string;
    content: string;
  }>;
}

interface SubmissionInput {
  exerciseId: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}
```

These are initial shapes. You may refine them, but announce breaking
changes and update the contracts documentation before teammates consume
them.

Define WebSocket event names and payload schemas centrally. Do not let
the frontend use arbitrary string event names.

------------------------------------------------------------------------

# 8. Electron security and IPC

-   Enable `contextIsolation`.
-   Disable `nodeIntegration` in renderer.
-   Enable renderer sandbox.
-   Use a narrow preload API with `contextBridge`.
-   Expose only required methods such as `getHostInfo`, `startHost`,
    `stopHost`, and approved event subscriptions.
-   Validate IPC input in the main process.
-   Never expose unrestricted filesystem, process, shell, or network
    methods to renderer code.
-   Do not execute student code in the privileged Electron main process.

------------------------------------------------------------------------

# 9. Integration responsibilities

You are responsible for keeping the app runnable as teammates merge
their work.

-   Maintain the main application entry points and route registration.
-   Provide stable API/client SDK functions to the frontend owners.
-   Integrate Ishita's teacher screens and Kalyani's student/editor
    screens.
-   Keep a mock/demo mode available so UI development can continue
    before backend features are complete.
-   Do not merge unfinished work directly to `main`.
-   Review PRs for contract compatibility, security, type errors, and
    build status.
-   Run the full application after each integration.
-   Maintain `docs/integration-status.md`.

------------------------------------------------------------------------

# 10. GitHub workflow --- mandatory

Use these branches:

``` text
main
develop
feature/kalash-host-foundation
feature/kalash-session-auth
feature/kalash-websocket
feature/kalash-storage
```

Recommended workflow:

1.  `main` contains stable, demonstrable code.
2.  Feature work branches from `develop`.
3.  Push small, focused commits.
4.  Open a PR into `develop`.
5.  Run typecheck, lint, tests, and build before merge.
6.  At integration checkpoints, merge `develop` into `main`.
7.  Never force-push shared branches.
8.  Never commit `.env`, tokens, certificates/private keys, runtime
    build caches, or `node_modules`.
9.  Avoid changing root dependencies while teammates are working;
    coordinate such changes first.
10. Pull/rebase the latest `develop` before beginning a new task.

Commit examples:

``` text
feat(host): start local classroom server
feat(auth): add teacher-approved admission
feat(session): add classroom lifecycle
feat(ws): add authenticated event gateway
feat(storage): persist sessions in sqlite
test(host): add multi-client integration test
```

------------------------------------------------------------------------

# 11. Acceptance criteria

Your work is complete when:

-   Teacher can start and stop the local host server from the desktop
    app.
-   Host address and port are displayed.
-   A student can submit a join request using a valid code.
-   Teacher can approve/reject the request.
-   Only approved students can access classroom resources.
-   Tokens can be revoked and sessions expire.
-   Host stores classroom/session data in SQLite.
-   WebSocket connections authenticate and enforce permissions.
-   Student workspaces are isolated by participant.
-   A student can reconnect without corrupting saved state.
-   The app works on a LAN with internet disconnected.
-   The project builds and runs using the documented commands.

Do not claim 30-client readiness until load testing with 30
real/simulated clients has been completed and results recorded.

------------------------------------------------------------------------

# 12. Instructions to your coding assistant

You are acting as a senior Electron/Node.js engineer on a three-person
team.

Before coding: 1. Inspect the existing repository and current branch. 2.
Read the architecture and shared contracts. 3. Confirm which files you
own. 4. Do not rewrite or regenerate the entire project. 5. Do not
overwrite teammates' work. 6. Propose a short implementation plan and
list the files you intend to create/change.

While coding: - Use TypeScript strictly. - Prefer small services and
clear interfaces. - Add validation, error handling, and tests. - Keep
all local-first functionality independent of external APIs/CDNs. - Do
not add cloud services or AI features to the core host. - Do not execute
student code on the host. - Keep the application runnable after each
milestone.

At completion: - List files changed. - Explain how to run and test your
work. - State what is implemented and what is mocked/not implemented. -
Mention any contract changes. - Do not claim a feature works unless you
have run it.
