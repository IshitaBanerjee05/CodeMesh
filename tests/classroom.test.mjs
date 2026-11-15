import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}

test('teacher admission, student workspace, lock and submission flow', async(t)=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'codemesh-test-')); const port=await freePort();
  const child=spawn(process.execPath,['apps/desktop/src/main/server.mjs'],{cwd:path.resolve('.'),env:{...process.env,CODEMESH_PORT:String(port),CODEMESH_DATA_DIR:dir},stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  t.after(async()=>{child.kill('SIGTERM');await delay(250);await rm(dir,{recursive:true,force:true});});
  let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(`${base}/api/health`);if(r.ok){ready=true;break}}catch{}await delay(100)}assert.equal(ready,true,'server should start');
  const create=await fetch(`${base}/api/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test class'})}).then(r=>r.json());
  assert.equal(create.session.status,'active');assert.equal(create.session.code.length,12);
  const join=await fetch(`${base}/api/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:create.session.code,name:'Ada Student',roll:'CS-01'})}).then(r=>r.json());
  assert.equal(join.request.status,'pending');
  await fetch(`${base}/api/requests/${join.request.id}/approve`,{method:'POST'});
  const admission=await fetch(`${base}/api/join-status/${join.request.id}`).then(r=>r.json());assert.equal(admission.status,'approved');assert.ok(admission.token);
  const headers={'content-type':'application/json',authorization:`Bearer ${admission.token}`};
  const workspace=await fetch(`${base}/api/workspace`,{headers}).then(r=>r.json());assert.equal(workspace.files[0].path,'main.py');
  const saved=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(42)'}]})}).then(r=>r.json());assert.equal(saved.ok,true);
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:true})});
  const blocked=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(43)'}]})});assert.equal(blocked.status,423);
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:false})});
  const submitted=await fetch(`${base}/api/submit`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(42)'}]})}).then(r=>r.json());assert.equal(submitted.ok,true);
  const submissions=await fetch(`${base}/api/submissions`).then(r=>r.json());assert.equal(submissions.submissions.length,1);
  const unsafe=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'../escape.py',content:'x'}]})});assert.equal(unsafe.status,400);
});
