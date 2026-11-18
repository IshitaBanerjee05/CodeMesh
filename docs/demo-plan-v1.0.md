# CodeMesh v1.0 classroom demonstration plan

Use this runbook to prepare and record a release demonstration. A small
demonstration proves only the actions performed on the listed devices; it is
not a substitute for offline-LAN or 30-client load validation.

## Setup record

| Item | Record |
| --- | --- |
| Date and release commit | |
| CodeMesh installer/app version | |
| Teacher computer and OS | |
| Student computers and OS versions | |
| Router/access point and connection | |
| Teacher adapter used and firewall profile | |
| Python version on each machine used for Python | |
| JDK version on each machine used for Java | |

Do not write classroom codes, student names, roll numbers, tokens, or student
program source into the shared demonstration record.

## Demonstration sequence

| Step | Action | Expected observation | Result / notes |
| --- | --- | --- | --- |
| 1 | Install and launch CodeMesh on the teacher and student computers | App opens to the classroom interface without a development server | |
| 2 | Connect all devices to the same classroom LAN; confirm each student can reach the teacher URL | Teacher host page loads from each student computer | |
| 3 | Teacher starts a named session and shares the correct LAN URL and code | Active session and reachable host address are shown | |
| 4 | Each student submits a join request; teacher approves each request | Students enter their own workspaces only after approval | |
| 5 | Teacher publishes instructions and starter code | Students receive the exercise and starter file | |
| 6 | Students edit separate workspaces and run a Python or Java example | Correct local runtime executes on the student computer and output appears | |
| 7 | Teacher locks editors and a student attempts an edit/save | Editor becomes read-only and host rejects workspace writes | |
| 8 | Teacher unlocks editors; students submit solutions | Teacher sees submission status and can inspect submitted files | |
| 9 | Teacher ends the session | Student access is revoked and saved records remain on the teacher computer | |

Record pass/fail and a short observed result for every row. If a planned step
cannot be performed, mark it blocked and preserve the error text without
including private student data.

## Release acceptance evidence

- For the offline-LAN gate, repeat the relevant classroom workflow with WAN
  access disconnected while keeping router/LAN connectivity available. Record
  the setup and result in [the LAN validation record](lan-validation.md).
- For interruption/recovery, record the Wi-Fi interruption duration and
  whether student drafts and authoritative classroom state recover.
- For scale, run separate 5, 10, 20, and approximately 30-client workloads;
  record client count, device/router details, CPU/memory, join and submission
  times, reconnect behavior, and failures. Do not infer a 30-client capacity
  claim from a smaller demonstration.
- Link the dated evidence from [the v1.0 release checklist](release-readiness-v1.0.md)
  after it has been performed.
