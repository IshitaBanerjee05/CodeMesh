import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/python/register.js';
import 'monaco-editor/languages/definitions/java/register.js';

globalThis.MonacoEnvironment = {
  getWorker(_workerId, label) {
    return new Worker('/monaco/monaco-worker.js', { type: 'module', name: label });
  }
};

globalThis.monaco = monaco;
