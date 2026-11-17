import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './classroom-client';
import type { ClassroomRole } from './contracts';

interface ScreenState {
  body: string;
  title: string;
  subtitle: string;
  role: ClassroomRole;
  page: string;
}

function AppShell() {
  const [screen, setScreen] = useState<ScreenState | null>(null);

  useEffect(() => {
    const onRender = (event: Event) => {
      setScreen((event as CustomEvent<ScreenState>).detail);
    };
    window.addEventListener('codemesh:render', onRender);
    void import('./app.js');
    return () => window.removeEventListener('codemesh:render', onRender);
  }, []);

  useLayoutEffect(() => {
    if (screen) window.dispatchEvent(new Event('codemesh:dom-ready'));
  }, [screen]);

  if (!screen) {
    return <div className="boot"><div className="brand-mark" aria-hidden="true">⌘</div><p>Starting CodeMesh…</p></div>;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">⌘</div><div><strong>CodeMesh</strong><small>CLASSROOM STUDIO</small></div></div>
        <nav className="nav" aria-label="Workspace">
          <div className="nav-label">WORKSPACE</div>
          {([
            ['dashboard', '⌂', 'Overview'],
            ['classroom', '▦', 'Classroom'],
            ['monitor', '◉', 'Live monitor'],
            ['exercises', '▤', 'Exercises']
          ] as const).map(([page, icon, label]) => (
            <button key={page} type="button" data-page={page} className={screen.page === page ? 'active' : ''} onClick={() => window.dispatchEvent(new CustomEvent('codemesh:navigate', { detail: page }))}>
              <span className="ico" aria-hidden="true">{icon}</span><span className="nav-text">{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><b>● LAN MODE</b><p>Classroom traffic stays on your local network. Internet is not required for this MVP.</p></div>
      </aside>
      <main className="main">
        <header className="topline">
          <div><div className="eyebrow">CODEMESH / {screen.role.toUpperCase()}</div><h1>{screen.title}</h1><div className="muted small">{screen.subtitle}</div></div>
          <div className="role-switch" aria-label="Choose role">
            {(['teacher', 'student'] as const).map((role) => <button key={role} type="button" className={screen.role === role ? 'active' : ''} onClick={() => window.dispatchEvent(new CustomEvent('codemesh:role', { detail: role }))}>{role === 'teacher' ? 'Teacher' : 'Student'}</button>)}
          </div>
        </header>
        <div key={`${screen.role}:${screen.page}`} dangerouslySetInnerHTML={{ __html: screen.body }} />
      </main>
    </div>
  );
}

const mount = document.getElementById('app');
if (!mount) throw new Error('CodeMesh renderer mount point is missing.');

createRoot(mount).render(<React.StrictMode><AppShell /></React.StrictMode>);
