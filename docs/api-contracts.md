# CodeMesh API contracts — MVP

Base path: `/api`; JSON request/response bodies unless noted.

## Teacher routes (loopback only)

- `GET /api/health` — host status and LAN interface addresses.
- `GET /api/session` — current session and host addresses.
- `POST /api/session` `{name, topic?}` — create and start session; response includes session and addresses.
- `POST /api/session/end` — end active session and revoke participant tokens.
- `GET /api/requests` — list admission requests.
- `POST /api/requests/:id/approve` — approve pending student.
- `POST /api/requests/:id/reject` — reject pending student.
- `GET /api/participants` — approved participants.
- `POST /api/participants/:id/disconnect` — revoke one participant.
- `POST /api/lock` `{locked:boolean}` — lock/unlock student editors.
- `POST /api/exercise` `{title,instructions,language,files}` — publish exercise/starter files.
- `GET /api/workspace/:studentId` — read-only latest workspace snapshot.
- `GET /api/submissions` — submission list.

## Student routes

- `POST /api/join` `{code,name,roll}` — create pending admission request.
- `GET /api/join-status/:requestId` — poll admission status; approved token is returned once.
- `GET /api/workspace` — bearer token required; returns own workspace, lock state and exercise.
- `POST /api/workspace` — bearer token required; saves own files unless locked.
- `POST /api/submit` — bearer token required; submits own files.

## Events

`GET /events` — teacher loopback stream. `GET /events?token=...` — authenticated student stream.

Events: `join_request`, `admission_updated`, `workspace_updated`, `submission_received`, `exercise_published`, `lock_changed`, `participant_disconnected`, `session_ended`.

The MVP uses SSE; the target architecture calls for WebSocket. Event names/payloads are provisional and will be consolidated into shared TypeScript contracts during the React/TypeScript migration.
