import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientCount = Number(process.argv[2] || 5);
if (![5, 10, 20, 30].includes(clientCount)) {
  throw new Error('Choose a client count of 5, 10, 20, or 30.');
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function readJson(url, options = {}, localAddress = '127.0.0.1') {
  const response = await new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    if (options.body !== undefined && !headers['content-length']) {
      headers['content-length'] = Buffer.byteLength(options.body);
    }
    const request = http.request(url, {
      method: options.method || 'GET',
      headers,
      localAddress
    }, (incoming) => {
      const chunks = [];
      incoming.on('data', (chunk) => chunks.push(chunk));
      incoming.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: incoming.statusCode, body: JSON.parse(text) });
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
        }
      });
    });
    request.once('error', reject);
    request.end(options.body);
  });
  const body = response.body;
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${response.status} ${url}: ${body.error || 'request failed'}`);
  }
  return body;
}

function openStream(url, headers, localAddress = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { headers, localAddress }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`SSE ${url} returned ${response.statusCode}.`));
        return;
      }
      response.on('data', () => {});
      resolve(response);
    });
    request.once('error', reject);
  });
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return Number((sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] || 0).toFixed(2));
}

const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'codemesh-load-'));
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['apps/desktop/src/main/server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    CODEMESH_PORT: String(port),
    CODEMESH_BIND_ADDRESS: '127.0.0.1',
    CODEMESH_DATA_DIR: dataDirectory
  },
  stdio: 'ignore'
});
const readers = [];

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(100);
  }
  if (!ready) throw new Error('Temporary CodeMesh host did not start.');

  const teacherStream = await openStream(`${base}/events`);
  readers.push(teacherStream);

  const session = await readJson(`${base}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `Local load smoke (${clientCount})` })
  });

  const students = Array.from({ length: clientCount }, (_, index) => ({
    id: index + 1,
    base,
    localAddress: `127.0.0.${index + 2}`,
    joinMs: 0,
    actionMs: 0
  }));

  await Promise.all(students.map(async (student) => {
    const started = performance.now();
    const result = await readJson(`${student.base}/api/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: session.session.code,
        name: `Load Student ${student.id}`,
        roll: `LOAD-${clientCount}-${student.id}`
      })
    }, student.localAddress);
    student.requestId = result.request.id;
    student.joinMs = performance.now() - started;
  }));

  await Promise.all(students.map((student) => readJson(
    `${base}/api/requests/${student.requestId}/approve`, { method: 'POST' }
  )));

  await Promise.all(students.map(async (student) => {
    const admission = await readJson(`${student.base}/api/join-status/${student.requestId}`, {}, student.localAddress);
    if (!admission.token) throw new Error(`Student ${student.id} received no admission token.`);
    student.token = admission.token;
    const stream = await openStream(`${student.base}/events`, {
      authorization: `Bearer ${student.token}`
    }, student.localAddress);
    readers.push(stream);
  }));

  await readJson(`${base}/api/exercise`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Load smoke exercise',
      instructions: 'Synthetic local-only exercise.',
      language: 'python',
      files: [{ path: 'main.py', content: '# Load smoke starter\n' }]
    })
  });

  const workStarted = performance.now();
  await Promise.all(students.map(async (student) => {
    const started = performance.now();
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${student.token}`
    };
    const files = [{ path: 'main.py', content: `print(${student.id})\n` }];
    await readJson(`${student.base}/api/workspace`, {
      method: 'POST', headers, body: JSON.stringify({ files })
    }, student.localAddress);
    await readJson(`${student.base}/api/submit`, {
      method: 'POST', headers, body: JSON.stringify({ files })
    }, student.localAddress);
    student.actionMs = performance.now() - started;
  }));
  const workloadMs = performance.now() - workStarted;
  const health = await readJson(`${base}/api/health`);

  console.log(JSON.stringify({
    mode: 'single-host loopback simulation; not a physical LAN measurement',
    clients: clientCount,
    joinLatencyMs: { p50: percentile(students.map((student) => student.joinMs), 0.5), p95: percentile(students.map((student) => student.joinMs), 0.95) },
    workspaceAndSubmissionLatencyMs: { p50: percentile(students.map((student) => student.actionMs), 0.5), p95: percentile(students.map((student) => student.actionMs), 0.95) },
    totalWorkspaceAndSubmissionMs: Number(workloadMs.toFixed(2)),
    successfulWorkspaceUpdates: students.length,
    successfulSubmissions: students.length,
    connectedStudentSse: health.realtime.sseClients.student,
    serverRssBytes: health.runtime.memoryBytes.rss,
    serverHeapBytes: health.runtime.memoryBytes.heapUsed,
    serverCpuMicroseconds: health.runtime.cpuMicroseconds,
    deliveredEvents: health.realtime.deliveries,
    eventBackpressureCount: health.realtime.backpressureCount,
    slowClientDisconnects: health.realtime.slowClientsDisconnected
  }, null, 2));
} finally {
  for (const stream of readers) stream.destroy();
  await readJson(`${base}/api/session/end`, { method: 'POST' }).catch(() => {});
  child.kill();
  await delay(300);
  await rm(dataDirectory, { recursive: true, force: true });
}
