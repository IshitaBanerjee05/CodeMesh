# CodeMesh --- Individual Development Brief

## Owner: Kalyani

### Role: Student Client, Code Editor, Workspaces & Local Execution

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

The teacher can distribute starter code and instructions, monitor
student work, lock or unlock editing, inspect a selected student's
workspace, and collect submissions. Students edit and execute code on
their own computers.

The core classroom session must work without internet. The router
provides connectivity; the teacher's laptop runs the host server. Each
student's computer executes that student's code locally.

## 2. Your ownership

You own the **student-facing client, editor, workspace and execution
experience**:

-   Student join screen and admission status UI.
-   Student classroom dashboard.
-   Student workspace and file explorer.
-   Monaco Editor integration.
-   Local workspace cache/save/recovery.
-   Python execution integration using Pyodide.
-   Java compilation/execution integration using TeaVM/teavm-javac,
    within tested compatibility.
-   Output console and execution controls.
-   Student-side WebSocket/API client integration through Kalash's SDK.
-   Student UI and editor tests.
-   Student-side offline runtime packaging/asset loading coordination.

You do **not** own the host server, session/authentication
implementation, SQLite database, Electron main process, or teacher
dashboard.

------------------------------------------------------------------------

# 3. Fixed technology decisions

Use the agreed stack:

-   Electron.js desktop shell
-   React.js + TypeScript
-   Monaco Editor
-   Tailwind CSS
-   WebSocket client through Kalash's client SDK or agreed interface
-   Yjs for document synchronization where required
-   Pyodide for Python
-   TeaVM / teavm-javac for supported Java execution
-   Web Workers for execution tasks where feasible

Do not introduce a competing editor, runtime framework, or second
synchronization system without team approval.

------------------------------------------------------------------------

# 4. Repository ownership and folder boundaries

Suggested shared repository structure:

``` text
codemesh/
├── apps/
│   └── desktop/
│       └── src/
│           └── renderer/
│               ├── teacher/          # Ishita owns
│               ├── student/          # YOU OWN
│               └── shared/           # Coordinate before changing
├── packages/
│   ├── contracts/                    # Kalash owns
│   ├── client-sdk/                   # Kalash owns
│   ├── editor/                       # YOU OWN
│   ├── ui/                           # Ishita owns
│   └── host-server/                  # Kalash owns
└── docs/
```

### Ownership rules

-   You may edit `apps/desktop/src/renderer/student/**`,
    `packages/editor/**`, and student/editor-specific tests/docs.
-   Ishita owns `apps/desktop/src/renderer/teacher/**` and
    `packages/ui/**`.
-   Kalash owns Electron main/preload, contracts, client SDK, host
    server, root configuration, and integration tests.
-   Do not change shared contracts or backend APIs without discussing
    with Kalash.
-   Do not edit teacher-owned files to make student screens work.
-   Do not change root package manifests/build configuration without
    Kalash's approval.
-   Coordinate shared visual components with Ishita.

------------------------------------------------------------------------

# 5. Student application experience

Suggested navigation:

``` text
CodeMesh Student
├── Join Classroom
├── Waiting for Approval
└── Active Classroom
    ├── Instructions
    ├── Workspace
    └── Submission
```

## 5.1 Join classroom screen

Provide: - Host address or QR-code entry path. - Session joining code. -
Student display name. - University roll number. - Join/request admission
action.

Behavior: - Validate required fields locally for usability. - Send the
request to the host using the agreed client SDK/API. - Display
pending/approved/rejected states from the server. - Show connection
errors and retry options. - Do not create a local authenticated session
before host approval.

## 5.2 Waiting for approval

Show: - Classroom name if available. - Student name. -
Waiting-for-teacher-approval status. - Connection status. - Cancel/retry
option if supported.

Do not allow access to workspace files or classroom content while
admission is pending.

## 5.3 Student classroom dashboard

Display: - Classroom/session name. - Teacher instructions and
announcements. - Current exercise and selected language. - Workspace
status. - Submission status. - Connection status.

## 5.4 Individual workspace

Each student must have an individual workspace. Do not implement one
shared classroom document as the default.

Required features: - Monaco Editor. - File explorer. - Create, rename,
and delete files. - Open multiple files. - Starter code from the
teacher. - Auto-save/local recovery. - Workspace synchronization to
host. - Read-only/locked state when teacher locks the editor. - Clear
indication of unsaved or unsynchronized changes.

Suggested initial file structure:

``` text
packages/editor/
├── components/
│   ├── CodeEditor.tsx
│   ├── FileExplorer.tsx
│   ├── EditorTabs.tsx
│   ├── OutputConsole.tsx
│   └── RunControls.tsx
├── workspace/
│   ├── WorkspaceProvider.tsx
│   ├── workspaceStore.ts
│   ├── fileOperations.ts
│   └── recovery.ts
├── execution/
│   ├── ExecutionManager.ts
│   ├── python/
│   ├── java/
│   └── workers/
└── index.ts
```

You may adjust internal structure, but keep it inside your ownership
area.

------------------------------------------------------------------------

# 6. Monaco Editor integration

Use Monaco Editor as the code editing component.

Requirements: - Syntax highlighting for Python and Java. - Multiple file
tabs. - File selection from explorer. - Editor read-only mode when
locked by teacher. - Theme and font settings with sensible defaults. -
Change events connected to workspace state. - Avoid recreating the
editor on every React render. - Dispose editor models/listeners
correctly. - Do not put all editor logic into one huge React component.

For teacher monitoring, provide a reusable read-only editor/viewer
component or a documented API that Ishita can consume. Coordinate the
interface before exposing it.

------------------------------------------------------------------------

# 7. Workspace and synchronization model

Each student has a separate workspace:

``` text
Session
├── Student A
│   ├── main.py
│   └── notes.txt
├── Student B
│   ├── Main.java
│   └── Helper.java
└── Student C
    └── main.py
```

Responsibilities: - Maintain a local working copy/cache. - Send
document/file changes to host through the agreed client SDK. - Receive
teacher-published starter files and announcements. - Recover from
temporary disconnection. - Avoid losing local edits while
reconnecting. - Display sync state to the student. - Enforce
server-provided read-only/locked permissions in the UI.

Use Yjs where concurrent editing of the same document is required. Do
not invent a separate OT/CRDT algorithm. For the initial
individual-workspace flow, keep the sync layer simple and make sure the
teacher can receive/view the student's latest state.

### Important starter-code behavior

When the teacher publishes a new starter-code version: - Receive a
version identifier. - Preserve student work. - Do not silently overwrite
modified files. - Show a clear update/merge/replace choice if the
existing workspace has changed. - Record which starter version the
student began from.

------------------------------------------------------------------------

# 8. Local code execution

This is a key CodeMesh feature. Execution must happen on the student's
computer, not on the teacher's host.

## 8.1 Execution architecture

``` mermaid
flowchart TB
    E["Monaco Editor"]
    M["Execution Manager"]
    W["Web Worker"]
    PY["Pyodide Runtime<br/>Python"]
    JV["TeaVM / teavm-javac<br/>Java"]
    O["Output Console"]
    E --> M
    M --> W
    W --> PY
    W --> JV
    PY --> O
    JV --> O
```

## 8.2 Python with Pyodide

The team already has a prototype demonstrating offline Python execution
when the host serves the runtime assets locally.

Implement: - Load Pyodide from packaged/local assets, not a public
CDN. - Verify runtime assets are available before enabling Run. -
Initialize the runtime once where appropriate. - Execute code away from
the UI thread using a Web Worker if feasible. - Capture stdout, stderr,
exceptions, and return status. - Add a Run button and Stop/Reset
behavior where supported. - Handle runtime initialization errors
clearly. - Do not download Python packages from the internet during an
offline classroom session.

Do not promise compatibility with every native Python package. Document
WebAssembly/Pyodide limitations.

## 8.3 Java with TeaVM

The project has explored `teavm-javac` for browser-side Java compilation
and TeaVM execution.

Implement incrementally: 1. Load compiler/runtime assets from local
packaged/hosted files. 2. Accept Java source files from the workspace.
3. Compile supported source code. 4. Generate/execute the supported
WebAssembly output. 5. Capture program output and errors. 6. Display
output in the CodeMesh console, not only in developer tools. 7. Run
compilation/execution in a worker where feasible.

Define and test the supported Java subset. Do not claim full Java SE/JVM
compatibility. Defer Swing/AWT, JNI, arbitrary native libraries, and
unsupported build systems.

## 8.4 Execution safety

WebAssembly and Web Workers are not a complete security boundary by
themselves.

-   Apply execution timeouts and cancellation.
-   Limit output size.
-   Prevent runaway output from freezing the UI.
-   Do not expose Electron Node.js APIs to code being executed.
-   Keep code execution away from Electron's privileged main process.
-   Test infinite loops, memory-heavy code, invalid source, and repeated
    runs.
-   Provide clear error messages.
-   Do not send arbitrary student source to the teacher host for
    execution.

------------------------------------------------------------------------

# 9. Output console

Create a console with: - Standard output. - Standard error. -
Compile/runtime errors. - Clear console action. -
Running/completed/failed status. - Execution duration if available. -
Stop action if the runtime supports cancellation.

The console should capture output programmatically. Do not rely on
`console.log` in DevTools as the final output mechanism.

------------------------------------------------------------------------

# 10. Backend integration contract

Kalash owns the backend and shared contracts. Use the types in
`packages/contracts` and methods from `packages/client-sdk`.

Conceptual operations:

``` ts
requestToJoin(input)
getAdmissionStatus(requestId)
getClassroomInfo()
getCurrentExercise()
getWorkspace()
saveWorkspaceUpdate(update)
getWorkspaceSnapshot()
submitSolution(input)
subscribeToClassroomEvents(handler)
```

Use the actual exported method names once Kalash publishes them.

Rules: - Do not hardcode host IP or port. - Do not invent your own
authentication mechanism. - Do not store tokens in insecure persistent
storage without agreement. - Do not bypass host permissions. - Do not
assume a student is approved based only on a local flag. - Treat server
responses as authoritative. - Handle host disconnects and reconnects. -
Keep offline runtime assets separate from classroom network connection
state.

If an API or event is missing, create a concise interface request for
Kalash rather than adding a parallel backend implementation.

------------------------------------------------------------------------

# 11. GitHub workflow --- mandatory

Use branches such as:

``` text
feature/kalyani-student-join
feature/kalyani-workspace
feature/kalyani-monaco
feature/kalyani-python-runtime
feature/kalyani-java-runtime
```

Workflow: 1. Pull latest `develop`. 2. Create a focused feature branch.
3. Work only in your owned folders. 4. Commit small, logically grouped
changes. 5. Push and open a PR into `develop`. 6. Ask Kalash to review
API/contract dependencies. 7. Coordinate shared visual components with
Ishita. 8. Do not merge directly to `main`. 9. Never force-push shared
branches. 10. Do not commit runtime caches, downloaded compiler binaries
unless the team explicitly decides to version them, `node_modules`,
local databases, or secrets. 11. Document how runtime assets are
downloaded, packaged, versioned, and served offline.

Commit examples:

``` text
feat(student): add classroom join flow
feat(editor): integrate monaco editor
feat(workspace): add local workspace persistence
feat(python): add offline pyodide execution
feat(java): bridge teavm output to console
test(editor): add workspace and execution tests
```

------------------------------------------------------------------------

# 12. Acceptance criteria

Your work is complete when:

-   Student can enter host details, session code, name, and roll number.
-   Student sees pending approval and cannot access workspace before
    approval.
-   Approved student can open their own workspace.
-   Monaco supports the initial Python and Java editing experience.
-   File operations work within the student's workspace.
-   Teacher lock state makes the editor read-only.
-   Workspace changes synchronize to the host.
-   Temporary disconnection does not silently discard local work.
-   Python runs offline using local Pyodide assets.
-   Supported Java code compiles/executes through the agreed TeaVM
    pipeline.
-   stdout/stderr/errors appear in the CodeMesh console.
-   Student code cannot access Electron's privileged APIs.
-   Student UI works without internet once required assets are
    packaged/available locally.
-   Typecheck, lint, tests, and application build pass.

------------------------------------------------------------------------

# 13. Instructions to your coding assistant

You are acting as a senior React/TypeScript/editor engineer on a
three-person team.

Before coding: 1. Inspect the repository and current branch. 2. Read
`docs/architecture.md` and `docs/api-contracts.md`. 3. Confirm your
folder ownership. 4. Inspect existing prototypes and dependencies before
replacing anything. 5. Propose an implementation plan and list files to
create/change. 6. Do not scaffold a separate application or rewrite the
host.

While coding: - Use TypeScript strictly. - Keep student UI in the
student-owned folder. - Keep editor/runtime implementation in
`packages/editor`. - Import shared contracts; do not duplicate them. -
Keep execution local to the student computer. - Keep offline runtime
assets independent of CDN access. - Use workers where feasible and
protect the UI from long-running tasks. - Add tests for workspace
behavior and execution output. - Do not add cloud services or AI
features to the core.

At completion: - List files changed. - Explain how to run the student
client. - State which languages/features are truly working and which are
mocked. - Include a short test program and expected output for Python
and Java. - Mention any API/contract changes needed from Kalash. - Do
not claim a feature works unless it has been run.
