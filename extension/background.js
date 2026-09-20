const LANTERN_API_URL = 'http://127.0.0.1:8787/api/rank';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'LANTERN_RANK') return;
  (async () => {
    const response = await fetch(LANTERN_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message.payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Lantern proxy returned ${response.status}`);
    return body;
  })().then(sendResponse).catch(error => sendResponse({ error: error.message }));
  return true;
});
