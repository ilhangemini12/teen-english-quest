import puppeteer from 'puppeteer-core';

const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
async function launchBrowser(){
  let last;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      return await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        timeout: 45000,
        args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
      });
    }catch(e){last=e;if(attempt<2)await new Promise(r=>setTimeout(r,1800));}
  }
  throw last;
}
const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
await page.evaluateOnNewDocument(() => localStorage.clear());

const LOCAL_ORIGIN = 'http://127.0.0.1:4173';
const pageErrors = [];
const consoleErrors = [];
const sameOriginHttpErrors = [];
const externalHttpErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
page.on('response', response => {
  const status=response.status();if(status<400)return;
  const item={status,url:response.url()};
  try{(new URL(item.url).origin===LOCAL_ORIGIN?sameOriginHttpErrors:externalHttpErrors).push(item)}catch(e){externalHttpErrors.push(item)}
});
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push({text:msg.text(),url:msg.location()?.url||''});
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  await page.goto('http://127.0.0.1:4173/?smoke=1', {waitUntil:'domcontentloaded', timeout:30000});
  await page.waitForSelector('#languageFlags button[data-lang="es"]', {timeout:10000});
  const version = await page.$eval('#bhVersion', el => el.textContent.trim());
  assert(/^v\d+\.\d+$/.test(version),'Visible version badge is invalid: '+version);

  const shell = await page.evaluate(() => {
    const visible=el=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
    return {
      appTab:document.body.dataset.appTab,
      primary:document.body.dataset.primaryNav,
      navDisplay:getComputedStyle(document.getElementById('vnextBottomNav')).display,
      navLabels:[...document.querySelectorAll('#vnextBottomNav button')].map(b=>b.lastElementChild?.textContent.trim()||''),
      hero:visible(document.getElementById('heroHome')),
      questButtons:document.querySelectorAll('#heroHome .vnextQuestButton').length,
      oldHomeHidden:['demoPass','learningLaunch','quickControls','personalWidgets','fresh'].every(id=>!visible(document.getElementById(id)))
    };
  });
  assert(shell.appTab==='Home'&&shell.primary==='Home','vNext did not start on Home: '+JSON.stringify(shell));
  assert(shell.navDisplay!=='none'&&shell.navLabels.join('|')==='Home|Explore|AI Tutor|League','vNext bottom navigation invalid: '+JSON.stringify(shell));
  assert(shell.hero&&shell.questButtons===1&&shell.oldHomeHidden,'Home is not focused on one daily quest: '+JSON.stringify(shell));

  const desktopV55=await page.evaluate(()=>({
    levelVisible:getComputedStyle(document.getElementById('desktopLevelSelect')).display!=='none',
    levelOptions:[...document.getElementById('desktopLevelSelect').options].map(o=>o.value),
    testVisible:getComputedStyle(document.getElementById('vnextQuickTestBtn')).display!=='none',
    railVisible:getComputedStyle(document.getElementById('vnextDesktopRail')).display!=='none',
    railWidth:Math.round(document.getElementById('vnextDesktopRail').getBoundingClientRect().width),
    heroWidth:Math.round(document.querySelector('.vnextHeroCore').getBoundingClientRect().width),
    weatherColor:getComputedStyle(document.getElementById('bhWeather')).color,
    learningLeft:Math.round(document.getElementById('languageBar').getBoundingClientRect().left),
    brandLeft:Math.round(document.querySelector('.brandnav').getBoundingClientRect().left),
    heroLeft:Math.round(document.getElementById('heroHome').getBoundingClientRect().left),
    weatherMini:getComputedStyle(document.getElementById('bhWeatherMini')).display
  }));
  assert(desktopV55.levelVisible&&desktopV55.levelOptions.join('|')==='auto|A1|A2|B1|B2|C1','Desktop level dropdown invalid: '+JSON.stringify(desktopV55));
  assert(desktopV55.testVisible&&desktopV55.railVisible&&desktopV55.railWidth>250&&desktopV55.heroWidth>600,'Desktop v5.5 layout not using available space: '+JSON.stringify(desktopV55));
  assert(Math.abs(desktopV55.learningLeft-desktopV55.brandLeft)<=3&&Math.abs(desktopV55.brandLeft-desktopV55.heroLeft)<=3&&desktopV55.weatherMini!=='none','Desktop containers are not aligned: '+JSON.stringify(desktopV55));
  const focus57=await page.evaluate(()=>({
    focusButton:!!document.getElementById('focusPlayerButton'),
    tabs:[...document.querySelectorAll('.focusTabs button')].map(b=>b.dataset.focusTab),
    spotify:!!document.getElementById('focusPaneSpotify')||/spotify/i.test(document.documentElement.innerHTML),
    localLabel:document.querySelector('[data-focus-tab="local"]')?.textContent.trim()||'',
    sounds:[...document.querySelectorAll('[data-focus-sound]')].map(b=>b.dataset.focusSound),
    mini:!!document.getElementById('focusMiniBar'),
    miniSelect:!!document.getElementById('focusMiniSelect'),
    localInput:!!document.getElementById('focusLocalInput'),
    native:document.getElementById('nativeLanguageSelect')?.value,
    mobileNative:!!document.getElementById('mobileNativeLanguageSelect'),
    home:!!document.getElementById('vnextHomePill'),
    notebook:!!document.querySelector('.elifStudyNotebook'),
    deviceVoice:!!document.getElementById('elifVoiceDeviceSelect')
  }));
  assert(focus57.focusButton&&focus57.tabs.join('|')==='ambient|local'&&!focus57.spotify,'Focus Player must remain Spotify-free with ambient + optional local audio only: '+JSON.stringify(focus57));
  assert(/optional/i.test(focus57.localLabel)&&focus57.sounds.length>=9&&['ocean','fireplace','forest','night','deep'].every(x=>focus57.sounds.includes(x))&&focus57.localInput&&focus57.mini&&focus57.miniSelect,'Focus moods/mini controls contract failed: '+JSON.stringify(focus57));
  assert(focus57.native==='tr'&&focus57.mobileNative&&focus57.home,'Home/native-language controls missing: '+JSON.stringify(focus57));
  assert(focus57.notebook&&focus57.deviceVoice,'Study Notebook/device voice controls missing: '+JSON.stringify(focus57));
  await page.$eval('#focusPlayerButton',el=>el.click());
  await page.waitForSelector('#focusPlayerPanel.open',{timeout:3000});
  await page.$eval('[data-focus-sound="rain"]',el=>el.click());
  const rainState=await page.evaluate(()=>({sound:focusCurrentSound,playing:document.getElementById('focusPlayerPanel').classList.contains('playing'),mini:document.getElementById('focusMiniBar').classList.contains('show')}));
  assert(rainState.sound==='rain'&&rainState.playing&&rainState.mini,'Local rain generator/mini player did not start: '+JSON.stringify(rainState));
  await page.evaluate(()=>focusMiniChange('sound:ocean'));
  let miniState=await page.evaluate(()=>({sound:focusCurrentSound,title:document.getElementById('focusMiniTitle').textContent,selected:document.getElementById('focusMiniSelect').value}));
  assert(miniState.sound==='ocean'&&/Ocean drift/.test(miniState.title)&&miniState.selected==='sound:ocean','Mini source switch failed: '+JSON.stringify(miniState));
  await page.evaluate(()=>{focusTogglePlayback();focusToggleMute();focusToggleMute();focusTogglePlayback()});
  await page.evaluate(()=>focusStopAudio(true,true));
  await new Promise(r=>setTimeout(r,3100));
  const miniHidden=await page.$eval('#focusMiniBar',el=>!el.classList.contains('show'));
  assert(miniHidden,'Mini player did not auto-hide after stop');
  await page.evaluate(()=>toggleFocusPlayer(false));
  await page.$eval('#nativeLanguageSelect',(el)=>{el.value='ka';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForFunction(()=>localStorage.getItem('teq-native-language')==='ka',{timeout:3000});
  await page.evaluate(()=>setNativeLanguage('tr'));
  await page.evaluate(()=>openTab('Explore'));
  await page.$eval('#vnextHomePill',el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.appTab==='Home',{timeout:3000});
  await page.$eval('#vnextQuickTestBtn',el=>el.click());
  await page.waitForSelector('#placementModal.open',{timeout:3000});
  await page.evaluate(()=>closePlacementTest());
  await page.$eval('#vnextCustomizeLangBtn',el=>el.click());
  await page.waitForSelector('#vnextLanguageCustomize.open',{timeout:3000});
  await page.$eval('#vnextLanguageCustomize input[data-top-lang="ru"]',el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});
  const ruHidden=await page.$eval('#languageFlags button[data-lang="ru"]',el=>getComputedStyle(el).display==='none');
  assert(ruHidden,'Language customizer did not hide a selected top-bar language');
  await page.evaluate(()=>resetTopLanguageVisibility());
  await page.evaluate(()=>toggleTopLanguageCustomize(false));

  await page.$eval('#vnavExplore',el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.appTab==='Explore'&&document.body.dataset.primaryNav==='Explore',{timeout:4000});
  await page.$eval('#vnavHome',el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.appTab==='Home',{timeout:4000});
  await page.$eval('#vnextMessageButton',el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.appTab==='Messages',{timeout:4000});
  await page.$eval('#vnextMessageButton',el=>el.click());
  await page.waitForFunction(()=>document.body.dataset.appTab==='Home',{timeout:4000});
  await page.evaluate(()=>openTab('ElifAI'));
  await page.waitForSelector('#elifAI:not(.appHidden) #elifVoicePanel',{timeout:4000});
  const voiceUi=await page.evaluate(()=>({
    start:!!document.getElementById('elifVoiceStart'),
    stop:!!document.getElementById('elifVoiceStop'),
    hands:document.getElementById('elifVoiceHandsFree')?.checked,
    autoSpeak:document.getElementById('elifVoiceAutoSpeak')?.checked,
    replay:document.querySelectorAll('#elifAiChat .elifVoiceReplay').length,
    caps:elifVoiceCapabilities(),
    plain:elifVoicePlainText('**Hello** _there_')
  }));
  assert(voiceUi.start&&voiceUi.stop&&voiceUi.hands&&voiceUi.autoSpeak&&voiceUi.replay>=1,'Voice Practice UI missing: '+JSON.stringify(voiceUi));
  assert(voiceUi.plain==='Hello there','Voice text cleanup failed: '+voiceUi.plain);
  await page.evaluate(()=>{elifVoicePrepareMode();elifVoiceStopPractice(true)});
  const voiceMode=await page.$eval('#elifAiMode',el=>el.value);
  assert(voiceMode==='conversation','Voice Practice did not select Conversation mode: '+voiceMode);
  await page.evaluate(()=>openTab('Home'));
  await page.waitForFunction(()=>document.body.dataset.appTab==='Home',{timeout:4000});

  // Spanish global mode. Use DOM click so the smoke test verifies the handler/state
  // without depending on headless Chrome's viewport hit-testing of the sticky header.
  const beforeLang = await page.evaluate(() => {
    const b=document.querySelector('#languageFlags button[data-lang="es"]');
    return {
      htmlLang: document.documentElement.lang,
      active: window.__bhActiveLanguage,
      stored: localStorage.getItem('teq-active-language'),
      handler: typeof window.setLearningLanguage,
      onclick: b?.getAttribute('onclick'),
      disabled: !!b?.disabled,
      pointerEvents: b ? getComputedStyle(b).pointerEvents : null,
      outer: b?.outerHTML
    };
  });
  console.log('Before Spanish:', JSON.stringify(beforeLang));
  console.log('Early page errors:', JSON.stringify(pageErrors));
  await page.$eval('#languageFlags button[data-lang="es"]', el => el.click());
  await new Promise(r => setTimeout(r, 500));
  let afterLang = await page.evaluate(() => ({
    htmlLang: document.documentElement.lang,
    active: window.__bhActiveLanguage,
    stored: localStorage.getItem('teq-active-language'),
    core: document.querySelector('#coreNav')?.innerText || ''
  }));
  console.log('After DOM click:', JSON.stringify(afterLang));
  if (afterLang.htmlLang !== 'es') {
    const direct = await page.evaluate(async () => {
      try {
        await window.setLearningLanguage('es');
        return {ok:true,htmlLang:document.documentElement.lang,active:window.__bhActiveLanguage,stored:localStorage.getItem('teq-active-language'),core:document.querySelector('#coreNav')?.innerText||''};
      } catch (e) {
        return {ok:false,error:String(e),stack:e?.stack||'',htmlLang:document.documentElement.lang,active:window.__bhActiveLanguage,stored:localStorage.getItem('teq-active-language')};
      }
    });
    console.log('Direct Spanish call:', JSON.stringify(direct));
    afterLang = direct;
  }
  console.log('Page errors after switch:', JSON.stringify(pageErrors));
  await page.waitForFunction(() => document.documentElement.lang === 'es', {timeout:8000});
  const coreEs = await page.$eval('#coreNav', el => el.innerText);
  assert(coreEs.includes('Inicio') && coreEs.includes('Aprender') && coreEs.includes('Mensajes') && coreEs.includes('Personalizar'), 'Spanish core navigation did not localize: '+coreEs);

  const widgetEs = await page.$eval('#widgetGrid', el => el.innerText);
  assert(widgetEs.includes('Palabra del día'), 'Spanish Word of the Day missing: '+widgetEs.slice(0,300));

  // Spanish A1 native curriculum.
  await page.evaluate(() => openTab('Learn'));
  await page.waitForSelector('#languageHub:not(.appHidden) .languageUnit', {timeout:5000});
  const spanishUnits = await page.$$eval('#languageCourseGrid .languageUnit', els => els.map(x => x.innerText));
  assert(spanishUnits.length >= 5, 'Expected >=5 Spanish A1 native units');
  await page.$eval('#languageCourseGrid .languageUnit', el => el.click());
  await page.waitForSelector('#languageLesson:not(.appHidden)', {timeout:5000});
  const listenText = await page.$eval('#langLessonListen', el => el.textContent.trim());
  assert(/Escuchar/i.test(listenText), 'Spanish lesson listen control missing: '+listenText);
  await page.click('#langLessonClose');

  // Return to English and inspect Grammar cards.
  await page.click('#languageFlags button[data-lang="en"]');
  await page.waitForFunction(() => document.documentElement.lang === 'en', {timeout:5000});
  await page.evaluate(() => showAppTab('Grammar', null));
  await page.waitForSelector('.mission[data-cat="Grammar"]', {timeout:5000});
  const grammarControls = await page.$$eval('.mission[data-cat="Grammar"]', cards => cards.map(card => ({
    listen: !!card.querySelector('.grammarListen'),
    sizers: card.querySelectorAll(':scope > .cardSizer button').length
  })));
  assert(grammarControls.length >= 3, 'Expected grammar cards');
  assert(grammarControls.every(x => x.listen && x.sizers === 2), 'Grammar listen/resize controls missing: '+JSON.stringify(grammarControls));

  const firstGrammar = await page.$('.mission[data-cat="Grammar"]');
  const sizeButtons = await firstGrammar.$$('.cardSizer button');
  await sizeButtons[1].click();
  const expanded = await firstGrammar.evaluate(el => el.classList.contains('cardExpanded'));
  assert(expanded, 'Grammar card did not expand');
  await sizeButtons[0].click();
  const normalized = await firstGrammar.evaluate(el => !el.classList.contains('cardExpanded') && !el.classList.contains('cardCompact'));
  assert(normalized, 'Grammar card did not return to normal size');

  // Podcast player: CC must have meaningful fullscreen content, never blank.
  await page.evaluate(() => showAppTab('Podcasts', null));
  await page.waitForFunction(() => document.querySelectorAll('#freshGrid .playHere').length > 0, {timeout:15000});
  await page.click('#freshGrid .playHere');
  await page.waitForSelector('#mediaDock.open', {timeout:5000});
  const ccVisible = await page.$eval('#mediaCaptionToggle', el => getComputedStyle(el).display !== 'none');
  assert(ccVisible, 'CC button hidden for audio');
  const captionText = await page.$eval('#mediaCaptionPanel', el => el.innerText.trim());
  assert(captionText.length > 20, 'Caption/study panel is blank');

  await page.click('#mediaCaptionToggle');
  let ccOn = await page.$eval('#mediaDock', el => el.classList.contains('captionsOn'));
  assert(!ccOn, 'CC did not turn off');
  await page.click('#mediaCaptionToggle');
  ccOn = await page.$eval('#mediaDock', el => el.classList.contains('captionsOn'));
  assert(ccOn, 'CC did not turn on');

  const fsButton = await page.$('#mediaDock .mediaTools button[title="Fullscreen"]');
  if (fsButton) {
    await fsButton.click();
    await new Promise(r => setTimeout(r, 700));
    const fsState = await page.$eval('#mediaDock', el => !!document.fullscreenElement || el.classList.contains('fullscreenFallback'));
    assert(fsState, 'Fullscreen/fallback state did not activate');
    const fsText = await page.$eval('#mediaCaptionPanel', el => el.innerText.trim());
    assert(fsText.length > 20, 'Fullscreen caption/study panel became blank');
  }

  // Minimal mobile shell: no weather, Focus Player, level bar or desktop account chip.
  const mobilePage=await browser.newPage();
  await mobilePage.setViewport({width:390,height:844});
  await mobilePage.evaluateOnNewDocument(()=>localStorage.clear());
  await mobilePage.goto(LOCAL_ORIGIN+'/?mobile-smoke=1',{waitUntil:'domcontentloaded',timeout:30000});
  await mobilePage.waitForSelector('#mobileCompactTop',{timeout:10000});
  const mobileShell=await mobilePage.evaluate(()=>({
    top:Math.round(document.querySelector('.top')?.getBoundingClientRect().height||0),
    compact:getComputedStyle(document.getElementById('mobileCompactTop')).display,
    learning:getComputedStyle(document.getElementById('languageBar')).display,
    brand:getComputedStyle(document.querySelector('.brandnav')).display,
    weather:getComputedStyle(document.getElementById('bhWeatherMini')).display,
    focus:getComputedStyle(document.getElementById('focusPlayerButton')).display,
    focusMini:getComputedStyle(document.getElementById('focusMiniBar')).display,
    account:getComputedStyle(document.getElementById('eqAccountButton')).display,
    nav:getComputedStyle(document.getElementById('vnextBottomNav')).display,
    overflow:document.documentElement.scrollWidth-innerWidth
  }));
  assert(mobileShell.top<=60&&mobileShell.compact!=='none'&&mobileShell.nav!=='none','Minimal mobile shell failed: '+JSON.stringify(mobileShell));
  assert(mobileShell.learning==='none'&&mobileShell.brand==='none'&&mobileShell.weather==='none'&&mobileShell.focus==='none'&&mobileShell.focusMini==='none'&&mobileShell.account==='none','Desktop controls leaked into mobile: '+JSON.stringify(mobileShell));
  assert(mobileShell.overflow<=4,'Minimal mobile shell overflows horizontally: '+JSON.stringify(mobileShell));
  await mobilePage.$eval('#mobileSettingsButton',el=>el.click());
  await mobilePage.waitForSelector('#mobileMenu.open',{timeout:3000});
  const mobileDrawer=await mobilePage.evaluate(()=>({
    language:document.getElementById('mobileLanguageSelect')?.value,
    level:document.getElementById('mobileLevelSelect')?.value,
    quick:getComputedStyle(document.querySelector('.mobileQuickTestAction')).display,
    quickNav:getComputedStyle(document.getElementById('mobileQuickNav')).display
  }));
  assert(mobileDrawer.language==='en'&&mobileDrawer.level&&mobileDrawer.quick!=='none'&&mobileDrawer.quickNav==='none','Mobile settings drawer is not minimal/usable: '+JSON.stringify(mobileDrawer));
  await mobilePage.close();

  const fatalConsole=consoleErrors.filter(e=>{
    if(!/Failed to load resource/i.test(e.text))return true;
    if(e.url&&e.url.startsWith(LOCAL_ORIGIN))return true;
    if(e.url&&!e.url.startsWith(LOCAL_ORIGIN))return false;
    return sameOriginHttpErrors.length>0||externalHttpErrors.length===0;
  });
  assert(pageErrors.length === 0, 'Page errors: '+pageErrors.join(' | '));
  assert(sameOriginHttpErrors.length === 0, 'Same-origin HTTP errors: '+JSON.stringify(sameOriginHttpErrors));
  assert(fatalConsole.length === 0, 'Console errors: '+JSON.stringify(fatalConsole));
  if(externalHttpErrors.length)console.log('External provider warnings:',JSON.stringify(externalHttpErrors.slice(0,8)));
  console.log('BatumHub UI smoke: PASS');
  console.log(JSON.stringify({version,spanishUnits:spanishUnits.length,grammarCards:grammarControls.length,captionChars:captionText.length}));
} finally {
  await browser.close();
}

// v5.7-focus final gate

// v5.7-focus attempt-2 gate

// v5.7-focus compact-header verification
