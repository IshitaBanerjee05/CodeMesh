const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const MAX_FILES = 80;
const MAX_FILE_BYTES = 500_000;
const MAX_TOTAL_BYTES = 2_000_000;
const MAX_OUTPUT = 256_000;
const TIMEOUT_MS = 8_000;

function validateFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_FILES) {
    throw new Error('Workspace must contain between 1 and 80 files.');
  }
  let total = 0;
  return files.map((file) => {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new Error('Invalid workspace file.');
    }
    const relative = file.path.replaceAll('\\', '/');
    const parts = relative.split('/');
    if (!relative || relative.startsWith('/') || /^[a-zA-Z]:/.test(relative) ||
        parts.some((part) => !part || part === '.' || part === '..') ||
        relative.includes('\0')) {
      throw new Error(`Unsafe file path: ${file.path}`);
    }
    const bytes = Buffer.byteLength(file.content, 'utf8');
    if (bytes > MAX_FILE_BYTES) throw new Error(`${file.path} exceeds the 500 KB limit.`);
    total += bytes;
    if (total > MAX_TOTAL_BYTES) throw new Error('Workspace exceeds the 2 MB execution limit.');
    return { path: relative, content: file.content };
  });
}

function collectProcess(child, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let outputLimited = false;
    const append = (target, chunk) => {
      const value = chunk.toString('utf8');
      const remaining = MAX_OUTPUT - stdout.length - stderr.length;
      if (remaining <= 0) {
        outputLimited = true;
        child.kill();
        return target;
      }
      if (value.length > remaining) {
        outputLimited = true;
        child.kill();
        return target + value.slice(0, remaining);
      }
      return target + value;
    };
    child.stdout?.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr?.on('data', (chunk) => { stderr = append(stderr, chunk); });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`, exitCode: -1, timedOut, outputLimited });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (outputLimited) stderr += '\n[CodeMesh] Output limit reached; process stopped.';
      if (timedOut) stderr += '\n[CodeMesh] Execution exceeded the 8-second time limit and was stopped.';
      resolve({ ok: code === 0 && !timedOut && !outputLimited, stdout, stderr, exitCode: code ?? -1, timedOut, outputLimited });
    });
  });
}

function spawnCommand(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
    env: {
      PATH: process.env.PATH || '',
      SystemRoot: process.env.SystemRoot || '',
      WINDIR: process.env.WINDIR || '',
      HOME: process.env.HOME || '',
      TMP: process.env.TMP || os.tmpdir(),
      TEMP: process.env.TEMP || os.tmpdir(),
      LANG: process.env.LANG || 'C.UTF-8'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function findPython(cwd) {
  const candidates = process.platform === 'win32'
    ? [['py', ['-3', '--version']], ['python', ['--version']]]
    : [['python3', ['--version']], ['python', ['--version']]];
  for (const [command, args] of candidates) {
    const result = await collectProcess(spawnCommand(command, args, cwd), 2500);
    if (result.exitCode === 0) return command === 'py' ? { command, prefix: ['-3'] } : { command, prefix: [] };
  }
  throw new Error('Python 3 was not found. Install Python 3 and enable it in PATH, then restart CodeMesh.');
}

async function findJava(cwd) {
  const javac = await collectProcess(spawnCommand('javac', ['-version'], cwd), 2500);
  if (javac.exitCode !== 0) throw new Error('Java JDK was not found. Install a JDK (not only a JRE), add javac and java to PATH, then restart CodeMesh.');
  const java = await collectProcess(spawnCommand('java', ['-version'], cwd), 2500);
  if (java.exitCode !== 0) throw new Error('The Java runtime was not found. Check your JDK installation and PATH.');
}

async function runNativeCode({ language, activeFile, files }) {
  if (!['python', 'java'].includes(language)) throw new Error('Only Python and Java are supported.');
  const safeFiles = validateFiles(files);
  const active = safeFiles.find((file) => file.path === activeFile);
  if (!active) throw new Error('The active file is not in this workspace.');
  const extension = language === 'python' ? '.py' : '.java';
  if (!active.path.toLowerCase().endsWith(extension)) {
    throw new Error(`Select a ${extension} file before running ${language}.`);
  }

  const runDir = path.join(os.tmpdir(), 'codemesh-native-runs', crypto.randomUUID());
  await fs.mkdir(runDir, { recursive: true });
  try {
    for (const file of safeFiles) {
      const destination = path.resolve(runDir, file.path);
      if (!destination.startsWith(runDir + path.sep)) throw new Error('Unsafe workspace path.');
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, file.content, { encoding: 'utf8', flag: 'wx' });
    }

    if (language === 'python') {
      const python = await findPython(runDir);
      const result = await collectProcess(
        spawnCommand(python.command, [...python.prefix, '-u', active.path], runDir)
      );
      return { ...result, language, commandLabel: `${python.command} ${[...python.prefix, active.path].join(' ')}` };
    }

    const javaFiles = safeFiles.filter((file) => file.path.toLowerCase().endsWith('.java'));
    if (!javaFiles.length) throw new Error('No Java source files were found.');
    await findJava(runDir);
    await fs.mkdir(path.join(runDir, 'out'), { recursive: true });
    const compile = await collectProcess(
      spawnCommand('javac', ['-encoding', 'UTF-8', '-d', 'out', ...javaFiles.map((f) => f.path)], runDir)
    );
    if (!compile.ok) {
      return { ...compile, language, phase: 'compile', commandLabel: 'javac' };
    }
    const className = path.basename(active.path, '.java');
    const packageMatch = active.content.match(/^\s*package\s+([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\s*;/m);
    const qualifiedClassName = packageMatch ? `${packageMatch[1]}.${className}` : className;
    const execute = await collectProcess(spawnCommand('java', ['-cp', 'out', qualifiedClassName], runDir));
    return {
      ...execute,
      stdout: compile.stdout + execute.stdout,
      stderr: [compile.stderr, execute.stderr].filter(Boolean).join('\n'),
      language,
      phase: 'run',
      commandLabel: `javac + java ${qualifiedClassName}`
    };
  } finally {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { runNativeCode, validateFiles, TIMEOUT_MS, MAX_OUTPUT };
