const BATUMHUB_URL="https://ilhangemini12.github.io/teen-english-quest/";
const DEFAULTS={language:'en',level:'A1'};

async function prefs(){
  return await chrome.storage.sync.get(DEFAULTS);
}
function targetUrl(extra={}){
  const u=new URL(BATUMHUB_URL);
  if(extra.language)u.searchParams.set('lang',extra.language);
  if(extra.level)u.searchParams.set('level',extra.level);
  if(extra.capture)u.searchParams.set('capture',extra.capture.slice(0,120));
  if(extra.tab)u.hash=extra.tab;
  return u.toString();
}
chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.removeAll(()=>{
    chrome.contextMenus.create({
      id:'batumhub-save-selection',
      title:'Save “%s” to BatumHub',
      contexts:['selection']
    });
    chrome.contextMenus.create({
      id:'batumhub-open',
      title:'Open BatumHub',
      contexts:['page']
    });
  });
});
chrome.contextMenus.onClicked.addListener(async(info)=>{
  const p=await prefs();
  if(info.menuItemId==='batumhub-save-selection'&&info.selectionText){
    await chrome.tabs.create({url:targetUrl({language:p.language,level:p.level,capture:info.selectionText,tab:'vocabulary'})});
  }
  if(info.menuItemId==='batumhub-open'){
    await chrome.tabs.create({url:targetUrl({language:p.language,level:p.level})});
  }
});
chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
  (async()=>{
    if(msg?.type==='open'){
      const p=await prefs();
      await chrome.tabs.create({url:targetUrl({language:p.language,level:p.level,tab:msg.tab||''})});
      sendResponse({ok:true});
    }else if(msg?.type==='savePrefs'){
      await chrome.storage.sync.set({language:msg.language,level:msg.level});
      sendResponse({ok:true});
    }else sendResponse({ok:false});
  })();
  return true;
});
