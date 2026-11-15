# CodeMesh --- Individual Development Brief

## Owner: Ishita

### Role: Teacher Dashboard, Classroom UI & Shared Visual Design

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
provides network connectivity; the teacher's laptop runs the host
server. Student code executes on student devices.

## 2. Your ownership

You own the **teacher-facing user experience and shared visual
components**:

-   Teacher dashboard and navigation.
-   Create/start/end classroom screens.
-   Session code and host connection information display.
-   Pending admission request list and approve/reject interactions.
-   Connected student list and status indicators.
-   Teacher monitoring UI for student workspaces.
-   Exercise/instructions publishing UI.
-   Teacher controls: broadcast starter code, lock/unlock, select
    student view.
-   Shared design tokens, reusable UI components, icons, layout, and
    styles.
-   Teacher UI tests and usability documentation.

You do **not** own the host server, authentication implementation,
SQLite database, WebSocket server, Electron main process, or student
code editor/runtime implementation.

------------------------------------------------------------------------

# 3. Fixed technology decisions

Use the agreed stack:

-   React.js + TypeScript
-   Electron renderer
-   Tailwind CSS
-   React Router or the router already selected in the repository
-   Lucide React or the icon library already selected
-   Shared TypeScript contracts from `packages/contracts`
-   API methods from `packages/client-sdk` when available

Do not add a second UI framework or another CSS system. Do not
independently install or upgrade root dependencies.

------------------------------------------------------------------------

# 4. Repository ownership and folder boundaries

Suggested shared repository structure:

``` text
codemesh/
├── apps/
│   └── desktop/
│       └── src/
│           └── renderer/
│               ├── teacher/          # YOU OWN
│               ├── student/          # Kalyani owns
│               └── shared/           # Coordinate before changing
├── packages/
│   ├── contracts/                    # Kalash owns
│   ├── client-sdk/                   # Kalash owns
│   ├── ui/                            # YOU OWN
│   ├── editor/                       # Kalyani owns
│   └── host-server/                  # Kalash owns
└── docs/
```

### Ownership rules

-   You may edit `apps/desktop/src/renderer/teacher/**`,
    `packages/ui/**`, and teacher-specific tests/docs.
-   Kalash owns Electron main/preload, contracts, client SDK, host
    server, root configuration, and integration tests.
-   Kalyani owns `apps/desktop/src/renderer/student/**` and
    `packages/editor/**`.
-   Do not edit shared contracts or API implementation. If a UI needs a
    missing field or event, raise it with Kalash and agree on the
    contract first.
-   Do not edit student-owned files to make a teacher screen work.
-   Do not change root package manifests or build configuration without
    Kalash's approval.

------------------------------------------------------------------------

# 5. Teacher experience and navigation

Design a polished desktop application that feels like a professional
classroom tool, not a generic admin template.

Suggested navigation:

``` text
CodeMesh Teacher
├── Dashboard
├── Create Classroom
├── Active Classroom
│   ├── Overview
│   ├── Students
│   ├── Live Monitor
│   ├── Exercises
│   └── Submissions
└── Settings
```

Keep the first release focused. Do not build a full learning-management
system.

## 5.1 Dashboard

Display: - Welcome/header area. - Create Classroom primary action. -
Recent sessions if backend history is available. - Host/network
readiness status. - Clear offline/local-network indicator. - Simple
setup guidance if no host is running.

## 5.2 Create classroom screen

Fields: - Classroom name. - Subject/topic (optional). - Session duration
or expiry if supported.

On creation: - Call the agreed API/client SDK method. - Display session
status. - Display the host address and port supplied by the host. -
Display the generated joining code prominently. - Provide copy-code and
copy-connection-details actions. - Display a QR code only if the agreed
API/QR flow is implemented. - Provide Start Session and End Session
actions as appropriate.

Do not generate a fake join code in the UI when the backend is
available. For UI-only development, use clearly labelled mock data.

## 5.3 Admission requests

Create a pending requests panel showing: - Student display name. - Roll
number. - Request time. - Approve button. - Reject button.

Behavior: - Show loading state while an action is pending. - Prevent
duplicate approvals. - Show success/error feedback. - Remove or update a
request after the server confirms the action. - Do not mark a student
admitted optimistically before server confirmation.

## 5.4 Student list

Show: - Student name and roll number. - Connected/disconnected state. -
Join time. - Current exercise/submission status if available. - View
workspace action. - Disconnect action.

Use clear visual status labels and accessible color contrast. Provide
empty, loading, and error states.

## 5.5 Live monitor

This is a key CodeMesh classroom feature.

Create a teacher view that can: - Display a grid/list of connected
students. - Show each student's connection and recent activity state. -
Open one student's workspace in a read-only teacher view. - Switch
between students. - Clearly identify whose code is being viewed. -
Return to the student overview.

Do not implement the Monaco editor itself; consume the read-only
workspace viewer/editor component or API boundary agreed with
Kalyani/Kalash. If it is not ready, use a temporary read-only code panel
with mock data and clearly isolate it.

Do not poll the entire workspace continuously. Use server events and
fetch snapshots when required.

## 5.6 Exercise and instruction panel

Provide UI to: - Create an exercise title and instructions. - Choose
supported language: Python or Java. - Add starter file(s) or starter
code when the agreed API supports it. - Publish to the classroom. - Show
the currently active exercise. - View submissions/status.

Do not build automated grading logic in the teacher UI. That belongs to
backend/service work and should be represented through an API contract.

## 5.7 Teacher controls

Build UI controls for: - Lock/unlock a student's editor. - Broadcast
starter code or exercise updates. - Select a student's workspace for
projection. - End classroom session.

Show confirmation dialogs for destructive actions such as ending the
session or disconnecting a student.

------------------------------------------------------------------------

# 6. Shared visual design system

You own `packages/ui`. Build reusable components rather than repeating
styling.

Suggested components:

``` text
packages/ui/
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Dialog.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   ├── StatusIndicator.tsx
│   ├── StudentAvatar.tsx
│   └── CopyField.tsx
├── layout/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── PageHeader.tsx
└── styles/
    └── tokens.css
```

Coordinate component props with Kalyani before making components that
the student screens will also use.

Design guidance: - Clean, modern desktop-first layout. - Consistent
spacing, typography, borders, and radius. - Good information density for
a classroom with 30 students. - Avoid excessive gradients, decorative
animations, and oversized cards. - Make the join code highly readable
from a projector. - Support common laptop screen sizes. - Ensure
keyboard navigation and accessible labels. - Do not rely on color alone
to communicate status.

------------------------------------------------------------------------

# 7. Backend integration contract

Kalash owns the actual backend and shared contracts. Import types from
`packages/contracts` and API functions from `packages/client-sdk`.

Likely operations include:

``` ts
createSession(input)
getCurrentSession()
endSession(sessionId)

getPendingJoinRequests(sessionId)
approveJoinRequest(requestId)
rejectJoinRequest(requestId)

getParticipants(sessionId)
disconnectParticipant(participantId)

createExercise(input)
publishExercise(exerciseId)

getStudentWorkspace(studentId)
getSubmissionStatus(exerciseId)
```

These are conceptual method names. Use the actual exported names from
the repository once Kalash publishes them.

Important rules: - Do not hardcode a server IP or port. - Do not
generate real authentication tokens in the renderer. - Do not store or
invent join codes locally. - Do not bypass server-side authorization. -
Treat server responses as the source of truth. - Handle network loss and
host shutdown gracefully. - Use mock services only behind a
development/demo adapter.

------------------------------------------------------------------------

# 8. Real-time UI behavior

Use the agreed client SDK/WebSocket event subscription interface.

The teacher UI should react to: - New join request. - Student
approved/rejected. - Student connected/disconnected. - Workspace
activity/update available. - Exercise published. - Submission
received. - Session ended.

Ensure event subscriptions are cleaned up when components unmount. Avoid
duplicate subscriptions when navigating between screens.

------------------------------------------------------------------------

# 9. GitHub workflow --- mandatory

Use branches such as:

``` text
feature/ishita-teacher-dashboard
feature/ishita-admission-ui
feature/ishita-student-monitor
feature/ishita-exercise-ui
```

Workflow: 1. Pull the latest `develop`. 2. Create a focused feature
branch. 3. Work only in your owned folders. 4. Commit small, logically
grouped changes. 5. Push and open a PR into `develop`. 6. Ask Kalash to
review shared contract/API dependencies. 7. Do not merge directly to
`main`. 8. Never force-push shared branches. 9. Do not commit
`node_modules`, build output, local databases, secrets, or personal
settings. 10. Coordinate shared UI component changes with Kalyani.

Commit examples:

``` text
feat(teacher): add classroom dashboard
feat(teacher): add admission request panel
feat(teacher): add student live monitor
feat(ui): add reusable status components
test(teacher): cover admission interactions
```

------------------------------------------------------------------------

# 10. Acceptance criteria

Your work is complete when:

-   Teacher can navigate the dashboard and create a classroom through
    the agreed API.
-   Host connection details and joining code are displayed from backend
    responses.
-   Pending join requests can be approved/rejected.
-   Student list shows live connection state.
-   Teacher can open a student's latest workspace in read-only mode.
-   Teacher can publish instructions/starter code through the agreed
    API.
-   Teacher can invoke lock/unlock and disconnect controls.
-   Loading, empty, error, offline, and confirmation states are
    implemented.
-   UI works at typical laptop resolutions.
-   Teacher UI does not depend on internet/CDN assets during a classroom
    session.
-   Typecheck, lint, tests, and app build pass.

------------------------------------------------------------------------

# 11. Instructions to your coding assistant

You are acting as a senior React/TypeScript desktop UI engineer on a
three-person team.

Before coding: 1. Inspect the repository and current branch. 2. Read
`docs/architecture.md` and `docs/api-contracts.md`. 3. Confirm your
folder ownership. 4. Inspect the existing design system before creating
new components. 5. Propose the screens/components and files you intend
to change. 6. Do not scaffold a new independent application.

While coding: - Use TypeScript strictly. - Keep teacher UI in the
teacher-owned folder. - Reuse `packages/ui`. - Import shared types; do
not duplicate contracts. - Use accessible controls and meaningful
loading/error states. - Keep mock data behind a development-only
adapter. - Do not implement backend security in the UI; server
authorization is authoritative. - Do not add cloud services or internet
dependencies.

At completion: - List files changed. - Explain how to run the teacher
UI. - State which screens use real APIs and which still use mocks. -
Include screenshots or a short screen recording in the PR when
practical. - Mention any API fields/events that are missing. - Do not
claim a feature works unless it has been run.
