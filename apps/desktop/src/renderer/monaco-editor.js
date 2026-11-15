let editorInstance = null;

export function languageForFile(filePath) {
  const extension = String(filePath || '').toLowerCase().split('.').pop();
  if (extension === 'py') return 'python';
  if (extension === 'java') return 'java';
  return 'plaintext';
}

function loadMonaco() {
  if (window.monaco?.editor) return Promise.resolve(window.monaco);
  return Promise.reject(new Error('The locally bundled Monaco editor is unavailable.'));
}

export function readEditorValue() {
  return editorInstance?.getValue() ?? null;
}

export function disposeCodeEditor() {
  editorInstance?.dispose();
  editorInstance = null;
}

export async function mountStudentEditor(container, { value, filePath, readOnly, onChange }) {
  container.textContent = 'Loading Monaco Editor…';
  const monaco = await loadMonaco();
  if (!container.isConnected) return null;

  container.replaceChildren();
  const instance = monaco.editor.create(container, {
    value,
    language: languageForFile(filePath),
    theme: 'vs-dark',
    automaticLayout: true,
    readOnly,
    ariaLabel: 'Student code editor',
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    renderWhitespace: 'selection',
    fontSize: 13,
    padding: { top: 12, bottom: 12 }
  });
  editorInstance = instance;
  instance.onDidChangeModelContent(() => {
    if (editorInstance === instance) onChange(instance.getValue());
  });
  return instance;
}
