const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { runNativeCode } = require('./native-runner.cjs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
ipcMain.handle('codemesh:run-native-code', async (event, input) => {
  try {
    const senderUrl = event.senderFrame?.url || '';
    if (!senderUrl.startsWith(`http://127.0.0.1:${port}/`) && !senderUrl.startsWith(`http://localhost:${port}/`)) throw new Error('Execution request rejected: untrusted renderer.');
    if (!input || typeof input !== 'object') throw new Error('Invalid execution request.');
    return await runNativeCode(input);
  } catch (error) {
    return { ok: false, stdout: '', stderr: error.message || 'Execution failed.', exitCode: -1 };
  }
});
let hostProcess;
let windowRef;
const root = path.resolve(__dirname, '../../../..');
const serverPath = path.join(__dirname, 'server.mjs');
const port = Number(process.env.CODEMESH_PORT || 4173);
function waitForHost(attempt=0){return new Promise((resolve,reject)=>{const req=http.get(`http://127.0.0.1:${port}/api/health`,res=>{res.resume();resolve()});req.on('error',()=>{if(attempt>50)return reject(new Error('CodeMesh host did not start'));setTimeout(()=>waitForHost(attempt+1).then(resolve,reject),200)});req.setTimeout(500,()=>req.destroy())})}
async function createWindow(){
  hostProcess=spawn(process.env.CODEMESH_NODE||'node',[serverPath],{cwd:root,env:{...process.env,CODEMESH_PORT:String(port)},stdio:'inherit',windowsHide:true});
  await waitForHost();
  windowRef=new BrowserWindow({width:1440,height:940,minWidth:980,minHeight:680,backgroundColor:'#0b1020',title:'CodeMesh',webPreferences:{preload:path.join(__dirname,'../preload/index.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  windowRef.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'}});
  await windowRef.loadURL(`http://127.0.0.1:${port}`);
  windowRef.on('closed',()=>{windowRef=null});
}
app.whenReady().then(createWindow).catch(error=>{console.error(error);app.quit()});
app.on('before-quit',()=>{if(hostProcess&&!hostProcess.killed)hostProcess.kill()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
