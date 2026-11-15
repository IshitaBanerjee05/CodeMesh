# Desktop native execution design

The Electron renderer exposes only `codeMeshDesktop.runNativeCode(input)` through preload. Main-process IPC rejects frames outside the loopback CodeMesh UI and calls `native-runner.cjs`. The runner validates workspace-relative paths, stages source files in a fresh OS temp directory, invokes Python/JDK tools with `shell: false`, captures output, applies timeout/output limits and removes the temp directory.

Browser clients do not receive this preload API. They retain their separate browser runtime path. Desktop mode never loads Pyodide or TeaVM for execution.

## Trust boundary warning

Native student programs run as the current OS user and can access resources that user can access. Child-process separation, a temporary working directory and time/output limits do not sandbox hostile code. For a high-stakes or untrusted classroom, add OS-level isolation before deployment.
