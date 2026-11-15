# CodeMesh --- Architecture and Component Specification

**Status:** Proposed baseline architecture\
**Primary use case:** Teacher-led programming classroom\
**Target deployment:** One teacher/host computer, one dedicated Wi-Fi
router/access point, and approximately 30 student computers\
**Connectivity:** Local Wi-Fi/LAN; internet is not required for core
classroom operation

## 1. Project overview

CodeMesh is a desktop-based programming classroom platform. The teacher
creates a classroom session from the host application. Students connect
to the same local network, enter a session code, and request admission.
Once approved, each student receives an individual coding workspace.

The teacher can distribute starter code and instructions, monitor
student work, lock or unlock editing, inspect a selected student's
workspace, and collect submissions. Students edit and execute code on
their own computers.

### Design principles

1.  **Local-first:** Core classroom features work without internet.
2.  **Teacher-managed access:** A session code is required, and the
    teacher approves admission.
3.  **Individual workspaces:** Students work independently by default.
4.  **Host coordinates; clients compute:** The teacher's computer
    manages sessions and stores classroom data; student computers
    execute their own programs.
5.  **Hardware independence:** A dedicated router/access point provides
    Wi-Fi; the teacher's laptop Wi-Fi adapter is not the classroom
    access point.
6.  **Incremental delivery:** First build joining, individual
    workspaces, and monitoring; add advanced collaboration and
    assessment later.

## 2. Finalized physical network architecture

``` mermaid
flowchart TB
    T["Teacher laptop<br/>CodeMesh Host Application"]
    R["Dedicated Wi-Fi Router / Access Point<br/>DHCP + Local Wi-Fi"]
    S1["Student laptop 1<br/>CodeMesh Client"]
    S2["Student laptop 2<br/>CodeMesh Client"]
    S3["Student laptop 3<br/>CodeMesh Client"]
    SN["Student laptop 30<br/>CodeMesh Client"]
    T <-->|"Ethernet"| R
    R <-->|"Wi-Fi / LAN"| S1
    R <-->|"Wi-Fi / LAN"| S2
    R <-->|"Wi-Fi / LAN"| S3
    R <-->|"Wi-Fi / LAN"| SN
```

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Dedicated router/access point       Creates the local network, assigns
                                      IP addresses through DHCP, and
                                      connects wireless clients

  Teacher laptop                      Runs the CodeMesh host application,
                                      local API, WebSocket server,
                                      session manager, and classroom
                                      database

  Student laptops                     Run the student application,
                                      editor, local language runtime, and
                                      output console

  Internet/WAN                        Optional; not needed for core local
                                      classroom operation
  -----------------------------------------------------------------------

The router does not run CodeMesh. Its WAN/Internet port can remain
disconnected. The teacher laptop should preferably connect to a LAN port
using Ethernet; student devices connect over Wi-Fi.

### Network configuration

-   Prefer a dual-band Wi-Fi 6 access point with a documented client
    capacity comfortably above the expected class size.
-   Keep host Ethernet and student Wi-Fi interfaces on the same local
    subnet.
-   Keep DHCP enabled on the router.
-   Disable wireless/client/AP isolation if it prevents students from
    reaching the host. Verify LAN-to-LAN communication.
-   Reserve a stable host IP through DHCP reservation, or display the
    current host address in the teacher application.
-   Use a dedicated classroom SSID and strong Wi-Fi password.
-   Test the actual router, room, laptop mix, and expected activity with
    30 devices. Wi-Fi generation or advertised client count alone does
    not guarantee performance.

**Example only:** subnet `192.168.50.0/24`, teacher host
`192.168.50.10`, student addresses assigned by DHCP. Select a subnet
that does not conflict with existing networks.

## 3. Logical system architecture

``` mermaid
flowchart TB
    subgraph HOST["TEACHER HOST COMPUTER"]
        HUI["Teacher UI<br/>Electron + React"]
        API["Local HTTP API<br/>Node.js + Express"]
        AUTH["Admission & Authentication"]
        CLASS["Classroom / Session Manager"]
        PERM["Role & Permission Manager"]
        WS["WebSocket Gateway"]
        DOCS["Workspace Sync Service<br/>Yjs"]
        MON["Teacher Monitoring Service"]
        SUB["Exercise & Submission Service"]
        DB[("SQLite Database")]
        FS[("Local Workspace / Submission Files")]
        HUI --> API
        API --> AUTH
        API --> CLASS
        API --> PERM
        CLASS <--> WS
        PERM --> WS
        WS <--> DOCS
        WS --> MON
        API --> SUB
        AUTH --> DB
        CLASS --> DB
        SUB --> DB
        DOCS --> FS
        SUB --> FS
    end
    ROUTER["Dedicated Router / Access Point"]
    ROUTER <--> HOST
    subgraph CLIENT["EACH STUDENT COMPUTER"]
        SUI["Student UI<br/>Electron + React"]
        EDITOR["Monaco Editor"]
        CLIENTWS["API + WebSocket Client"]
        EXEC["Local Execution Manager"]
        PY["Pyodide — Python"]
        JAVA["TeaVM — Java"]
        CACHE["Local Workspace Cache"]
        SUI --> EDITOR
        SUI --> CLIENTWS
        EDITOR <--> CACHE
        EDITOR --> EXEC
        EXEC --> PY
        EXEC --> JAVA
        CLIENTWS <--> CACHE
    end
    ROUTER <--> CLIENT
```

This depicts one student client; the same architecture is repeated on
each student computer.

### Communication model

-   **HTTP/REST:** joining, classroom metadata, exercise details,
    workspace metadata, and submissions.
-   **WebSocket:** live events, presence, workspace updates, teacher
    broadcasts, and status changes.
-   The host is authoritative for membership, permissions, session
    state, exercises, and submissions.
-   Student code executes locally. The host receives relevant workspace
    updates and submissions, not arbitrary programs to execute.

## 4. Selected technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Desktop shell           Electron.js             Windows desktop
                                                  packaging and
                                                  application lifecycle

  UI                      React.js + TypeScript   Teacher and student
                                                  interfaces

  Styling                 Tailwind CSS            Desktop UI styling

  Code editor             Monaco Editor           Editing, syntax
                                                  highlighting, editor
                                                  models

  Host runtime            Node.js                 Local host services

  HTTP API                Express.js              Classroom and workspace
                                                  endpoints

  Real-time transport     WebSocket (`ws`)        Bidirectional classroom
                                                  events

  Document                Yjs (CRDT)              Concurrent document
  synchronization                                 updates where required

  Database                SQLite                  Classroom, user,
                                                  session, exercise, and
                                                  submission metadata

  File storage            Local file system       Workspace files,
                                                  snapshots, and
                                                  submissions

  Python execution        Pyodide                 Python through
                                                  WebAssembly

  Java execution          TeaVM / teavm-javac     Supported Java
                                                  compilation/execution
                                                  through WebAssembly

  Version control         Git                     Optional project
                                                  history and export

  Testing                 Vitest/Jest,            Unit, integration, and
                          Playwright, Node test   end-to-end testing
                          tools                   
  -----------------------------------------------------------------------

### Why Electron?

Electron reuses the team's existing JavaScript/TypeScript and Node.js
prototype work. One codebase can provide Teacher and Student modes.
Tauri is a possible later alternative for a smaller native footprint,
but it introduces a Rust backend; Electron is the more direct first
implementation.

### Electron security baseline

-   Enable `contextIsolation`.
-   Disable `nodeIntegration` in renderer processes.
-   Enable the renderer sandbox.
-   Expose only narrow, validated APIs through preload and
    `contextBridge`.
-   Validate IPC messages and file paths.
-   Keep host-server code out of the renderer.
-   Never expose the host's Node.js APIs or file system to
    student-submitted code.

## 5. Host application components

The teacher application is the classroom control centre.

### Teacher interface

1.  **Teacher dashboard:** create, start, pause, and end sessions; show
    pending, admitted, and disconnected students.
2.  **Classroom creation:** set classroom name/topic; generate a session
    ID and join code; show host IP, port, and joining instructions;
    optionally display a QR code.
3.  **Admission dashboard:** view pending requests with student name and
    roll number; approve/reject; disconnect participants; revoke tokens.
4.  **Student monitor:** show connection/activity status; open a
    selected student's latest synchronized code in a read-only view;
    filter by status or submission.
5.  **Exercise panel:** create/select exercises; publish instructions,
    starter files, and test cases; set submission status/deadline;
    broadcast announcements.
6.  **Teacher controls:** lock/unlock an editor; broadcast starter code;
    select a student's solution for projection; end the session and
    invalidate its join code.

### Host backend services

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Local HTTP server                   Serves API routes and, if needed,
                                      application/runtime assets

  Classroom manager                   Creates and tracks classrooms and
                                      sessions

  Join-code service                   Generates, validates, expires, and
                                      rotates join codes

  Admission service                   Tracks pending requests and teacher
                                      approval

  Authentication service              Issues, validates, expires, and
                                      revokes session tokens

  Role/permission service             Enforces teacher/student
                                      permissions

  WebSocket gateway                   Manages live client connections and
                                      event routing

  Workspace service                   Tracks each student's files and
                                      workspace state

  Synchronization service             Applies and distributes document
                                      updates

  Monitoring service                  Maintains presence and latest
                                      student status

  Exercise service                    Stores instructions, starter code,
                                      and test-case metadata

  Submission service                  Accepts submissions and stores
                                      results

  Persistence service                 Reads/writes SQLite records and
                                      local files

  Network status service              Detects and displays host network
                                      address/status
  -----------------------------------------------------------------------

### Host storage layout

``` text
CodeMeshData/
├── codemesh.db
├── classrooms/
│   └── <classroom-id>/
│       └── sessions/
│           └── <session-id>/
│               ├── exercises/
│               ├── student-workspaces/
│               │   ├── <student-id>/
│               │   └── ...
│               ├── submissions/
│               └── snapshots/
└── logs/
```

Use Electron's application data directory for persistent data, not an
arbitrary working directory.

## 6. Student application components

### Student interface

1.  **Join screen:** enter host address or scan QR; enter classroom
    code, name, and roll number; request admission.
2.  **Admission status:** show waiting/approved/rejected state and
    useful connection errors.
3.  **Classroom dashboard:** show teacher instructions, announcements,
    current exercise, and submission status.
4.  **Individual workspace:** Monaco Editor, file explorer,
    create/rename/delete files, starter code, auto-save, and local
    recovery.
5.  **Execution panel:** run supported Python or Java locally; show
    stdout, stderr, and errors; provide stop/reset where supported.
6.  **Submission panel:** submit the solution and display
    acknowledgement/result; enforce teacher permissions.

### Student-side services

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Connection manager                  Connects to host and handles
                                      reconnection

  Authentication client               Stores and presents the session
                                      token securely

  Workspace manager                   Manages local files and editor
                                      state

  Monaco integration                  Editor models and language
                                      configuration

  WebSocket client                    Sends/receives classroom events and
                                      updates

  Sync manager                        Tracks pending updates and
                                      reconciles after reconnect

  Runtime manager                     Loads required local language
                                      runtime

  Execution worker                    Runs code away from the UI thread

  Output console                      Displays stdout, stderr, and errors

  Submission client                   Sends solution and receives
                                      acknowledgement
  -----------------------------------------------------------------------

## 7. Joining and security architecture

The join code is an admission mechanism, not proof of identity by
itself. Combine a high-entropy session code with teacher approval and a
per-student session token.

``` mermaid
sequenceDiagram
    participant Student
    participant Host as Teacher Host
    participant Teacher
    Teacher->>Host: Create classroom session
    Host->>Host: Generate random join code
    Host-->>Teacher: Show code and host address
    Student->>Host: Submit code and student details
    Host->>Host: Validate session, expiry, and rate limits
    Host->>Host: Create pending request
    Host-->>Teacher: Notify pending request
    Teacher->>Host: Approve student
    Host->>Host: Create student session token
    Host-->>Student: Admission approved + token
    Student->>Host: Authenticate connection
    Host-->>Student: Classroom configuration and workspace
```

### Security requirements

-   Generate join codes with a cryptographically secure random generator
    and sufficient entropy; avoid sequential or easily guessed codes.
-   Expire the code when the session ends and allow teacher rotation.
-   Rate-limit invalid join attempts and apply temporary
    backoff/lockout.
-   Require teacher approval for each new participant in the initial
    version.
-   Issue a unique, unguessable token to each approved student; support
    revocation.
-   Store hashes of long-lived tokens where practical.
-   Enforce authorization on every sensitive API and WebSocket event.
-   Validate message schemas, payload sizes, and file paths.
-   Restrict students to their own workspace unless the teacher
    explicitly shares another.
-   Student-provided names and roll numbers are not proof of identity. A
    future class roster or institutional authentication integration can
    strengthen identity verification.
-   Use encrypted connections where feasible. Plan certificate
    provisioning or a controlled trust/pairing mechanism; do not assume
    the LAN is inherently trusted.
-   Audit admission, rejection, disconnection, permission changes, and
    submissions.

### Roles

  Role                  Permissions
  --------------------- --------------------------------------------
  Teacher               Full classroom and session control
  Student               Own workspace, local execution, submission
  Pending participant   Can await admission; no workspace access

## 8. Workspace synchronization model

Each student has a separate workspace by default:

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

-   The host persists the classroom copy of each workspace.
-   Students keep a local working copy/cache to protect against
    temporary network interruptions.
-   Yjs can synchronize each student's document and resolve concurrent
    edits to that document.
-   The teacher's monitoring view subscribes read-only.
-   Do not broadcast every student's complete workspace to every other
    student.

### Teacher starter-code broadcast

1.  Host stores a versioned starter workspace.
2.  Host sends an exercise/broadcast event.
3.  Each student receives the files and version identifier.
4.  The client creates or updates that student's own workspace.
5.  Student changes remain independent.

Do not silently overwrite student work when starter code changes.
Preserve existing work and make update behavior explicit.

## 9. Code execution architecture

``` mermaid
flowchart TB
    E["Monaco Editor"]
    M["Student Execution Manager"]
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

### Python

-   Use Pyodide to run Python through WebAssembly.
-   Package or locally serve runtime files so no CDN or internet is
    needed.
-   Run code in a Web Worker to keep the UI responsive.
-   Capture output and errors for the CodeMesh console.

### Java

-   Use the TeaVM / `teavm-javac` browser compilation approach already
    explored in the prototype.
-   Package or locally serve compiler and runtime assets.
-   Define a supported Java subset for the first release.
-   Test language and library compatibility before advertising broad
    Java support.
-   Capture program output for the CodeMesh console.

### Execution safety and limitations

WebAssembly and Web Workers improve isolation and responsiveness, but
are not a complete security boundary by themselves.

-   Apply execution timeouts and cancellation.
-   Limit output size and prevent runaway output from exhausting memory.
-   Keep execution away from Electron's privileged main process.
-   Do not expose Node.js APIs to student code.
-   Test infinite loops, memory-heavy programs, and malformed inputs.
-   Document unsupported libraries and runtime limitations.
-   Do not execute student code on the teacher host in the initial
    architecture.

## 10. Database and data model

SQLite is suitable for the first release because one host computer owns
classroom data.

  -----------------------------------------------------------------------
  Entity                              Important fields
  ----------------------------------- -----------------------------------
  Classroom                           `id`, `name`, `created_at`

  Session                             `id`, `classroom_id`,
                                      `join_code_hash`, `status`,
                                      `expires_at`

  Student                             `id`, `display_name`,
                                      `roll_number`, `created_at`

  SessionParticipant                  `session_id`, `student_id`, `role`,
                                      `admission_status`, `token_hash`,
                                      `connected_at`

  Exercise                            `id`, `session_id`, `title`,
                                      `instructions`, `starter_version`

  Workspace                           `id`, `session_id`, `student_id`,
                                      `last_saved_at`, `version`

  WorkspaceFile                       `id`, `workspace_id`,
                                      `relative_path`, `content_hash`,
                                      `updated_at`

  Submission                          `id`, `exercise_id`, `student_id`,
                                      `status`, `submitted_at`,
                                      `result_summary`

  AuditEvent                          `id`, `session_id`, `actor_id`,
                                      `event_type`, `created_at`
  -----------------------------------------------------------------------

Store metadata and file references in SQLite. Large code contents and
snapshots should generally live in workspace file storage rather than
repeatedly writing large blobs into metadata rows.

## 11. Network and capacity for 30 students

  Workload                          Primary device
  --------------------------------- -------------------------------
  Wi-Fi connectivity and DHCP       Dedicated router/access point
  Classroom session and admission   Teacher host
  WebSocket connections             Teacher host
  Workspace persistence             Teacher host
  Code editing and rendering        Each student computer
  Python execution                  Each student computer
  Java compilation/execution        Each student computer
  Teacher monitoring                Teacher host

### Performance recommendations

-   Connect the teacher host to the router using Gigabit Ethernet where
    available.
-   Prefer an access point with enough capacity for the class, then
    verify real-world throughput and client limits.
-   Keep host and students on the same LAN/subnet.
-   Avoid unnecessary full-document broadcasts.
-   Batch/debounce persistence writes.
-   Send efficient monitoring updates; do not repeatedly transmit
    unchanged workspaces.
-   Set WebSocket message-size limits and handle backpressure.
-   Package or locally serve runtime assets.
-   Test 30 clients performing realistic simultaneous typing,
    reconnecting, and submitting.

**Thirty connected devices is a target to validate, not a performance
guarantee.** Actual capacity depends on the access point, interference,
room layout, client devices, and message patterns.

## 12. Proposed API and WebSocket event groups

These are logical groups; exact routes and payload schemas should be
finalized during API design.

### HTTP API groups

  Group          Example operations
  -------------- ----------------------------------------------------------
  Session        Create session, get status, end session
  Admission      Request to join, list pending requests, approve/reject
  Participants   List students, disconnect, revoke token
  Exercises      Create exercise, publish instructions, retrieve exercise
  Workspaces     Retrieve workspace metadata, request snapshot
  Submissions    Submit solution, retrieve status
  Health         Host status, network status, application version

### WebSocket event groups

  -----------------------------------------------------------------------
  Direction                           Event examples
  ----------------------------------- -----------------------------------
  Student → Host                      `join_request`, `presence_update`,
                                      `document_update`,
                                      `submission_started`

  Host → Student                      `admission_result`,
                                      `session_state`,
                                      `exercise_published`,
                                      `editor_permission_changed`

  Teacher → Host                      `broadcast_starter`, `lock_editor`,
                                      `unlock_editor`,
                                      `select_student_view`

  Host → Teacher                      `student_requested_join`,
                                      `student_connected`,
                                      `student_disconnected`,
                                      `workspace_activity`,
                                      `submission_received`
  -----------------------------------------------------------------------

Every event must be authenticated, authorized, schema-validated, and
scoped to the correct session and participant.

## 13. Deployment and operating workflow

### Teacher startup

1.  Teacher launches CodeMesh and selects Teacher mode.
2.  Application checks for a usable network interface.
3.  Teacher connects to the dedicated router, preferably through
    Ethernet.
4.  CodeMesh starts the local HTTP API and WebSocket server.
5.  Application displays the host IP and connection port.
6.  Teacher creates a classroom session.
7.  CodeMesh displays the join code and optional QR code.
8.  Students request to join; teacher approves them.
9.  Teacher starts the lesson.

### Student startup

1.  Student launches CodeMesh and selects Student mode.
2.  Student enters the host address or scans the classroom QR code.
3.  Student enters the session code and identifying details.
4.  Student waits for teacher approval.
5.  After approval, the application receives its session token and
    classroom configuration.
6.  Student opens the assigned exercise and personal workspace.
7.  Student edits and executes code locally.
8.  Workspace updates and submissions synchronize with the host.

### Session shutdown

1.  Teacher ends the session.
2.  Host stops accepting new join requests.
3.  Active clients receive a session-ended event.
4.  Host persists final workspace and submission state.
5.  Join code and session tokens are invalidated.
6.  Host server stops when the teacher exits or chooses to stop it.

## 14. Development phases

### Phase 1 --- Desktop and LAN foundation

-   Convert the working Node.js LAN prototype into Electron.
-   Create Teacher and Student modes.
-   Start/stop the host server from the desktop UI.
-   Connect clients through a dedicated router.
-   Display host address and connection status.

**Milestone:** One teacher host and multiple students connect on a local
network.

### Phase 2 --- Secure classroom joining

-   Generate session codes.
-   Implement join requests and teacher approval.
-   Issue and validate per-student tokens.
-   Add participant lists, rejection, disconnection, and session expiry.

**Milestone:** Only admitted participants can access a classroom.

### Phase 3 --- Individual workspaces

-   Integrate Monaco Editor.
-   Create separate student workspaces.
-   Add file explorer and local save/recovery.
-   Synchronize workspaces to the host.
-   Implement teacher read-only workspace monitoring.

**Milestone:** Teacher can inspect the latest work of each admitted
student.

### Phase 4 --- Classroom controls and execution

-   Add starter-code and instruction broadcasting.
-   Add editor lock/unlock.
-   Integrate local Python execution using Pyodide.
-   Integrate supported Java execution using TeaVM.
-   Add output console and submission flow.

**Milestone:** Teacher can conduct a practical lesson from start to
submission.

### Phase 5 --- Assessment and scale testing

-   Add exercises and test cases.
-   Add automated evaluation where appropriate.
-   Test reconnection and recovery.
-   Load-test with 30 simultaneous clients.
-   Test weak host computers and realistic classroom Wi-Fi.

**Milestone:** A classroom pilot is ready for evaluation.

**Later enhancements:** shared group workspaces, optional AI
hints/explanations, QR joining and network discovery, Git
integration/project export, additional languages, and optional cloud
backup.

## 15. Testing strategy and acceptance criteria

Do not claim 30-student readiness until the system passes a realistic
test.

  -----------------------------------------------------------------------
  Test                                Acceptance target
  ----------------------------------- -----------------------------------
  LAN-only operation                  Teacher and students complete a
                                      session with internet disconnected

  Admission                           Invalid code cannot join

  Approval                            Pending participant has no
                                      workspace access before approval

  Revocation                          Revoked token cannot reconnect

  Workspace separation                One student cannot modify another
                                      student's workspace

  Monitoring                          Teacher can open a student's latest
                                      synchronized workspace

  Offline execution                   Supported Python runtime works
                                      without internet after assets are
                                      installed/served locally

  Reconnection                        Student reconnects and recovers
                                      latest persisted workspace

  Host load                           30 clients connect and perform
                                      representative classroom actions

  Failure handling                    Disconnects and oversized messages
                                      do not corrupt saved work

  Security                            Student code cannot access Electron
                                      main process or host file system
  -----------------------------------------------------------------------

Measure connection success rate, join time, code-update latency, host
CPU/memory, router utilization where measurable, reconnect recovery
time, lost/duplicated updates, and submission success rate.

## 16. Key architecture decisions

  -----------------------------------------------------------------------
  Decision                Selected approach       Reason
  ----------------------- ----------------------- -----------------------
  Desktop framework       Electron                Reuses existing
                                                  JavaScript/Node.js work

  Network provider        Dedicated Wi-Fi         Avoids reliance on
                          router/AP               teacher laptop hotspot
                                                  capacity

  Host placement          Teacher laptop          Local control and data
                                                  ownership

  Student connection      LAN over Wi-Fi          No internet required

  Communication           HTTP + WebSocket        Request/response plus
                                                  real-time events

  Workspace model         Individual by default   Appropriate for
                                                  classroom exercises

  Sync model              Yjs where concurrent    Handles concurrent
                          document editing is     updates
                          needed                  

  Database                SQLite                  Simple local
                                                  persistence for a
                                                  single host

  Code execution          Student-side            Distributes compute and
                          WebAssembly runtimes    avoids executing
                                                  student code on host

  Authentication          Join code + teacher     Layered classroom
                          approval + session      admission
                          token                   

  Initial languages       Python and supported    Builds on existing
                          Java subset             prototypes
  -----------------------------------------------------------------------

## 17. First-release scope boundaries

**Included** - Teacher-hosted classroom session. - Dedicated router/LAN
connectivity. - Secure join request and teacher approval. - Individual
student workspaces. - Monaco-based editor. - Teacher monitoring of
student work. - Starter-code distribution. - Local Python execution. -
Basic Java execution if compatibility testing succeeds. - Save and
submit workflow.

**Deferred** - Full cloud account system. - Video/audio calls. - Full
Git hosting service. - Arbitrary Maven/Gradle Java projects. - Desktop
GUI Java programs. - Every Python package or native extension. -
Advanced AI features. - Large-scale multi-classroom/cloud
administration.

This keeps the first release focused on solving a classroom problem
rather than attempting to reproduce a full IDE, learning-management
system, and cloud platform at once.

## 18. Official technical references

-   Electron: https://www.electronjs.org/docs/latest/
-   Electron security:
    https://www.electronjs.org/docs/latest/tutorial/security
-   React: https://react.dev/
-   TypeScript: https://www.typescriptlang.org/docs/
-   Monaco Editor: https://microsoft.github.io/monaco-editor/
-   Node.js: https://nodejs.org/docs/latest/api/
-   Express: https://expressjs.com/
-   `ws` WebSocket library: https://github.com/websockets/ws
-   Yjs: https://docs.yjs.dev/
-   SQLite: https://www.sqlite.org/docs.html
-   Pyodide: https://pyodide.org/en/stable/
-   TeaVM: https://teavm.org/
-   TeaVM browser Java compiler:
    https://github.com/konsoletyper/teavm-javac

## 19. Final architecture summary

CodeMesh is a local-first desktop classroom platform with a
teacher-hosted server. A dedicated Wi-Fi router/access point provides
local connectivity for approximately 30 student devices. The teacher's
Electron application runs the Node.js/Express API, WebSocket gateway,
admission and session management, SQLite database, and workspace
persistence. Student Electron applications connect over the LAN,
authenticate using a teacher-approved session token, edit individual
workspaces in Monaco, and execute supported code locally through
WebAssembly runtimes. Yjs is used where concurrent document
synchronization is required.

The core system is designed to operate without internet access. Actual
30-client reliability, router capacity, and host performance must be
verified through load testing in a representative classroom.
