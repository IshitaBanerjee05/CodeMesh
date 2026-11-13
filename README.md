# CodeMesh

### A Local-First Collaborative Programming Classroom

CodeMesh is a desktop-based programming classroom platform designed to
help teachers conduct practical coding sessions with students over a
local network. A teacher creates a classroom, shares a secure joining
code, and approves students who request to join. Each admitted student
receives an individual coding workspace, while the teacher can
distribute exercises, monitor progress, and manage the classroom.

CodeMesh is designed to work on a **local Wi-Fi/LAN network without
requiring an internet connection** for its core classroom features.

> **Project status:** Under development. Features and technology choices
> described here represent the proposed architecture; not every feature
> is implemented yet.

------------------------------------------------------------------------

## Table of Contents

-   [Problem We Aim to Solve](#problem-we-aim-to-solve)
-   [Our Solution](#our-solution)
-   [Key Features](#key-features)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [How a Classroom Session Works](#how-a-classroom-session-works)
-   [Repository Structure](#repository-structure)
-   [Getting Started](#getting-started)
-   [Offline-First Design](#offline-first-design)
-   [Security](#security)
-   [Development Roadmap](#development-roadmap)
-   [Team Responsibilities](#team-responsibilities)
-   [Contributing](#contributing)
-   [Limitations and Scope](#limitations-and-scope)
-   [References](#references)

------------------------------------------------------------------------

## Problem We Aim to Solve

Practical programming classes often rely on a teacher demonstrating code
while students follow along on their own computers. Sharing code,
checking individual progress, distributing exercises, and helping
students during a session can become fragmented across messaging tools,
USB drives, online platforms, or separate IDE installations.

Internet-dependent tools may also be unsuitable in classrooms with
unreliable connectivity, restricted networks, or limited bandwidth.
Teachers need a simple way to distribute code and instructions, observe
student work, and manage participation during a practical lesson.

## Our Solution

CodeMesh provides a teacher-managed coding classroom hosted locally on
the teacher's computer.

A dedicated Wi-Fi router or access point connects the teacher and
student computers on the same local network. The teacher's CodeMesh
application runs the classroom server. Students join using a session
code and are admitted by the teacher. Each student works in an
individual code workspace and runs supported programs on their own
computer.

The router provides network connectivity; it does not host the CodeMesh
application. The teacher's laptop does not need to act as a Wi-Fi
hotspot.

## Key Features

### Classroom management

-   Create, start, and end classroom sessions.
-   Generate a unique joining code for each session.
-   Display host connection details for students.
-   View pending join requests and approve or reject participants.
-   View connected and disconnected students.
-   Disconnect participants and revoke access.

### Student workspaces

-   Provide an individual workspace for each student.
-   Edit code using the Monaco Editor.
-   Organize work using a file explorer and editor tabs.
-   Distribute starter code and exercise instructions.
-   Save and synchronize workspace changes with the host.
-   Recover local work after temporary network interruptions.

### Teacher controls and monitoring

-   View student connection and activity status.
-   Open a student's latest synchronized workspace in a read-only
    teacher view.
-   Publish exercises, instructions, and starter files.
-   Lock or unlock student editing.
-   Broadcast classroom announcements.
-   Review submitted work.

### Local code execution

-   Run supported Python programs using Pyodide.
-   Explore supported Java compilation and execution using TeaVM /
    `teavm-javac`.
-   Display standard output, errors, and execution status in the
    application.
-   Execute code on the student's own computer rather than on the
    teacher's host.

### Planned enhancements

-   Exercise test cases and automated evaluation.
-   Shared group workspaces.
-   Optional AI-powered code hints, explanations, and feedback.
-   Git integration and project export.
-   QR-based classroom joining.
-   Additional programming languages.

> Feature availability depends on the development stage. See the
> [Development Roadmap](#development-roadmap).

------------------------------------------------------------------------

## System Architecture

CodeMesh uses a host-client architecture.

-   **Teacher/Host:** Runs the desktop application and local classroom
    server.
-   **Router/Access Point:** Provides the local network and assigns IP
    addresses.
-   **Student/Client:** Connects to the host, edits code, and executes
    programs locally.

``` mermaid
flowchart TB
    T["Teacher Laptop<br/>CodeMesh Host Application"]
    R["Dedicated Wi-Fi Router / Access Point<br/>DHCP + Local Network"]
    S1["Student Laptop 1<br/>CodeMesh Client"]
    S2["Student Laptop 2<br/>CodeMesh Client"]
    S3["Student Laptop 3<br/>CodeMesh Client"]
    SN["Student Laptop N<br/>CodeMesh Client"]

    T <-->|"Ethernet / LAN"| R
    R <-->|"Wi-Fi / LAN"| S1
    R <-->|"Wi-Fi / LAN"| S2
    R <-->|"Wi-Fi / LAN"| S3
    R <-->|"Wi-Fi / LAN"| SN
```

### Logical architecture

``` mermaid
flowchart TB
    subgraph HOST["TEACHER HOST"]
        TUI["Teacher UI<br/>Electron + React"]
        API["HTTP API<br/>Node.js + Express"]
        AUTH["Admission & Authentication"]
        SESSION["Classroom / Session Manager"]
        WS["WebSocket Gateway"]
        DB[("SQLite Database")]
        FILES[("Workspace & Submission Files")]

        TUI --> API
        API --> AUTH
        API --> SESSION
        SESSION <--> WS
        AUTH --> DB
        SESSION --> DB
        WS --> FILES
    end

    NETWORK["Local Wi-Fi / LAN"]
    WS <--> NETWORK

    subgraph STUDENTS["STUDENT CLIENTS"]
        SUI["Student UI<br/>Electron + React"]
        EDITOR["Monaco Editor"]
        EXEC["Local Execution Manager"]
        PY["Pyodide<br/>Python"]
        JAVA["TeaVM<br/>Java"]
        SUI --> EDITOR
        EDITOR --> EXEC
        EXEC --> PY
        EXEC --> JAVA
    end

    NETWORK <--> SUI
```

This is a conceptual architecture. The implementation may split these
responsibilities into additional modules and services.

### Communication

-   **HTTP/REST:** Session creation, joining requests, classroom
    information, exercise details, and submissions.
-   **WebSocket:** Real-time classroom events, presence, workspace
    updates, teacher announcements, and permission changes.
-   **Yjs:** Planned for concurrent document synchronization where
    needed.
-   **SQLite and local files:** Store classroom metadata, session
    records, workspace data, and submissions on the host.

------------------------------------------------------------------------

## Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Desktop framework       Electron.js             Package CodeMesh as a
                                                  desktop application

  Frontend                React.js + TypeScript   Teacher and student
                                                  interfaces

  Styling                 Tailwind CSS            Application styling

  Code editor             Monaco Editor           VS Code-like code
                                                  editing experience

  Backend runtime         Node.js                 Local host services

  HTTP framework          Express.js              REST API

  Real-time communication WebSocket (`ws`)        Live classroom
                                                  communication

  Document                Yjs (CRDT)              Concurrent document
  synchronization                                 synchronization where
                                                  required

  Database                SQLite                  Classroom and session
                                                  metadata

  File storage            Local file system       Workspaces, snapshots,
                                                  and submissions

  Python execution        Pyodide                 Python through
                                                  WebAssembly

  Java execution          TeaVM / `teavm-javac`   Supported Java
                                                  compilation and
                                                  execution

  Testing                 Vitest/Jest, Playwright Unit and application
                                                  testing
  -----------------------------------------------------------------------

The stack is subject to validation during implementation, particularly
the supported Java feature set and offline packaging of language
runtimes.

------------------------------------------------------------------------

## How a Classroom Session Works

1.  The teacher connects their laptop to a dedicated Wi-Fi router,
    preferably using Ethernet.
2.  The teacher opens CodeMesh and creates a classroom session.
3.  CodeMesh starts its local HTTP and WebSocket services.
4.  The application displays the host address and a unique joining code.
5.  Students connect to the same Wi-Fi network and enter the host
    details and joining code.
6.  The teacher reviews and approves each join request.
7.  Approved students receive authenticated access to their individual
    workspaces.
8.  The teacher publishes instructions or starter code.
9.  Students edit and execute code on their own computers.
10. Workspace updates and submissions are synchronized with the host.
11. The teacher monitors student work and ends the session when the
    class is complete.

### Joining and admission flow

``` mermaid
sequenceDiagram
    participant Teacher
    participant Host as CodeMesh Host
    participant Student

    Teacher->>Host: Create classroom
    Host->>Host: Generate session code
    Host-->>Teacher: Display code and host address

    Student->>Host: Submit code and student details
    Host->>Host: Validate request
    Host-->>Teacher: Show pending admission
    Teacher->>Host: Approve student
    Host-->>Student: Admission result and session token
    Student->>Host: Authenticate
    Host-->>Student: Classroom and workspace access
```

------------------------------------------------------------------------

## Repository Structure

The repository is organized so that three contributors can work in
parallel with clear ownership boundaries.

``` text
codemesh/
├── apps/
│   └── desktop/
│       └── src/
│           ├── main/                 # Electron main process
│           ├── preload/              # Secure IPC bridge
│           └── renderer/
│               ├── teacher/          # Teacher dashboard and screens
│               ├── student/          # Student screens
│               └── shared/           # Shared renderer utilities
├── packages/
│   ├── contracts/                    # Shared types and schemas
│   ├── host-server/                  # Node.js host services
│   ├── client-sdk/                   # API and WebSocket client
│   ├── editor/                       # Monaco, workspace and execution
│   └── ui/                           # Reusable UI components
├── tests/
│   ├── integration/
│   └── load/
├── docs/
├── scripts/
├── package.json
├── tsconfig.json
└── README.md
```

The final structure should match the actual repository. Do not create
duplicate applications or competing package structures in individual
feature branches.

------------------------------------------------------------------------

## Getting Started

> **Development setup:** These instructions describe the intended setup.
> Update the commands to match the actual scripts in the repository once
> the initial Electron foundation has been merged.

### Prerequisites

-   Node.js (use the version specified in `.nvmrc` or `package.json`, if
    present).
-   npm, pnpm, or the package manager selected by the team.
-   Git.
-   A code editor such as Visual Studio Code.
-   A Windows development machine for validating the initial Windows
    desktop build.

### Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd codemesh
```

### Install dependencies

Use the package manager configured by the repository. For example:

``` bash
npm install
```

### Run in development mode

Use the development script defined in the root `package.json`. The
planned command may be:

``` bash
npm run dev
```

### Build the desktop application

Use the build script defined by the project. The planned command may be:

``` bash
npm run build
```

**Note:** The commands above are placeholders until the team finalizes
the project scripts. Check the root `package.json` for the authoritative
commands.

------------------------------------------------------------------------

## Offline-First Design

CodeMesh is designed to support classroom operation without internet
access.

-   The teacher's computer hosts the local application server.
-   A dedicated router/access point creates the local network.
-   Student computers connect to the teacher over the LAN.
-   Classroom APIs and WebSocket traffic remain within the local
    network.
-   Required frontend and runtime assets must be packaged with the
    application or served locally.
-   Python and Java execution must not depend on downloading runtimes
    from a public CDN during a lesson.

The router does not need an active internet connection. It must,
however, allow communication between clients on the local network.
Features that rely on external services, cloud backup, or AI APIs will
require internet unless an offline alternative is implemented.

### Important network note

For a classroom of approximately 30 students, use a dedicated access
point with adequate client capacity and connect the teacher host through
Ethernet where possible. Disable client/AP isolation if it blocks
student-to-host communication. Actual performance must be validated with
the target router, room, and devices.

------------------------------------------------------------------------

## Security

CodeMesh uses layered classroom admission and access control.

-   Unique, randomly generated session joining codes.
-   Teacher approval for new participants.
-   Per-student session authentication tokens.
-   Session expiration and token revocation.
-   Rate limiting for invalid join attempts.
-   Role-based authorization for teacher and student actions.
-   Workspace isolation between students.
-   Validation of API and WebSocket messages.
-   Safe file-path handling to prevent access outside a student's
    workspace.
-   Secure Electron configuration, including context isolation and
    disabled renderer Node integration.

A joining code is not proof of a student's identity. A future roster or
institutional authentication integration may be needed for stronger
identity verification.

Student programs should execute on student devices, not in the
privileged Electron main process or on the teacher host. WebAssembly and
Web Workers improve isolation and responsiveness, but must not be
treated as a complete security boundary.

------------------------------------------------------------------------

## Development Roadmap

### Phase 1 --- Desktop and LAN foundation

-   Set up Electron, React, and TypeScript.
-   Create Teacher and Student application modes.
-   Start and stop the host server from the desktop UI.
-   Connect clients through a dedicated router.
-   Display host address and connection status.

### Phase 2 --- Secure classroom joining

-   Generate session codes.
-   Implement join requests and teacher approval.
-   Issue and validate per-student session tokens.
-   Add participant lists, rejection, disconnection, and session expiry.

### Phase 3 --- Individual workspaces

-   Integrate Monaco Editor.
-   Create separate student workspaces.
-   Add file explorer and local save/recovery.
-   Synchronize workspaces to the host.
-   Implement teacher read-only workspace monitoring.

### Phase 4 --- Classroom controls and execution

-   Add starter-code and instruction broadcasting.
-   Add editor lock/unlock.
-   Integrate local Python execution using Pyodide.
-   Integrate supported Java execution using TeaVM.
-   Add output console and submission flow.

### Phase 5 --- Assessment and scale testing

-   Add exercises and test cases.
-   Add automated evaluation where appropriate.
-   Test reconnection and recovery.
-   Load-test with 30 simultaneous clients.
-   Test weak host computers and realistic classroom Wi-Fi conditions.

### Future enhancements

-   Shared group workspaces.
-   Optional AI-assisted hints and code explanations.
-   QR-based joining and local network discovery.
-   Git integration and project export.
-   Additional programming languages.
-   Optional cloud backup when internet is available.

------------------------------------------------------------------------

## Team Responsibilities

The project is divided into three ownership areas to support parallel
development.

  --------------------------------------------------------------------------
  Contributor             Responsibility          Main ownership
  ----------------------- ----------------------- --------------------------
  **Kalash**              Backend, Electron core, `main/`, `preload/`,
                          networking, security,   `packages/contracts/`,
                          and integration         `packages/host-server/`,
                                                  `packages/client-sdk/`

  **Ishita**              Teacher dashboard and   `renderer/teacher/`,
                          shared visual           `packages/ui/`
                          components              

  **Kalyani**             Student application,    `renderer/student/`,
                          editor, workspace, and  `packages/editor/`
                          local execution         
  --------------------------------------------------------------------------

### Collaboration rules

-   Use feature branches and pull requests.
-   Merge feature work into `develop`; keep `main` stable.
-   Agree on shared API contracts before implementing integrations.
-   Avoid changing files owned by another contributor without
    coordination.
-   Run type checks, tests, and builds before merging.
-   Do not commit `.env` files, tokens, private keys, `node_modules`,
    local databases, or generated runtime caches.

------------------------------------------------------------------------

## Contributing

Contributions should follow the repository's architecture and ownership
boundaries.

1.  Check the issue or task assigned to you.
2.  Pull the latest `develop` branch.
3.  Create a focused feature branch.
4.  Make changes only within your agreed ownership area.
5.  Run the available checks and tests.
6.  Commit with a descriptive message.
7.  Open a pull request into `develop`.
8.  Describe what is implemented, what is mocked, and how it was tested.

Suggested branch names:

``` text
feature/kalash-host-foundation
feature/ishita-teacher-dashboard
feature/kalyani-student-workspace
```

Suggested commit format:

``` text
feat(scope): describe the change
fix(scope): describe the fix
test(scope): describe the test
docs(scope): describe the documentation change
```

------------------------------------------------------------------------

## Limitations and Scope

The first release is focused on a reliable classroom workflow rather
than replacing a full professional IDE or learning-management system.

### Initial scope

-   One teacher-hosted classroom session.
-   One dedicated local network.
-   Teacher-approved student admission.
-   Individual student workspaces.
-   Teacher monitoring.
-   Starter-code distribution.
-   Local Python execution.
-   Java execution for a tested, documented subset.
-   Workspace saving and submission.

### Not guaranteed in the initial release

-   Full Java SE/JVM compatibility.
-   Arbitrary Maven or Gradle projects.
-   Every Python package or native extension.
-   Desktop GUI programs such as Swing/AWT.
-   Cloud accounts or multi-campus administration.
-   Video/audio calls.
-   Full Git hosting.
-   Advanced AI features.
-   Guaranteed support for 30 students before load testing.

The target of approximately 30 students must be validated through
realistic network and application load tests. Actual capacity depends on
the access point, interference, room layout, student devices, and
workload.

------------------------------------------------------------------------

## References

-   [Electron Documentation](https://www.electronjs.org/docs/latest/)
-   [Electron
    Security](https://www.electronjs.org/docs/latest/tutorial/security)
-   [React Documentation](https://react.dev/)
-   [TypeScript Documentation](https://www.typescriptlang.org/docs/)
-   [Monaco Editor](https://microsoft.github.io/monaco-editor/)
-   [Node.js Documentation](https://nodejs.org/docs/latest/api/)
-   [Express Documentation](https://expressjs.com/)
-   [ws WebSocket Library](https://github.com/websockets/ws)
-   [Yjs Documentation](https://docs.yjs.dev/)
-   [SQLite Documentation](https://www.sqlite.org/docs.html)
-   [Pyodide Documentation](https://pyodide.org/en/stable/)
-   [TeaVM](https://teavm.org/)
-   [TeaVM Java Compiler](https://github.com/konsoletyper/teavm-javac)

------------------------------------------------------------------------

## License

No license has been selected yet. Add a `LICENSE` file before
distributing CodeMesh publicly or accepting external contributions.
