import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { languageForFile } from '../apps/desktop/src/renderer/monaco-editor.js';

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('maps workspace file extensions to Monaco language modes', () => {
  assert.equal(languageForFile('main.py'), 'python');
  assert.equal(languageForFile('src/Main.JAVA'), 'java');
  assert.equal(languageForFile('notes.txt'), 'plaintext');
});

test('serves bundled Monaco editor, stylesheet and worker locally', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'codemesh-monaco-test-'));
  const port = await freePort();
  const child = spawn(process.execPath, ['apps/desktop/src/main/server.mjs'], {
    cwd: path.resolve('.'),
    env: { ...process.env, CODEMESH_PORT: String(port), CODEMESH_DATA_DIR: dataDir },
    stdio: 'ignore'
  });
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => {
    child.kill('SIGTERM');
    await delay(250);
    await rm(dataDir, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(100);
  }
  assert.equal(ready, true, 'server should start');

  const page = await fetch(base).then((response) => response.text());
  assert.match(page, /\/monaco\/monaco-entry\.css/);
  assert.match(page, /worker-src 'self'/);
  assert.doesNotMatch(page, /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(page, /https?:\/\/[^"']*monaco/i);

  const editorResponse = await fetch(`${base}/monaco/monaco-entry.js`);
  assert.equal(editorResponse.status, 200);
  assert.match(editorResponse.headers.get('content-type'), /javascript/);
  assert.match(await editorResponse.text(), /MonacoEnvironment/);

  const stylesheet = await fetch(`${base}/monaco/monaco-entry.css`);
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /css/);

  const worker = await fetch(`${base}/monaco/monaco-worker.js`);
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('content-type'), /javascript/);

  const escapedPath = await fetch(`${base}/monaco/%2e%2e%2f..%2fpackage.json`);
  assert.equal(escapedPath.status, 403, 'Monaco asset route must reject paths outside its build directory');
});
