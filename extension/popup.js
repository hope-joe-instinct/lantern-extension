const q = document.querySelector('#query'), search = document.querySelector('#search');
const status = document.querySelector('#status'), nav = document.querySelector('#nav'), count = document.querySelector('#count');
let tabId, total = 0, current = 0;
const setStatus = text => { status.textContent = text; };
const sendTab = message => chrome.tabs.sendMessage(tabId, message);

async function ensureContent() {
  try { await sendTab({ type:'LANTERN_EXTRACT' }); }
  catch { await chrome.scripting.executeScript({ target:{ tabId }, files:['content.js'] }); }
}
async function run() {
  const query = q.value.trim(); if (!query) { setStatus('Describe an idea first.'); q.focus(); return; }
  search.disabled = true; nav.style.display = 'none'; setStatus('Reading visible passages…');
  try {
    [tabId] = (await chrome.tabs.query({ active:true, currentWindow:true })).map(t => t.id);
    await ensureContent();
    const page = await sendTab({ type:'LANTERN_EXTRACT' });
    if (!page.passages?.length) throw new Error('No searchable text found on this page.');
    setStatus(`Ranking ${page.passages.length} passages…`);
    const ranked = await chrome.runtime.sendMessage({ type:'LANTERN_RANK', payload:{ query, ...page } });
    if (ranked?.error) throw new Error(ranked.error);
    const shown = await sendTab({ type:'LANTERN_HIGHLIGHT', results:ranked.results });
    total = shown.count; current = total ? 1 : 0; updateNav();
    setStatus(total ? `Found ${total} relevant passage${total === 1 ? '' : 's'}.` : 'No confident matches found.');
  } catch (error) { setStatus(error.message.includes('Receiving end') ? 'This page cannot be searched by extensions.' : error.message); }
  finally { search.disabled = false; }
}
function updateNav() { nav.style.display = total ? 'grid' : 'none'; count.textContent = `${current} of ${total}`; }
async function move(direction) { const state = await sendTab({ type:'LANTERN_NAVIGATE', direction }); current = state.current; updateNav(); }
search.addEventListener('click', run); q.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run(); });
document.querySelector('#prev').addEventListener('click', () => move('prev'));
document.querySelector('#next').addEventListener('click', () => move('next'));
