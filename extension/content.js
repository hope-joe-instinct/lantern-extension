(() => {
  if (globalThis.__lanternLoaded) return;
  globalThis.__lanternLoaded = true;
  const MARK = 'lantern-semantic-match';
  let matches = [], current = -1;

  function clear() {
    document.querySelectorAll(`mark[data-${MARK}]`).forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
    document.querySelectorAll(`[data-${MARK}-block]`).forEach(el => el.removeAttribute(`data-${MARK}-block`));
    matches = []; current = -1;
  }

  function visible(el) {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function extract() {
    const selectors = 'p,li,blockquote,article h1,article h2,article h3,main h1,main h2,main h3,td,dd';
    const seen = new Set(), passages = [];
    for (const el of document.querySelectorAll(selectors)) {
      if (!visible(el) || el.closest('nav,header,footer,aside,[aria-hidden="true"]')) continue;
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (text.length < 35 || text.length > 1600 || seen.has(text)) continue;
      seen.add(text); const id = `p${passages.length}`;
      el.dataset.lanternPassageId = id;
      passages.push({ id, text });
      if (passages.length >= 120) break;
    }
    return passages;
  }

  function highlight(results) {
    clear();
    for (const result of results.slice(0, 8)) {
      const el = document.querySelector(`[data-lantern-passage-id="${CSS.escape(result.id)}"]`);
      if (!el) continue;
      el.setAttribute(`data-${MARK}-block`, '');
      const mark = document.createElement('mark');
      mark.setAttribute(`data-${MARK}`, 'true');
      mark.style.cssText = 'background:#ffd86b;color:inherit;border-radius:3px;padding:1px 2px;box-shadow:0 0 0 2px rgba(255,184,0,.14)';
      while (el.firstChild) mark.append(el.firstChild);
      el.append(mark); matches.push(mark);
    }
    if (matches.length) go(0);
    return { count: matches.length };
  }

  function go(index) {
    if (!matches.length) return { count:0, current:0 };
    current = (index + matches.length) % matches.length;
    matches.forEach((m,i) => m.style.outline = i === current ? '3px solid #ff7a00' : 'none');
    matches[current].scrollIntoView({ behavior:'smooth', block:'center' });
    return { count:matches.length, current:current + 1 };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'LANTERN_EXTRACT') sendResponse({ passages:extract(), title:document.title, url:location.href });
    if (message?.type === 'LANTERN_HIGHLIGHT') sendResponse(highlight(message.results || []));
    if (message?.type === 'LANTERN_NAVIGATE') sendResponse(go(current + (message.direction === 'prev' ? -1 : 1)));
    if (message?.type === 'LANTERN_CLEAR') { clear(); sendResponse({ ok:true }); }
  });
})();
