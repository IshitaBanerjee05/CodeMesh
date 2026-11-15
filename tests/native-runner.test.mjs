import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateFiles, runNativeCode } = require('../apps/desktop/src/main/native-runner.cjs');

test('accepts normal relative workspace files', () => {
  const files = validateFiles([{ path: 'src/main.py', content: 'print("hi")' }]);
  assert.equal(files[0].path, 'src/main.py');
});

test('rejects path traversal', () => {
  assert.throws(() => validateFiles([{ path: '../escape.py', content: '' }]), /Unsafe file path/);
});

test('rejects absolute paths', () => {
  assert.throws(() => validateFiles([{ path: 'C:\\\\temp\\\\bad.py', content: '' }]), /Unsafe file path/);
});

test('rejects oversized workspace files', () => {
  assert.throws(() => validateFiles([{ path: 'main.py', content: 'x'.repeat(500_001) }]), /500 KB/);
});

test('rejects unsupported languages before spawning commands', async () => {
  await assert.rejects(runNativeCode({ language: 'ruby', activeFile: 'main.rb', files: [{ path: 'main.rb', content: '' }] }), /Only Python and Java/);
});

test('rejects an active file that is not in the submitted workspace', async () => {
  await assert.rejects(runNativeCode({ language: 'python', activeFile: 'missing.py', files: [{ path: 'main.py', content: '' }] }), /active file is not/);
});
