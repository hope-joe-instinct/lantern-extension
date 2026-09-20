export function normalizePassages(passages, max = 120) {
  if (!Array.isArray(passages)) return [];
  const seen = new Set(), clean = [];
  for (const item of passages) {
    const id = String(item?.id || ''), text = String(item?.text || '').replace(/\s+/g, ' ').trim();
    if (!id || text.length < 20 || text.length > 2000 || seen.has(text)) continue;
    seen.add(text); clean.push({ id, text }); if (clean.length >= max) break;
  }
  return clean;
}
export function selectMatches(scored, limit = 8, threshold = 0.52) {
  return scored.filter(x => Number.isFinite(x.score) && x.score >= threshold)
    .sort((a,b) => b.score - a.score).slice(0, limit);
}
export async function rankWithJev({ query, passages, apiKey, fetchImpl = fetch }) {
  const clean = normalizePassages(passages);
  const questions = Object.fromEntries(clean.map((p,i) => [`passage_${i}`, {
    type:'noul', instructions:`Is \`state.passages.passage_${i}\` semantically relevant to \`state.concept\`?`,
    criteria:{ true:'The passage directly answers, supports, explains, or materially relates to the concept', false:'The passage is unrelated or only shares incidental words' }
  }]));
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
    method:'POST', headers:{ authorization:`Bearer ${apiKey}`, 'content-type':'application/json' },
    body:JSON.stringify({ state:{ concept:query, passages:Object.fromEntries(clean.map((p,i) => [`passage_${i}`, p.text])) }, model:'jev-latest', questions })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`TypeSafe request failed (${response.status})`);
  const scored = clean.map((p,i) => ({ ...p, score:Number(body.answers?.[`passage_${i}`]?.noul ?? 0) }));
  return { results:selectMatches(scored), model:body.model, usage:body.usage };
}
