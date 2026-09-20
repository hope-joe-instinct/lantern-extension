import test from 'node:test'; import assert from 'node:assert/strict'; import { handleRequest } from '../worker/worker.mjs';
const env={ALLOWED_ORIGINS:'chrome-extension://abc',INSTALL_TOKEN:'secret-install-token',TYPESAFE_API_KEY:'typesafe-test',KILL_SWITCH:'false'};
const passages=[{id:'a',text:'Content may become unavailable when licensing rights expire.'}];
function req(extra={}){return new Request('https://worker.example/api/rank',{method:'POST',headers:{origin:'chrome-extension://abc',authorization:'Bearer secret-install-token','content-type':'application/json',...(extra.headers||{})},body:extra.body||JSON.stringify({query:'Can content disappear?',passages})});}
test('rejects wrong origin',async()=>assert.equal((await handleRequest(req({headers:{origin:'https://evil.example'}}),env)).status,403));
test('rejects missing bearer auth',async()=>assert.equal((await handleRequest(req({headers:{authorization:''}}),env)).status,401));
test('honors kill switch',async()=>assert.equal((await handleRequest(req(),{...env,KILL_SWITCH:'true'})).status,503));
test('ranks through pinned Jev model',async()=>{let payload;const f=async(_u,o)=>{payload=JSON.parse(o.body);return new Response(JSON.stringify({model:'jev-1.13.0',answers:{passage_0:{noul:.94}}}),{status:200,headers:{'content-type':'application/json'}})};const r=await handleRequest(req(),env,{},f);const b=await r.json();assert.equal(payload.model,'jev-1.13.0');assert.equal(b.results[0].id,'a');});
test('sanitizes upstream errors',async()=>{const f=async()=>new Response(JSON.stringify({error:'sensitive provider detail'}),{status:500,headers:{'content-type':'application/json'}});const r=await handleRequest(req(),env,{},f);assert.deepEqual(await r.json(),{error:'Semantic ranking failed'});});
