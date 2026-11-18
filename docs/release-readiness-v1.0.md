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
| Complete automated checks on the release candidate | Passed locally | `npm test` (14/14) and `npm run check` on the `1.0.0-rc.1` source |
| Complete teacher/student workflow | Partial | Automated API integration flow passed; full desktop UI workflow still needs a dated run on named devices |
| Offline LAN workflow | Not run | Router, WAN-disconnected, and device record |
| Reconnect after Wi-Fi interruption | Not run | Interruption duration and recovered state |
| Load measurements at 5, 10, 20, and approximately 30 clients | Partial | Single-host loopback simulations recorded; physical multi-device LAN runs still need client count, hardware, CPU/memory, latency, and failure evidence |
| Clean-machine Python and Java execution | Partial | Java smoke passed with JDK 23 on the development machine; Python is unavailable here; clean-machine checks outstanding |
| Reproducible install, upgrade, uninstall, and data retention | Partial | `1.0.0-rc.2` installed/upgraded and launched in the current profile; clean-machine, uninstall and data-retention results outstanding |
| Teacher and student setup guides | Drafted | Review steps against the final release candidate |
| Architecture, data model, API, and security limits | Documented | Review current-source docs against final release candidate |
| Multi-device demonstration | Not run | Demonstration checklist and recorded outcome |
| Known issues and release checklist | Drafted | Complete each gate with evidence and publish final known issues |
| `v1.0.0` release tag | Not created | Create only after release gates are satisfied |

## Current evidence and known limits

- The `1.0.0-rc.2` Windows x64 installer was built at
  `release/CodeMesh-Setup-1.0.0-rc.2-x64.exe`, installed as
  an upgrade in the current profile, and launched to the teacher dashboard.
  This is not a clean-machine or full workflow result.
- On the `1.0.0-rc.2` source, `npm test` passed all 14 tests and `npm run check`
  passed. The health endpoint regression assertion checks the reported app
  version against `package.json`. Rerun both against the final release commit.
- The native Java runner compiled and ran a smoke program with the available
  JDK 23. No Python interpreter is discoverable in this profile, so Python
  execution could not be verified here.
- The local single-host load simulation completed 5, 10, 20, and 30 simulated
  clients with successful workspace updates/submissions and no SSE
  backpressure or slow-client disconnects. Measurements and limits are in
  `docs/lan-validation.md`; physical LAN capacity remains unverified.
- `docs/lan-validation.md` records physical-device, WAN-disconnected,
  interruption, and physical load scenarios as not run; single-host loopback
  load simulations are recorded separately.
- The installer is unsigned, has no project icon, and package metadata has no
  publisher author. Clean-machine upgrade and uninstall behavior still need
  verification.
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
