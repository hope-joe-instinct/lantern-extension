chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'LANTERN_RANK') return;
  (async () => {
    const { lanternApiUrl, lanternInstallToken } = await chrome.storage.local.get(['lanternApiUrl','lanternInstallToken']);
    if (!lanternApiUrl || !lanternInstallToken) throw new Error('Open Lantern settings to pair this install.');
    const response = await fetch(lanternApiUrl, { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${lanternInstallToken}` }, body:JSON.stringify(message.payload) });
    const body=await response.json().catch(()=>({})); if(!response.ok) throw new Error(body.error||`Lantern backend returned ${response.status}`); return body;
  })().then(sendResponse).catch(error=>sendResponse({error:error.message}));
  return true;
});
