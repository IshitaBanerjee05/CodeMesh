import { loadPyodide } from '/pyodide/pyodide.mjs';
let runtimePromise;
async function runtime(){ if(!runtimePromise) runtimePromise=loadPyodide({indexURL:'/pyodide/'}); return runtimePromise; }
self.onmessage=async(event)=>{const {id,code}=event.data;try{const py=await runtime();let stdout='',stderr='';py.setStdout({batched:s=>{stdout+=s+'\n';}});py.setStderr({batched:s=>{stderr+=s+'\n';}});try{await py.runPythonAsync(code);self.postMessage({id,ok:true,stdout,stderr});}catch(e){self.postMessage({id,ok:false,stdout,stderr,error:String(e)});}}catch(e){self.postMessage({id,ok:false,error:`Python runtime failed to load: ${String(e)}`});}};
