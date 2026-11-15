import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const WEB = path.join(ROOT, 'apps/desktop/src/renderer');
const DATA = process.env.CODEMESH_DATA_DIR || path.join(os.homedir(), '.codemesh');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'codemesh.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT, code TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, locked INTEGER NOT NULL DEFAULT 0, exercise TEXT);
CREATE TABLE IF NOT EXISTS join_requests(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL, roll TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL, token_hash TEXT);
CREATE TABLE IF NOT EXISTS workspaces(student_id TEXT PRIMARY KEY, files TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, exercise_title TEXT, files TEXT NOT NULL, submitted_at TEXT NOT NULL);`);

const clients = new Set();
const pendingTokens = new Map();
const joinAttempts = new Map();
let currentSessionId = db.prepare("SELECT id FROM sessions WHERE status='active' ORDER BY created_at DESC LIMIT 1").get()?.id || null;
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const randomCode = () => crypto.randomBytes(6).toString('hex').toUpperCase();
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
const send = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(data)); };
const readBody = (req) => new Promise((resolve, reject) => { let raw=''; req.on('data', c => { raw += c; if(raw.length > 2_000_000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); });
function isLoopback(address='') { return address==='127.0.0.1' || address==='::1' || address==='::ffff:127.0.0.1'; }
function localOnly(req,res) { if(!isLoopback(req.socket.remoteAddress)) { send(res,403,{error:'Teacher controls are available only from the host computer. Open CodeMesh at http://localhost:4173 on the teacher laptop.'}); return false; } return true; }
function broadcast(type, payload={}) { const event = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`; for (const client of clients) { if(client.teacher || ['lock_changed','exercise_published','session_ended'].includes(type) || (type==='participant_disconnected' && payload.participantId===client.participantId)) client.res.write(event); } }
function getSession() { return currentSessionId ? db.prepare('SELECT * FROM sessions WHERE id=?').get(currentSessionId) : null; }
function requireSession() { const s=getSession(); if(!s || s.status!=='active') throw Object.assign(new Error('No active classroom'), {status: 404}); return s; }
function getParticipant(req, sessionId) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if(!token) return null;
  return db.prepare("SELECT * FROM join_requests WHERE token_hash=? AND status='approved' AND session_id=?").get(hash(token),sessionId);
}
function networkAddresses() {
  const out=[]; for(const [name, entries] of Object.entries(os.networkInterfaces())) for(const n of entries||[]) if(n.family==='IPv4' && !n.internal) out.push({interface:name,address:n.address}); return out;
}
function safeFiles(files) {
  if(!Array.isArray(files) || files.length>100) throw new Error('Invalid file list');
  return files.map(f=>{ if(typeof f.path!=='string'||typeof f.content!=='string'||f.content.length>500_000) throw new Error('Invalid file'); const p=f.path.replaceAll('\\','/'); if(p.startsWith('/')||p.split('/').some(x=>x==='..')||p.includes('\0')) throw new Error('Unsafe file path'); return {path:p,content:f.content}; });
}

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if(req.method==='OPTIONS') { res.writeHead(204, {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'}); return res.end(); }
  try {
    if(url.pathname==='/events' && req.method==='GET') { const rawToken=url.searchParams.get('token'); const participant=rawToken?db.prepare("SELECT id FROM join_requests WHERE token_hash=? AND status='approved' AND session_id=?").get(hash(rawToken),currentSessionId):null; const teacher=!rawToken && isLoopback(req.socket.remoteAddress); if(!teacher && !participant) return send(res,401,{error:'Authenticated classroom connection required'}); res.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive','access-control-allow-origin':'*'}); res.write(`event: ready\ndata: {}\n\n`); const client={res,teacher,participantId:participant?.id||null}; clients.add(client); req.on('close',()=>clients.delete(client)); return; }
    if(url.pathname.startsWith('/api/')) {
      if(url.pathname==='/api/health') return send(res,200,{ok:true,version:'0.1.0',addresses:networkAddresses()});
      if(url.pathname==='/api/session' && req.method==='GET') { if(!localOnly(req,res)) return; return send(res,200,{session:getSession(),addresses:networkAddresses()}); }
      if(url.pathname==='/api/session' && req.method==='POST') { if(!localOnly(req,res)) return;
        const b=await readBody(req); if(!b.name?.trim()) return send(res,400,{error:'Classroom name is required'});
        const existing=getSession(); if(existing && existing.status==='active') return send(res,409,{error:'End the active classroom before creating another'});
        const session={id:id(),name:b.name.trim().slice(0,100),topic:(b.topic||'').slice(0,120),code:randomCode(),status:'active',created_at:now(),locked:0,exercise:null};
        db.prepare('INSERT INTO sessions(id,name,topic,code,status,created_at,locked,exercise) VALUES(?,?,?,?,?,?,?,?)').run(session.id,session.name,session.topic,session.code,session.status,session.created_at,0,null); currentSessionId=session.id;
        broadcast('session_updated',{session}); return send(res,201,{session,addresses:networkAddresses()});
      }
      if(url.pathname==='/api/session/end' && req.method==='POST') { if(!localOnly(req,res)) return; const s=requireSession(); db.prepare("UPDATE sessions SET status='ended' WHERE id=?").run(s.id); db.prepare("UPDATE join_requests SET status='rejected',token_hash=NULL WHERE session_id=?").run(s.id); pendingTokens.clear(); broadcast('session_ended',{}); currentSessionId=null; return send(res,200,{ok:true}); }
      if(url.pathname==='/api/join' && req.method==='POST') {
        const b=await readBody(req); const s=requireSession(); const ip=req.socket.remoteAddress||'unknown'; const attempt=joinAttempts.get(ip)||{count:0,reset:Date.now()+60_000}; if(Date.now()>attempt.reset){attempt.count=0;attempt.reset=Date.now()+60_000;} if(attempt.count>=8) return send(res,429,{error:'Too many attempts. Wait one minute and try again.'}); if(String(b.code||'').toUpperCase()!==s.code){attempt.count++;joinAttempts.set(ip,attempt);return send(res,401,{error:'Incorrect classroom code'});} joinAttempts.delete(ip);
        if(!b.name?.trim()||!b.roll?.trim()) return send(res,400,{error:'Name and roll number are required'});
        const recent=db.prepare("SELECT COUNT(*) AS n FROM join_requests WHERE session_id=? AND roll=? AND requested_at > ?").get(s.id,b.roll.trim(),new Date(Date.now()-60_000).toISOString()).n;
        if(recent) return send(res,429,{error:'A request for this roll number was already submitted recently'});
        const request={id:id(),session_id:s.id,name:b.name.trim().slice(0,80),roll:b.roll.trim().slice(0,40),status:'pending',requested_at:now()};
        db.prepare('INSERT INTO join_requests(id,session_id,name,roll,status,requested_at) VALUES(?,?,?,?,?,?)').run(request.id,request.session_id,request.name,request.roll,request.status,request.requested_at);
        broadcast('join_request',{request}); return send(res,201,{request});
      }
      const statusMatch=url.pathname.match(/^\/api\/join-status\/([^/]+)$/);
      if(statusMatch && req.method==='GET') { const r=db.prepare('SELECT id,status FROM join_requests WHERE id=?').get(statusMatch[1]); if(!r) return send(res,404,{error:'Request not found'}); const pending=pendingTokens.get(r.id); const token=pending&&pending.expires>Date.now()?pending.token:null; if(pending&&pending.expires<=Date.now())pendingTokens.delete(r.id); return send(res,200,{status:r.status,token}); }
      if(url.pathname==='/api/requests' && req.method==='GET') { if(!localOnly(req,res)) return; const s=requireSession(); return send(res,200,{requests:db.prepare('SELECT id,name,roll,status,requested_at FROM join_requests WHERE session_id=? ORDER BY requested_at DESC').all(s.id)}); }
      const decision=url.pathname.match(/^\/api\/requests\/([^/]+)\/(approve|reject)$/);
      if(decision && req.method==='POST') { if(!localOnly(req,res)) return; const s=requireSession(); const [_,rid,action]=decision; const r=db.prepare('SELECT * FROM join_requests WHERE id=? AND session_id=?').get(rid,s.id); if(!r||r.status!=='pending') return send(res,404,{error:'Pending request not found'});
        let token=null; if(action==='approve') { token=crypto.randomBytes(32).toString('base64url'); db.prepare("UPDATE join_requests SET status='approved',token_hash=? WHERE id=?").run(hash(token),rid); pendingTokens.set(rid, {token,expires:Date.now()+60_000}); } else db.prepare("UPDATE join_requests SET status='rejected' WHERE id=?").run(rid);
        const updated=db.prepare('SELECT id,name,roll,status,requested_at FROM join_requests WHERE id=?').get(rid); broadcast('admission_updated',{request:updated}); return send(res,200,{request:updated}); }
      if(url.pathname==='/api/participants' && req.method==='GET') { if(!localOnly(req,res)) return; const s=requireSession(); return send(res,200,{participants:db.prepare("SELECT id,name,roll,status,requested_at FROM join_requests WHERE session_id=? AND status='approved' ORDER BY name").all(s.id)}); }
      const disconnect=url.pathname.match(/^\/api\/participants\/([^/]+)\/disconnect$/);
      if(disconnect && req.method==='POST') { if(!localOnly(req,res)) return; const s=requireSession(); const result=db.prepare("UPDATE join_requests SET status='rejected',token_hash=NULL WHERE id=? AND session_id=? AND status='approved'").run(disconnect[1],s.id); if(!result.changes) return send(res,404,{error:'Participant not found'}); broadcast('participant_disconnected',{participantId:disconnect[1]}); return send(res,200,{ok:true}); }
      if(url.pathname==='/api/lock' && req.method==='POST') { if(!localOnly(req,res)) return; const s=requireSession(); const b=await readBody(req); db.prepare('UPDATE sessions SET locked=? WHERE id=?').run(b.locked?1:0,s.id); broadcast('lock_changed',{locked:!!b.locked}); return send(res,200,{locked:!!b.locked}); }
      if(url.pathname==='/api/exercise' && req.method==='POST') { if(!localOnly(req,res)) return; const s=requireSession(); const b=await readBody(req); if(!b.title?.trim()) return send(res,400,{error:'Exercise title is required'}); const exercise={id:id(),title:b.title.trim(),instructions:(b.instructions||'').slice(0,5000),language:b.language==='java'?'java':'python',files:safeFiles(b.files||[])}; db.prepare('UPDATE sessions SET exercise=? WHERE id=?').run(JSON.stringify(exercise),s.id); broadcast('exercise_published',{exercise}); return send(res,201,{exercise}); }
      if(url.pathname==='/api/workspace' && req.method==='GET') { const s=requireSession(); const participant=getParticipant(req,s.id); if(!participant) return send(res,401,{error:'Approved student token required'}); const row=db.prepare('SELECT files,updated_at FROM workspaces WHERE student_id=?').get(participant.id); return send(res,200,{files:row?JSON.parse(row.files):[{path:s.exercise?JSON.parse(s.exercise).language==='java'?'Main.java':'main.py':'main.py',content:s.exercise?(JSON.parse(s.exercise).files[0]?.content||''):'# Start coding here\n'}],locked:!!s.locked,sessionName:s.name,exercise:s.exercise?JSON.parse(s.exercise):null}); }
      if(url.pathname==='/api/workspace' && req.method==='POST') { const s=requireSession(); const participant=getParticipant(req,s.id); if(!participant) return send(res,401,{error:'Approved student token required'}); if(s.locked) return send(res,423,{error:'Your editor is locked by the teacher'}); const b=await readBody(req); const files=safeFiles(b.files); db.prepare('INSERT INTO workspaces(student_id,files,updated_at) VALUES(?,?,?) ON CONFLICT(student_id) DO UPDATE SET files=excluded.files,updated_at=excluded.updated_at').run(participant.id,JSON.stringify(files),now()); broadcast('workspace_updated',{studentId:participant.id,name:participant.name,updatedAt:now()}); return send(res,200,{ok:true,savedAt:now()}); }
      if(url.pathname.startsWith('/api/workspace/') && req.method==='GET') { if(!localOnly(req,res)) return; const s=requireSession(); const studentId=url.pathname.split('/').pop(); const row=db.prepare('SELECT files,updated_at FROM workspaces WHERE student_id=?').get(studentId); if(!row) return send(res,200,{files:[],updatedAt:null}); return send(res,200,{files:JSON.parse(row.files),updatedAt:row.updated_at}); }
      if(url.pathname==='/api/submit' && req.method==='POST') { const s=requireSession(); const participant=getParticipant(req,s.id); if(!participant) return send(res,401,{error:'Approved student token required'}); const b=await readBody(req); const files=safeFiles(b.files); const submissionId=id(); db.prepare('INSERT INTO submissions(id,student_id,exercise_title,files,submitted_at) VALUES(?,?,?,?,?)').run(submissionId,participant.id,s.exercise?JSON.parse(s.exercise).title:'Practice',JSON.stringify(files),now()); broadcast('submission_received',{id:submissionId,studentId:participant.id,name:participant.name}); return send(res,201,{ok:true,id:submissionId,submittedAt:now()}); }
      if(url.pathname==='/api/submissions' && req.method==='GET') { if(!localOnly(req,res)) return; const s=requireSession(); const rows=db.prepare('SELECT submissions.id,student_id,name,roll,exercise_title,submitted_at FROM submissions JOIN join_requests ON join_requests.id=submissions.student_id WHERE join_requests.session_id=? ORDER BY submitted_at DESC').all(s.id); return send(res,200,{submissions:rows}); }
      return send(res,404,{error:'API route not found'});
    }
    const requested=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,''); const target=path.resolve(WEB,requested); if(!target.startsWith(WEB+path.sep)&&target!==WEB) return send(res,403,{error:'Forbidden'});
    if(!fs.existsSync(target)||!fs.statSync(target).isFile()) return send(res,404,{error:'Not found'});
    const ext=path.extname(target); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.zip':'application/zip','.svg':'image/svg+xml'}; res.writeHead(200,{'content-type':types[ext]||'application/octet-stream'}); fs.createReadStream(target).pipe(res);
  } catch(e) { send(res,e.status||400,{error:e.message||'Unexpected server error'}); }
});
const port=Number(process.env.CODEMESH_PORT||4173); server.listen(port,'0.0.0.0',()=>{console.log(`CodeMesh host listening on http://localhost:${port}`); for(const a of networkAddresses()) console.log(`LAN: http://${a.address}:${port} (${a.interface})`);});
process.on('SIGINT',()=>{server.close();db.close();process.exit(0);});
