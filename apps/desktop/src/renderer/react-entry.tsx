import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './classroom-client';
import type { ClassroomRole } from './contracts';

function LegacyRendererHost({ role }: { role: ClassroomRole }) {
  useEffect(() => {
    void import('./app.js');
  }, []);

  return (
    <div id="legacy-app" data-renderer-role={role} aria-live="polite">
      <div className="boot">
        <div className="brand-mark" aria-hidden="true">⌘</div>
        <p>Starting CodeMesh…</p>
      </div>
    </div>
  );
}

const mount = document.getElementById('app');
if (!mount) throw new Error('CodeMesh renderer mount point is missing.');

createRoot(mount).render(
  <React.StrictMode>
    <LegacyRendererHost role="teacher" />
  </React.StrictMode>
);
