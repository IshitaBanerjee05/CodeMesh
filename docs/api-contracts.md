# CodeMesh API contracts — MVP

Base path: `/api`; JSON request/response bodies unless noted.

JSON request bodies are limited to 2,000,000 bytes. Larger declared-length or streamed requests return HTTP 413. Join-code guesses are limited to 8 per source IP per minute; valid admission requests are limited to 10 per source IP and active session per minute.

## Teacher routes (loopback only)

- `GET /api/health` — host status, version, uptime, LAN addresses, live SSE client counts and cumulative event fan-out metrics.
- `GET /api/session` — current session and host addresses.
- `POST /api/session` `{name, topic?}` — create and start session; response includes session and addresses.
- `POST /api/session/end` — end active session and revoke participant tokens.
- `GET /api/requests` — list admission requests.
- `POST /api/requests/:id/approve` — approve pending student.
- `POST /api/requests/:id/reject` — reject pending student.
- `GET /api/participants` — approved participants with current SSE connection state and latest submission summary.
- `POST /api/participants/:id/disconnect` — revoke one participant.
- `POST /api/lock` `{locked:boolean}` — lock/unlock student editors.
- `POST /api/exercise` `{title,instructions,language,files}` — publish exercise/starter files.
- `GET /api/workspace/:studentId` — read-only latest workspace snapshot.
- `GET /api/submissions` — submission history summary for the active classroom.
- `GET /api/submissions/:id` — read-only submission contents; limited to the active classroom and loopback teacher clients.

## Student routes

- `POST /api/join` `{code,name,roll}` — create pending admission request.
- `GET /api/join-status/:requestId` — poll admission status; approved token is returned once.
- `GET /api/workspace` — bearer token required; returns own workspace, lock state and exercise.
- `POST /api/workspace` — bearer token required; saves own files unless locked.
- `POST /api/submit` — bearer token required; submits own files.

## Events

`GET /events` — teacher loopback stream. Student streams use `GET /events` with `Authorization: Bearer <token>`; tokens in query strings are rejected. On a new stream connection, the client sends `Last-Event-ID` when it has one.

Each SSE classroom message uses the `codemesh` event name and contains a validated JSON envelope:

```json
{
  "version": 1,
  "id": "server-instance-id:stream-sequence",
  "type": "lock_changed",
  "occurredAt": "2026-11-17T10:30:00.000Z",
  "payload": { "locked": true }
}
```

| Event | Payload |
| --- | --- |
| `session_updated` | `{ session }` |
| `join_request` | `{ request: { id, name, roll, status, requested_at } }` |
| `admission_updated` | `{ request: { id, name, roll, status, requested_at } }` |
| `workspace_updated` | `{ studentId, name, updatedAt }` |
| `submission_received` | `{ id, studentId, name }` |
| `exercise_published` | `{ exercise }` |
| `lock_changed` | `{ locked }` |
| `participant_disconnected` | `{ participantId }` (sent only to that student and teachers) |
| `participant_presence_changed` | `{ participantId, name, connected }` (sent to teachers when a student SSE stream connects or closes) |
| `session_ended` | `{}` |

The server validates each payload before fan-out. SSE comments carry a heartbeat every 15 seconds by default. On a reconnect, clients fetch the current teacher session state or their own workspace and session settings before applying new events; event IDs support duplicate suppression, stream-gap detection and server-restart detection. The server resumes the stream sequence from `Last-Event-ID` but does not replay an event history. Client retry delays use exponential backoff from 1 second up to 30 seconds with ±20% jitter. A stream whose unsent buffer exceeds 1 MiB is closed so it can reconnect and recover from the authoritative snapshot. `/api/health` reports process uptime, RSS/heap, CPU time, active SSE clients, events published/delivered, event bytes, backpressure, slow-client disconnects and counts by event type.

Approve/reject actions return the existing decision when retried with the same outcome. Repeating the opposite outcome returns `409`. Repeating a disconnect or a lock state returns success without publishing a duplicate event.

The v0.5 implementation retains SSE. Current fan-out counts and bytes are exposed by `/api/health`; load testing on representative LANs is still required before considering another transport.
