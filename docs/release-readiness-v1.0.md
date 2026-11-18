# CodeMesh v1.0 release readiness

Status: in progress. This checklist tracks release evidence; a checked item
must have a dated result or artifact. A desktop launch smoke check alone does
not establish classroom, offline-LAN, or scale readiness.

## Release scope

The v1.0 candidate stabilizes the current local-first classroom workflow:

- Windows Electron host and student clients on a trusted local network.
- Teacher session creation/end, student join requests and approval, individual
  workspaces, exercise/starter-code publishing, editor lock, monitoring, and
  submissions.
- Student-side execution of Python 3 and the supported Java source-file
  subset through locally installed runtimes.
- Local SQLite persistence, SSE updates, reconnect snapshot recovery, and
  offline classroom coordination after installation.

No new collaboration transport, cloud service, browser Java runtime, or
multi-classroom administration is part of this stabilization scope. The
approximately 30-client figure remains a validation target, not a support
claim. Native student code runs with the student's OS account permissions.

## Release gates

| Gate | Status | Evidence required |
| --- | --- | --- |
| Freeze scope and triage release-blocking defects | In progress | Final scope decision and issue list |
| Complete automated checks on the release candidate | Not rerun for v1.0 | Exact command output and commit hash |
| Complete teacher/student workflow | Not run end to end | Dated workflow record on named devices |
| Offline LAN workflow | Not run | Router, WAN-disconnected, and device record |
| Reconnect after Wi-Fi interruption | Not run | Interruption duration and recovered state |
| Load measurements at 5, 10, 20, and approximately 30 clients | Not run | Client count, hardware, CPU/memory, latency, failures |
| Clean-machine Python and Java execution | Not run | OS, Python/JDK versions, sample results |
| Reproducible install, upgrade, uninstall, and data retention | Partial | Current-profile v0.9 install/launch only; clean-machine results outstanding |
| Teacher and student setup guides | In progress | Published guides reviewed against release candidate |
| Architecture, data model, API, and security limits | Partial | Current-source docs reviewed and cross-linked |
| Multi-device demonstration | Not run | Demonstration checklist and recorded outcome |
| Known issues and release checklist | In progress | Final checklist completed with evidence |
| `v1.0.0` release tag | Not created | Create only after release gates are satisfied |

## Current evidence and known limits

- The v0.9 Windows x64 installer was installed/upgraded in the current Windows
  profile and launched to the teacher dashboard. This is not a clean-machine
  or full workflow result.
- `docs/integration-status.md` records prior successful `npm run check` and
  `npm test` results (14 tests). Rerun both against the final release commit.
- `docs/lan-validation.md` records physical-device, WAN-disconnected,
  interruption, and load scenarios as not run.
- The installer is unsigned and has no project icon. Clean-machine upgrade and
  uninstall behavior still need verification.
- LAN traffic uses unencrypted HTTP. Native code execution is not sandboxed.
  Do not present CodeMesh as suitable for an untrusted network or high-stakes
  execution environment.
- Browser Java execution is not integrated; desktop Java depends on a local
  JDK and supports straightforward source files, not arbitrary build projects.

## Evidence record template

For each manual gate, record the date, release commit, app/installer version,
device models, OS versions, router/AP model and relevant settings, runtime
versions, steps performed, expected result, observed result, and any issue ID.
Do not include student names, roll numbers, join codes, bearer tokens, or
student source code in shared evidence.
