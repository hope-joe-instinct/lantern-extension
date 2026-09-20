function normalizePassages(passages,max=120){ if(!Array.isArray(passages)) return []; const seen=new Set(),clean=[]; for(const item of passages){ const id=String(item?.id||''),text=String(item?.text||'').replace(/\s+/g,' ').trim(); if(!id||text.length<20||text.length>2000||seen.has(text)) continue; seen.add(text);clean.push({id,text});if(clean.length>=max)break;} return clean; }
function selectMatches(scored,limit=8,threshold=.52){ return scored.filter(x=>Number.isFinite(x.score)&&x.score>=threshold).sort((a,b)=>b.score-a.score).slice(0,limit); }
const JSON_HEADERS = { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' };
const LIMITS = { bodyBytes:350_000, passages:120, query:500, results:8 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function response(status, body, origin='') {
  const headers = { ...JSON_HEADERS, ...(origin ? { 'access-control-allow-origin':origin, 'access-control-allow-headers':'authorization, content-type', 'access-control-allow-methods':'POST, OPTIONS', vary:'Origin' } : {}) };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}
function authorized(request, env) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') && value.slice(7) === env.INSTALL_TOKEN;
}
async function callTypeSafe(payload, env, fetchImpl=fetch) {
  for (let attempt=0; attempt<3; attempt++) {
    const res = await fetchImpl('https://api.typesafe.ai/v1/systemone', { method:'POST', headers:{ authorization:`Bearer ${env.TYPESAFE_API_KEY}`, 'content-type':'application/json' }, body:JSON.stringify(payload) });
    if (![429,529].includes(res.status) || attempt===2) return res;
    const retry=Number(res.headers.get('retry-after')); await sleep(Number.isFinite(retry) ? retry*1000 : 250*(2**attempt));
  }
}
export async function handleRequest(request, env, ctx={}, fetchImpl=fetch) {
  const origin=allowedOrigin(request,env);
  if (request.method==='OPTIONS') return origin ? response(204,{},origin) : response(403,{error:'Origin not allowed'});
  if (request.method!=='POST' || new URL(request.url).pathname!=='/api/rank') return response(404,{error:'Not found'},origin);
  if (env.KILL_SWITCH==='true') return response(503,{error:'Lantern is temporarily disabled'},origin);
  if (!origin) return response(403,{error:'Origin not allowed'});
  if (!authorized(request,env)) return response(401,{error:'Unauthorized'},origin);
  const length=Number(request.headers.get('content-length')||0); if (length>LIMITS.bodyBytes) return response(413,{error:'Request too large'},origin);
  if (env.RATE_LIMITER) { const result=await env.RATE_LIMITER.limit({key:`lantern:${request.headers.get('authorization')?.slice(-12)}`}); if (!result.success) return response(429,{error:'Too many searches'},origin); }
  let raw; try { raw=await request.text(); } catch { return response(400,{error:'Invalid request'},origin); }
  if (new TextEncoder().encode(raw).length>LIMITS.bodyBytes) return response(413,{error:'Request too large'},origin);
  let input; try { input=JSON.parse(raw); } catch { return response(400,{error:'Invalid JSON'},origin); }
  const query=String(input.query||'').trim(); if (!query || query.length>LIMITS.query) return response(400,{error:'Query must be 1-500 characters'},origin);
  const passages=normalizePassages(input.passages,LIMITS.passages); if (!passages.length) return response(400,{error:'No searchable passages'},origin);
  const questions=Object.fromEntries(passages.map((_p,i)=>[`passage_${i}`,{type:'noul',instructions:'Is state.passages.passage_'+i+' semantically relevant to state.concept?',criteria:{true:'Directly answers, supports, explains, or materially relates to the concept',false:'Unrelated or only shares incidental words'}}]));
  const upstream=await callTypeSafe({state:{concept:query,passages:Object.fromEntries(passages.map((p,i)=>[`passage_${i}`,p.text]))},model:'jev-1.13.0',questions},env,fetchImpl);
  const body=await upstream.json().catch(()=>({})); if (!upstream.ok) return response(upstream.status===429?429:502,{error:upstream.status===429?'Lantern is busy. Try again shortly.':'Semantic ranking failed'},origin);
  const scored=passages.map((p,i)=>({...p,score:Number(body.answers?.[`passage_${i}`]?.noul??0)}));
  return response(200,{results:selectMatches(scored,LIMITS.results),model:body.model,usage:body.usage},origin);
}
export default { fetch: handleRequest };
