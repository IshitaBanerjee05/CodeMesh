# LAN and offline validation (v0.8)

This guide records the setup and evidence needed to validate CodeMesh on a
real classroom network. The target of approximately 30 students is a test
target, not a supported capacity claim. Do not mark a scenario passed until
it has been run on the stated equipment and its results recorded below.

## Network setup

- Connect the teacher computer to the classroom router or access point,
  preferably by Ethernet.
- Connect student computers to the same router/LAN. Confirm they are on a
  subnet that can reach the teacher computer.
- Allow client-to-LAN traffic. Disable AP/client isolation if it prevents
  students from reaching the host.
- Permit inbound connections to the CodeMesh host port (4173) on the teacher
  computer's private-network firewall profile.
- The router provides local connectivity and DHCP; an internet/WAN connection
  is not required once CodeMesh and its dependencies/assets are installed.
- The current host uses unencrypted HTTP. Use a controlled, trusted LAN only.

The teacher dashboard lists the detected non-loopback IPv4 addresses with
their adapter names. When more than one address is shown, share the address
belonging to the classroom router's adapter. VPN, virtual-machine, and other
adapter addresses may not be reachable by students. Students enter that full
URL, including the port, for example `http://192.168.50.10:4173`.

## Troubleshooting

1. On the teacher computer, confirm CodeMesh is running and open
   `http://localhost:4173`.
2. Confirm the teacher and student devices are connected to the intended
   router and that the chosen host address belongs to that network.
3. From a student device, open the teacher URL in a browser. If it does not
   load, check the host firewall, router client isolation, subnet, and whether
   the address came from a VPN or virtual adapter.
4. If the page loads but joining fails, confirm the active classroom code,
   then check the host console for request errors.
5. After Wi-Fi interruption, keep the student app open while connectivity
   returns; it should reconnect and refresh authoritative classroom state.

## Validation record

Record exact devices, OS/runtime versions, router/AP model and settings, host
adapter/address, test date, and the observed outcome. Do not record join codes,
student tokens, names, or student code in shared validation notes.

| Scenario | Result | Evidence / notes |
| --- | --- | --- |
| Teacher and one student join, approval, workspace edit, run, and submission | Not run | Requires two physical devices on the same LAN |
| LAN workflow with WAN/internet disconnected | Not run | Keep router/AP powered and LAN available |
| Wi-Fi interruption and reconnect/state recovery | Not run | Record interruption length and recovered state |
| 5 physical clients | Not run | A single-host software simulation is recorded below; it is not a LAN result |
| 10 physical clients | Not run | Same workload and measurements on separate devices |
| 20 physical clients | Not run | Same workload and measurements on separate devices |
| Approximately 30 physical clients | Not run | Do not claim capacity until repeatable physical tests pass |

## Local software load simulation

On 2026-11-18, `scripts/load-smoke.mjs` ran against a temporary local host
using separate loopback source addresses. Each simulated client joined,
opened an authenticated SSE stream, saved a workspace, and submitted it. All
workspace updates and submissions succeeded; the host reported no SSE
backpressure or slow-client disconnects.

This measures one Windows host's local HTTP, SQLite, and SSE path. It does not
include a router, Wi-Fi, separate computers, realistic editing intervals, or
WAN disconnection, so these figures do not establish classroom LAN capacity.

| Simulated clients | Join p50 / p95 (ms) | Workspace + submit p50 / p95 (ms) | Total workload (ms) | Host RSS (bytes) | Events delivered |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 20.72 / 28.98 | 52.07 / 61.19 | 62.19 | 53,063,680 | 32 |
| 10 | 30.51 / 51.80 | 83.59 / 109.67 | 111.02 | 54,169,600 | 62 |
| 20 | 56.20 / 113.81 | 183.91 / 224.98 | 230.31 | 55,881,728 | 122 |
| 30 | 79.11 / 159.88 | 241.72 / 319.04 | 329.14 | 56,643,584 | 182 |

Reproduce a scenario from the repository root with, for example,
`npm run load:smoke -- 30`. Supported counts are 5, 10, 20, and 30. The script
creates a temporary database and removes it after the run.

## Current implementation and limits

- Host address discovery enumerates all non-loopback IPv4 interfaces;
  selection of the classroom adapter is currently a teacher judgment.
- The student join screen provides host URL and same-network instructions.
- The host exposes health and process/event metrics for later measurements.
- Automated local tests do not substitute for physical-device, offline-LAN,
  Wi-Fi interruption, or representative load testing.
- HTTP is unencrypted, and 30-client support has not been established.
