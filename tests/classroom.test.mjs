import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function readUntil(reader, pattern, timeoutMs=1500){let text='';const decoder=new TextDecoder();while(!pattern.test(text)){const result=await Promise.race([reader.read(),delay(timeoutMs).then(()=>{throw new Error(`Timed out waiting for ${pattern}`)})]);assert.equal(result.done,false,'SSE stream closed unexpectedly');text+=decoder.decode(result.value,{stream:true});}return text;}

test('teacher admission, student workspace, lock and submission flow', async(t)=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'codemesh-test-')); const port=await freePort();
  const child=spawn(process.execPath,['apps/desktop/src/main/server.mjs'],{cwd:path.resolve('.'),env:{...process.env,CODEMESH_PORT:String(port),CODEMESH_DATA_DIR:dir,CODEMESH_HEARTBEAT_MS:'30'},stdio:'ignore'});
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
  const duplicateApproval=await fetch(`${base}/api/requests/${join.request.id}/approve`,{method:'POST'}).then(r=>r.json());assert.equal(duplicateApproval.unchanged,true);
  const queryToken=await fetch(`${base}/events?token=${encodeURIComponent(admission.token)}`);assert.equal(queryToken.status,401,'event stream credentials must not be accepted from URLs');
  const stream=await fetch(`${base}/events`,{headers:{authorization:headers.authorization}});assert.equal(stream.status,200);assert.equal(stream.headers.get('x-codemesh-protocol'),'1');
  let reader=stream.body.getReader();await readUntil(reader,/: heartbeat/);
  const health=await fetch(`${base}/api/health`).then(r=>r.json());assert.equal(health.version,'0.5.0');assert.equal(health.realtime.sseClients.student,1);assert.ok(health.runtime.memoryBytes.rss>0);
  const workspace=await fetch(`${base}/api/workspace`,{headers}).then(r=>r.json());assert.equal(workspace.files[0].path,'main.py');
  const saved=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(42)'}]})}).then(r=>r.json());assert.equal(saved.ok,true);
  const secondJoin=await fetch(`${base}/api/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:create.session.code,name:'Grace Student',roll:'CS-02'})}).then(r=>r.json());
  await fetch(`${base}/api/requests/${secondJoin.request.id}/approve`,{method:'POST'});const secondAdmission=await fetch(`${base}/api/join-status/${secondJoin.request.id}`).then(r=>r.json());
  const secondHeaders={'content-type':'application/json',authorization:`Bearer ${secondAdmission.token}`};
  await fetch(`${base}/api/workspace`,{method:'POST',headers:secondHeaders,body:JSON.stringify({studentId:join.request.id,files:[{path:'main.py',content:'print("Grace")'}]})});
  assert.equal((await fetch(`${base}/api/workspace`,{headers:secondHeaders}).then(r=>r.json())).files[0].content,'print("Grace")');
  assert.equal((await fetch(`${base}/api/workspace`,{headers}).then(r=>r.json())).files[0].content,'print(42)','a client-supplied participant ID must not select another workspace');
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:true})});
  const lockFrame=await readUntil(reader,/data: \{"version":1/);const lockData=lockFrame.match(/data: (\{[^\n]+\})/);assert.ok(lockData);const lockEvent=JSON.parse(lockData[1]);assert.equal(lockEvent.type,'lock_changed');assert.equal(lockEvent.payload.locked,true);assert.match(lockEvent.id,/^[0-9a-f-]+:\d+$/);
  const repeatedLock=await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:true})}).then(r=>r.json());assert.equal(repeatedLock.unchanged,true);
  const blocked=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(43)'}]})});assert.equal(blocked.status,423);
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:false})});
  const unlockFrame=await readUntil(reader,/data: \{"version":1/);const unlockEvent=JSON.parse(unlockFrame.match(/data: (\{[^\n]+\})/)[1]);assert.equal(unlockEvent.payload.locked,false);assert.equal(Number(unlockEvent.id.split(':').at(-1)),Number(lockEvent.id.split(':').at(-1))+1);
  await reader.cancel();const resumed=await fetch(`${base}/events`,{headers:{authorization:headers.authorization,'last-event-id':unlockEvent.id}});assert.equal(resumed.status,200);reader=resumed.body.getReader();await readUntil(reader,/: heartbeat/);
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:true})});const resumedFrame=await readUntil(reader,/data: \{"version":1/);const resumedEvent=JSON.parse(resumedFrame.match(/data: (\{[^\n]+\})/)[1]);assert.equal(Number(resumedEvent.id.split(':').at(-1)),Number(unlockEvent.id.split(':').at(-1))+1);
  await fetch(`${base}/api/lock`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locked:false})});
  const submitted=await fetch(`${base}/api/submit`,{method:'POST',headers,body:JSON.stringify({files:[{path:'main.py',content:'print(42)'}]})}).then(r=>r.json());assert.equal(submitted.ok,true);
  const submissions=await fetch(`${base}/api/submissions`).then(r=>r.json());assert.equal(submissions.submissions.length,1);
  const unsafe=await fetch(`${base}/api/workspace`,{method:'POST',headers,body:JSON.stringify({files:[{path:'../escape.py',content:'x'}]})});assert.equal(unsafe.status,400);
  await fetch(`${base}/api/participants/${join.request.id}/disconnect`,{method:'POST'});const disconnected=await readUntil(reader,/participant_disconnected/);assert.match(disconnected,/"participantId":"/);
  const repeatedDisconnect=await fetch(`${base}/api/participants/${join.request.id}/disconnect`,{method:'POST'}).then(r=>r.json());assert.equal(repeatedDisconnect.unchanged,true);
  const finalHealth=await fetch(`${base}/api/health`).then(r=>r.json());assert.ok(finalHealth.realtime.deliveries>=3);assert.ok(finalHealth.realtime.bytesSent>0);assert.ok(finalHealth.realtime.eventsByType.lock_changed>=2);
  await reader.cancel();
});
