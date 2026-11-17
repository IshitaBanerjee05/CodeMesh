import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function readUntil(reader, pattern, timeoutMs = 1500) {
  let text = '';
  const decoder = new TextDecoder();

  while (!pattern.test(text)) {
    const result = await Promise.race([
      reader.read(),
      delay(timeoutMs).then(() => {
        throw new Error(`Timed out waiting for ${pattern}`);
      })
    ]);

    assert.equal(result.done, false, 'SSE stream closed unexpectedly');
    text += decoder.decode(result.value, { stream: true });
  }

  return text;
}

test('teacher admission, student workspace, lock and submission flow', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'codemesh-test-'));
  const port = await freePort();
  const child = spawn(process.execPath, ['apps/desktop/src/main/server.mjs'], {
    cwd: path.resolve('.'),
    env: {
      ...process.env,
      CODEMESH_PORT: String(port),
      CODEMESH_DATA_DIR: dataDirectory,
      CODEMESH_HEARTBEAT_MS: '30'
    },
    stdio: 'ignore'
  });
  const base = `http://127.0.0.1:${port}`;

  t.after(async () => {
    child.kill('SIGTERM');
    await delay(250);
    await rm(dataDirectory, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}

    await delay(100);
  }
  assert.equal(ready, true, 'server should start');

  const createResponse = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test class' })
  });
  const create = await createResponse.json();
  assert.equal(create.session.status, 'active');
  assert.equal(create.session.code.length, 12);

  const oversizedPayload = `{"payload":"${'x'.repeat(2_000_001)}"}`;
  const declaredLengthResponse = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: oversizedPayload
  });
  assert.equal(declaredLengthResponse.status, 413);

  const encoder = new TextEncoder();
  const chunkedPayload = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"payload":"'));
      for (let chunk = 0; chunk < 5; chunk += 1) {
        controller.enqueue(encoder.encode('x'.repeat(500_000)));
      }
      controller.enqueue(encoder.encode('"}'));
      controller.close();
    }
  });
  const streamedLengthResponse = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: chunkedPayload,
    duplex: 'half'
  });
  assert.equal(streamedLengthResponse.status, 413);

  const teacherStream = await fetch(`${base}/events`);
  assert.equal(teacherStream.status, 200);
  const teacherReader = teacherStream.body.getReader();
  await readUntil(teacherReader, /: connected/);

  const joinResponse = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: create.session.code,
      name: 'Ada Student',
      roll: 'CS-01'
    })
  });
  const join = await joinResponse.json();
  assert.equal(join.request.status, 'pending');

  await fetch(`${base}/api/requests/${join.request.id}/approve`, { method: 'POST' });
  const admission = await fetch(`${base}/api/join-status/${join.request.id}`).then((response) => response.json());
  assert.equal(admission.status, 'approved');
  assert.ok(admission.token);

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${admission.token}`
  };

  const duplicateApproval = await fetch(`${base}/api/requests/${join.request.id}/approve`, {
    method: 'POST'
  }).then((response) => response.json());
  assert.equal(duplicateApproval.unchanged, true);

  const queryToken = await fetch(`${base}/events?token=${encodeURIComponent(admission.token)}`);
  assert.equal(queryToken.status, 401, 'event credentials must not be accepted from URLs');

  const stream = await fetch(`${base}/events`, {
    headers: { authorization: headers.authorization }
  });
  assert.equal(stream.status, 200);
  assert.equal(stream.headers.get('x-codemesh-protocol'), '1');
  let reader = stream.body.getReader();
  await readUntil(reader, /: heartbeat/);

  const presenceFrame = await readUntil(teacherReader, /participant_presence_changed/);
  assert.match(presenceFrame, /"connected":true/);

  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(health.version, '0.7.0');
  assert.equal(health.realtime.sseClients.student, 1);
  assert.ok(health.runtime.memoryBytes.rss > 0);

  const onlineRoster = await fetch(`${base}/api/participants`).then((response) => response.json());
  assert.equal(onlineRoster.participants[0].connected, true);
  assert.equal(onlineRoster.participants[0].latestSubmission, null);

  const workspace = await fetch(`${base}/api/workspace`, { headers }).then((response) => response.json());
  assert.equal(workspace.files[0].path, 'main.py');

  const saved = await fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: [{ path: 'main.py', content: 'print(42)' }] })
  }).then((response) => response.json());
  assert.equal(saved.ok, true);

  const secondJoin = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: create.session.code,
      name: 'Grace Student',
      roll: 'CS-02'
    })
  }).then((response) => response.json());
  await fetch(`${base}/api/requests/${secondJoin.request.id}/approve`, { method: 'POST' });
  const secondAdmission = await fetch(`${base}/api/join-status/${secondJoin.request.id}`)
    .then((response) => response.json());
  const secondHeaders = {
    'content-type': 'application/json',
    authorization: `Bearer ${secondAdmission.token}`
  };

  for (let index = 0; index < 8; index += 1) {
    const rateLimitedJoin = await fetch(`${base}/api/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: create.session.code,
        name: `Rate Test ${index}`,
        roll: `RATE-${index}`
      })
    });
    assert.equal(rateLimitedJoin.status, 201);
  }

  const admissionLimit = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: create.session.code,
      name: 'Rate Test Overflow',
      roll: 'RATE-OVERFLOW'
    })
  });
  assert.equal(admissionLimit.status, 429);

  const roster = await fetch(`${base}/api/participants`).then((response) => response.json());
  assert.equal(roster.participants.length, 2);
  assert.equal(
    roster.participants.find((participant) => participant.id === secondJoin.request.id).connected,
    false
  );

  await fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers: secondHeaders,
    body: JSON.stringify({
      studentId: join.request.id,
      files: [{ path: 'main.py', content: 'print("Grace")' }]
    })
  });
  const graceWorkspace = await fetch(`${base}/api/workspace`, { headers: secondHeaders })
    .then((response) => response.json());
  assert.equal(graceWorkspace.files[0].content, 'print("Grace")');

  const adaWorkspace = await fetch(`${base}/api/workspace`, { headers }).then((response) => response.json());
  assert.equal(
    adaWorkspace.files[0].content,
    'print(42)',
    'a client-supplied participant ID must not select another workspace'
  );

  await fetch(`${base}/api/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locked: true })
  });
  const lockFrame = await readUntil(reader, /data: \{"version":1/);
  const lockData = lockFrame.match(/data: (\{[^\n]+\})/);
  assert.ok(lockData);
  const lockEvent = JSON.parse(lockData[1]);
  assert.equal(lockEvent.type, 'lock_changed');
  assert.equal(lockEvent.payload.locked, true);
  assert.match(lockEvent.id, /^[0-9a-f-]+:\d+$/);

  const repeatedLock = await fetch(`${base}/api/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locked: true })
  }).then((response) => response.json());
  assert.equal(repeatedLock.unchanged, true);

  const blocked = await fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: [{ path: 'main.py', content: 'print(43)' }] })
  });
  assert.equal(blocked.status, 423);

  await fetch(`${base}/api/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locked: false })
  });
  const unlockFrame = await readUntil(reader, /data: \{"version":1/);
  const unlockEvent = JSON.parse(unlockFrame.match(/data: (\{[^\n]+\})/)[1]);
  assert.equal(unlockEvent.payload.locked, false);
  assert.equal(
    Number(unlockEvent.id.split(':').at(-1)),
    Number(lockEvent.id.split(':').at(-1)) + 1
  );

  await reader.cancel();
  const resumed = await fetch(`${base}/events`, {
    headers: {
      authorization: headers.authorization,
      'last-event-id': unlockEvent.id
    }
  });
  assert.equal(resumed.status, 200);
  reader = resumed.body.getReader();
  await readUntil(reader, /: heartbeat/);

  await fetch(`${base}/api/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locked: true })
  });
  const resumedFrame = await readUntil(reader, /data: \{"version":1/);
  const resumedEvent = JSON.parse(resumedFrame.match(/data: (\{[^\n]+\})/)[1]);
  assert.equal(
    Number(resumedEvent.id.split(':').at(-1)),
    Number(unlockEvent.id.split(':').at(-1)) + 1
  );

  await fetch(`${base}/api/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locked: false })
  });
  const submitted = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: [{ path: 'main.py', content: 'print(42)' }] })
  }).then((response) => response.json());
  assert.equal(submitted.ok, true);

  const submissions = await fetch(`${base}/api/submissions`).then((response) => response.json());
  assert.equal(submissions.submissions.length, 1);

  const submission = await fetch(`${base}/api/submissions/${submitted.id}`)
    .then((response) => response.json());
  assert.equal(submission.submission.student.name, 'Ada Student');
  assert.equal(submission.submission.files[0].content, 'print(42)');

  const missingSubmission = await fetch(`${base}/api/submissions/missing`);
  assert.equal(missingSubmission.status, 404);

  const submittedRoster = await fetch(`${base}/api/participants`).then((response) => response.json());
  assert.equal(
    submittedRoster.participants.find((participant) => participant.id === join.request.id)
      .latestSubmission.id,
    submitted.id
  );

  const unsafe = await fetch(`${base}/api/workspace`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: [{ path: '../escape.py', content: 'x' }] })
  });
  assert.equal(unsafe.status, 400);

  await fetch(`${base}/api/participants/${join.request.id}/disconnect`, { method: 'POST' });
  const disconnected = await readUntil(reader, /participant_disconnected/);
  assert.match(disconnected, /"participantId":"/);

  await reader.cancel();
  const offlinePresence = await readUntil(teacherReader, /participant_presence_changed/);
  assert.match(offlinePresence, /"connected":false/);

  const repeatedDisconnect = await fetch(`${base}/api/participants/${join.request.id}/disconnect`, {
    method: 'POST'
  }).then((response) => response.json());
  assert.equal(repeatedDisconnect.unchanged, true);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const invalidCode = await fetch(`${base}/api/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'incorrect', name: 'Unknown', roll: `BAD-${attempt}` })
    });
    assert.equal(invalidCode.status, 401);
  }

  const invalidCodeLimit = await fetch(`${base}/api/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: 'incorrect', name: 'Unknown', roll: 'BAD-OVERFLOW' })
  });
  assert.equal(invalidCodeLimit.status, 429);

  const finalHealth = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.ok(finalHealth.realtime.deliveries >= 3);
  assert.ok(finalHealth.realtime.bytesSent > 0);
  assert.ok(finalHealth.realtime.eventsByType.lock_changed >= 2);

  await teacherReader.cancel();
});
