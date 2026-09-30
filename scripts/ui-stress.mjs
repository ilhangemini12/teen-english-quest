import puppeteer from 'puppeteer-core';

const chromePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
async function launchBrowser(){
  let last;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      return await puppeteer.launch({
        executablePath:chromePath,
        headless:true,
        timeout:45000,
        args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
      });
    }catch(e){last=e;if(attempt<2)await new Promise(r=>setTimeout(r,1800));}
  }
  throw last;
}
const browser=await launchBrowser();

function assert(cond,msg){if(!cond)throw new Error(msg)}
const expected={
  en:{home:'Home',word:'Word of the Day'},
  es:{home:'Inicio',word:'Palabra del día'},
  de:{home:'Start',word:'Wort des Tages'},
  ru:{home:'Главная',word:'Слово дня'}
};

async function newPage(width,height){
  const p=await browser.newPage();
  await p.setViewport({width,height});
  const pageErrors=[];
  p.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  await p.evaluateOnNewDocument(()=>localStorage.clear());
  await p.goto('http://127.0.0.1:4173/?stress=1',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForSelector('#languageFlags button[data-lang="es"]',{timeout:10000});
  return {p,pageErrors};
}
async function switchLang(p,code){
  await p.$eval('#languageFlags button[data-lang="'+code+'"]',el=>el.click());
  await p.waitForFunction(c=>document.documentElement.lang===c,{timeout:5000},code);
  await new Promise(r=>setTimeout(r,60));
  const state=await p.evaluate(c=>({
    lang:document.documentElement.lang,
    core:document.querySelector('#coreNav')?.innerText||'',
    widget:document.querySelector('#widgetGrid')?.innerText||'',
    active:window.__bhActiveLanguage,
    stored:localStorage.getItem('teq-active-language')
  }),code);
  assert(state.lang===code&&state.active===code&&state.stored===code,'Language state mismatch '+code+': '+JSON.stringify(state));
  assert(state.core.includes(expected[code].home),'Core nav not localized for '+code+': '+state.core);
  assert(state.widget.includes(expected[code].word),'Word widget not localized for '+code+': '+state.widget.slice(0,200));
}

let score=0;
try{
  const {p,pageErrors}=await newPage(1280,900);
  const version=await p.$eval('#bhVersion',el=>el.textContent.trim());
  assert(/^v\d+\.\d+$/.test(version),'Visible version badge is invalid: '+version);score+=10;
  assert(pageErrors.length===0,'Startup page errors: '+pageErrors.join(' | '));score+=15;

  const desktop55=await p.evaluate(()=>({
    rail:getComputedStyle(document.getElementById('vnextDesktopRail')).display,
    railWidth:Math.round(document.getElementById('vnextDesktopRail').getBoundingClientRect().width),
    heroWidth:Math.round(document.querySelector('.vnextHeroCore').getBoundingClientRect().width),
    level:[...document.getElementById('desktopLevelSelect').options].map(o=>o.value),
    quick:getComputedStyle(document.getElementById('vnextQuickTestBtn')).display
  }));
  assert(desktop55.rail!=='none'&&desktop55.railWidth>250&&desktop55.heroWidth>600,'Desktop v5.5 layout failed: '+JSON.stringify(desktop55));
  assert(desktop55.level.join('|')==='auto|A1|A2|B1|B2|C1'&&desktop55.quick!=='none','Desktop level/test controls failed: '+JSON.stringify(desktop55));
  for(const native of ['tr','es','ka','ru','de','en','tr']){
    await p.evaluate(n=>setNativeLanguage(n),native);
    const saved=await p.evaluate(()=>localStorage.getItem('teq-native-language'));
    assert(saved===native,'Native-language state mismatch: '+native+' -> '+saved);
  }
  for(let i=0;i<10;i++){
    await p.evaluate(n=>{toggleFocusPlayer(true);focusPlaySound(n%2?'brown':'rain');focusStopAudio();toggleFocusPlayer(false)},i);
  }
  const focusStress=await p.evaluate(()=>({
    spotify:/spotify/i.test(document.documentElement.innerHTML)||!!document.getElementById('focusPaneSpotify'),
    localLabel:document.querySelector('[data-focus-tab="local"]')?.textContent.trim()||'',
    tabs:[...document.querySelectorAll('.focusTabs button')].map(b=>b.dataset.focusTab),
    ctx:!!(window.AudioContext||window.webkitAudioContext),
    bestVoice:typeof elifVoicePickVoice==='function'
  }));
  assert(!focusStress.spotify&&/optional/i.test(focusStress.localLabel)&&focusStress.tabs.join('|')==='ambient|local'&&focusStress.bestVoice,'Focus/voice stress state invalid: '+JSON.stringify(focusStress));
  await p.evaluate(()=>openTab('ElifAI'));
  await p.waitForSelector('#elifAI:not(.appHidden) #elifVoicePanel',{timeout:4000});
  const voiceStress=await p.evaluate(()=>({
    caps:elifVoiceCapabilities(),
    speakerButtons:document.querySelectorAll('.elifVoiceReplay').length,
    panel:!!document.getElementById('elifVoicePanel'),
    plain:elifVoicePlainText('**Voice** practice')
  }));
  assert(voiceStress.panel&&voiceStress.speakerButtons>=1&&voiceStress.plain==='Voice practice','Voice Practice shell failed: '+JSON.stringify(voiceStress));
  for(let i=0;i<12;i++){await p.evaluate(()=>{elifVoiceStopPractice(true);elifVoiceRenderSupport();elifVoicePrepareMode()})}
  await p.evaluate(()=>openTab('Home'));
  assert(pageErrors.length===0,'Voice Practice lifecycle caused page errors: '+pageErrors.join(' | '));
  for(const value of ['A2','B1','auto']){
    await p.$eval('#desktopLevelSelect',(el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))},value);
    await new Promise(r=>setTimeout(r,80));
  }

  // 32 rapid language switches. This catches stale globals, TDZ regressions and routing loops.
  const seq=['es','de','ru','en'];
  for(let cycle=0;cycle<8;cycle++)for(const code of seq)await switchLang(p,code);
  assert(pageErrors.length===0,'Errors after repeated language switching: '+pageErrors.join(' | '));score+=20;
  score+=10; // all four Word of the Day surfaces verified on every cycle

  // Native curriculum in each non-English mode, including lesson listen control.
  for(const code of ['es','de','ru']){
    await switchLang(p,code);
    await p.evaluate(()=>openTab('Learn'));
    await p.waitForSelector('#languageHub:not(.appHidden) .languageUnit',{timeout:5000});
    const count=await p.$$eval('#languageCourseGrid .languageUnit',els=>els.length);
    assert(count>=4,'Too few native units for '+code+': '+count);
    await p.$eval('#languageCourseGrid .languageUnit',el=>el.click());
    await p.waitForSelector('#languageLesson:not(.appHidden)',{timeout:5000});
    const listen=await p.$eval('#langLessonListen',el=>({text:el.textContent.trim(),visible:getComputedStyle(el).display!=='none'}));
    assert(listen.visible&&listen.text.length>2,'Lesson listen control missing for '+code);
    await p.$eval('#langLessonClose',el=>el.click());
  }
  score+=15;

  // English Grammar controls: repeated resize cycles + in-place listening.
  await switchLang(p,'en');
  await p.evaluate(()=>showAppTab('Grammar',null));
  await p.waitForSelector('.mission[data-cat="Grammar"]',{timeout:5000});
  const controls=await p.$$eval('.mission[data-cat="Grammar"]',cards=>cards.map(c=>({
    listen:!!c.querySelector('.grammarListen'),
    sizers:c.querySelectorAll(':scope > .cardSizer button').length
  })));
  assert(controls.length>=3&&controls.every(x=>x.listen&&x.sizers===2),'Grammar controls incomplete: '+JSON.stringify(controls));
  for(let i=0;i<25;i++){
    await p.$eval('.mission[data-cat="Grammar"] .cardSizer button:nth-child(2)',el=>el.click());
    assert(await p.$eval('.mission[data-cat="Grammar"]',el=>el.classList.contains('cardExpanded')),'Card failed expand cycle '+i);
    await p.$eval('.mission[data-cat="Grammar"] .cardSizer button:nth-child(1)',el=>el.click());
    assert(await p.$eval('.mission[data-cat="Grammar"]',el=>!el.classList.contains('cardExpanded')&&!el.classList.contains('cardCompact')),'Card failed normalize cycle '+i);
  }
  await p.$eval('.mission[data-cat="Grammar"] .grammarListen',el=>el.click());
  await p.waitForSelector('#mediaDock.open',{timeout:5000});
  const ttsCaption=await p.$eval('#mediaCaptionPanel',el=>el.innerText.trim());
  assert(ttsCaption.length>15,'Grammar listening opened blank caption surface');
  await p.evaluate(()=>closeMedia());
  score+=15;

  // Podcast player: repeat open/close, CC and fullscreen content.
  await p.evaluate(()=>showAppTab('Podcasts',null));
  await p.waitForFunction(()=>document.querySelectorAll('#freshGrid .playHere').length>0,{timeout:15000});
  for(let i=0;i<6;i++){
    await p.$eval('#freshGrid .playHere',el=>el.click());
    await p.waitForSelector('#mediaDock.open',{timeout:5000});
    const text=await p.$eval('#mediaCaptionPanel',el=>el.innerText.trim());
    assert(text.length>20,'Podcast caption/study panel blank on cycle '+i);
    await p.$eval('#mediaCaptionToggle',el=>el.click());
    assert(!(await p.$eval('#mediaDock',el=>el.classList.contains('captionsOn'))),'CC failed off cycle '+i);
    await p.$eval('#mediaCaptionToggle',el=>el.click());
    assert(await p.$eval('#mediaDock',el=>el.classList.contains('captionsOn')),'CC failed on cycle '+i);
    if(i===0){
      await p.evaluate(()=>mediaFullscreen());
      await new Promise(r=>setTimeout(r,300));
      const fs=await p.$eval('#mediaDock',el=>({
        on:!!document.fullscreenElement||el.classList.contains('fullscreenFallback'),
        text:document.querySelector('#mediaCaptionPanel')?.innerText.trim()||''
      }));
      assert(fs.on&&fs.text.length>20,'Fullscreen audio surface blank or inactive');
      if(await p.evaluate(()=>!!document.fullscreenElement))await p.evaluate(()=>document.exitFullscreen());
    }
    await p.evaluate(()=>closeMedia());
  }
  score+=10;
  assert(pageErrors.length===0,'Desktop page errors: '+pageErrors.join(' | '));

  // Mobile vNext shell: brand + tiny weather + messages/account on top, four-item bottom nav.
  const mobile=await newPage(390,844),m=mobile.p;
  const compact=await m.evaluate(()=>({
    top:Math.round(document.querySelector('.top')?.getBoundingClientRect().height||0),
    legacyMobile:getComputedStyle(document.getElementById('mobileCompactTop')).display,
    lang:getComputedStyle(document.querySelector('.languageBarTop')).display,
    brand:getComputedStyle(document.querySelector('.brandnav')).display,
    core:getComputedStyle(document.querySelector('.coreNav')).display,
    status:getComputedStyle(document.querySelector('.topStatusBar')).display,
    weatherMini:getComputedStyle(document.getElementById('bhWeatherMini')).display,
    secondary:getComputedStyle(document.querySelector('.secondaryTabs')).display,
    bottom:getComputedStyle(document.getElementById('vnextBottomNav')).display,
    nav:[...document.querySelectorAll('#vnextBottomNav button')].map(b=>b.lastElementChild?.textContent.trim()||''),
    appTab:document.body.dataset.appTab,
    primary:document.body.dataset.primaryNav,
    questButtons:document.querySelectorAll('#heroHome .vnextQuestButton').length,
    scroll:document.documentElement.scrollWidth,
    width:innerWidth
  }));
  assert(compact.top<=100&&compact.legacyMobile==='none','Legacy mobile header leaked into vNext: '+JSON.stringify(compact));
  assert(compact.brand!=='none'&&compact.weatherMini!=='none'&&compact.bottom!=='none','vNext mobile shell missing: '+JSON.stringify(compact));
  assert(compact.status==='none'&&compact.lang==='none'&&compact.core==='none'&&compact.secondary==='none','Legacy secondary chrome leaked into vNext mobile header: '+JSON.stringify(compact));
  assert(compact.nav.join('|')==='Home|Explore|AI Tutor|League'&&compact.appTab==='Home'&&compact.primary==='Home'&&compact.questButtons===1,'vNext mobile navigation/home focus invalid: '+JSON.stringify(compact));
  assert(compact.scroll<=compact.width+4,'Mobile shell causes horizontal overflow: '+JSON.stringify(compact));

  for(const [id,tab,primary] of [['vnavExplore','Explore','Explore'],['vnavTutor','ElifAI','Tutor'],['vnavLeague','League','League'],['vnavHome','Home','Home']]){
    await m.$eval('#'+id,el=>el.click());
    await m.waitForFunction((t,p)=>document.body.dataset.appTab===t&&document.body.dataset.primaryNav===p,{timeout:4000},tab,primary);
  }
  await m.$eval('#vnextMessageButton',el=>el.click());
  await m.waitForFunction(()=>document.body.dataset.appTab==='Messages',{timeout:4000});
  await m.$eval('#vnextMessageButton',el=>el.click());
  await m.waitForFunction(()=>document.body.dataset.appTab==='Home',{timeout:4000});

  await m.$eval('#eqAccountButton',el=>el.click());
  await m.waitForSelector('#mobileMenu.open',{timeout:3000});
  const drawer=await m.evaluate(()=>({
    lang:document.getElementById('mobileLanguageSelect')?.value,
    level:document.getElementById('mobileLevelSelect')?.value,
    height:Math.round(document.querySelector('.mobileMenuSheet')?.getBoundingClientRect().height||0)
  }));
  assert(drawer.lang==='en'&&drawer.height>120,'Avatar secondary menu did not open correctly: '+JSON.stringify(drawer));
  await m.evaluate(()=>toggleMobileMenu(false));

  await m.evaluate(()=>setLearningLanguage('es'));
  await m.waitForFunction(()=>document.documentElement.lang==='es',{timeout:5000});
  await m.evaluate(()=>showAppTab('Learn',null));
  await m.waitForSelector('#languageHub:not(.appHidden) .languageUnit',{timeout:5000});
  await m.evaluate(()=>setLearningLanguage('en'));
  await m.waitForFunction(()=>document.documentElement.lang==='en',{timeout:5000});
  await m.evaluate(()=>showAppTab('Grammar',null));
  const fit=await m.$eval('.mission[data-cat="Grammar"]',el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth};
  });
  assert(fit.left>=-2&&fit.right<=fit.width+2&&fit.scroll<=fit.width+4,'Mobile grammar card overflow: '+JSON.stringify(fit));
  await m.$eval('.mission[data-cat="Grammar"] .cardSizer button:nth-child(2)',el=>el.click());
  const fit2=await m.$eval('.mission[data-cat="Grammar"]',el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth}});
  assert(fit2.left>=-2&&fit2.right<=fit2.width+2&&fit2.scroll<=fit2.width+4,'Expanded mobile card overflow: '+JSON.stringify(fit2));

  await m.evaluate(()=>showAppTab('Podcasts',null));
  await m.waitForFunction(()=>document.querySelectorAll('#freshGrid .playHere').length>0,{timeout:15000});
  await m.$eval('#freshGrid .playHere',el=>el.click());
  await m.waitForSelector('#mediaDock.open',{timeout:5000});
  const mini=await m.$eval('#mediaDock',el=>{
    const r=el.getBoundingClientRect(),p=document.getElementById('mediaCaptionPanel');
    return {height:Math.round(r.height),bottom:Math.round(innerHeight-r.bottom),captions:el.classList.contains('captionsOn'),panel:getComputedStyle(p).display};
  });
  assert(mini.height<190&&mini.bottom<=12&&!mini.captions,'Mobile audio player is not compact by default: '+JSON.stringify(mini));
  await m.$eval('#mediaCaptionToggle',el=>el.click());
  const expandedCaption=await m.$eval('#mediaDock',el=>({height:Math.round(el.getBoundingClientRect().height),viewport:innerHeight,captions:el.classList.contains('captionsOn')}));
  assert(expandedCaption.captions&&expandedCaption.height<=expandedCaption.viewport*.58,'Mobile caption sheet is too tall: '+JSON.stringify(expandedCaption));
  await m.evaluate(()=>closeMedia());

  // VOA should open as an in-Hub reader when enriched study text is available.
  await m.waitForFunction(()=>Array.isArray(freshItems)&&freshItems.some(x=>isVoaItem(x)&&x.study_text&&x.study_text.length>80),{timeout:15000});
  const voaKey=await m.evaluate(()=>freshItems.find(x=>isVoaItem(x)&&x.study_text&&x.study_text.length>80)?.key||'');
  assert(voaKey,'No enriched VOA item available');
  await m.evaluate(k=>openFreshInHub(k),voaKey);
  await m.waitForSelector('#mediaDock.open.sourceMode .voaReader',{timeout:5000});
  const voaReader=await m.$eval('.voaReader',el=>({text:el.innerText.length,scroll:el.scrollHeight,client:el.clientHeight}));
  assert(voaReader.text>120,'VOA in-Hub reader is too thin: '+JSON.stringify(voaReader));
  await m.evaluate(()=>closeMedia());

  assert(mobile.pageErrors.length===0,'Mobile page errors: '+mobile.pageErrors.join(' | '));
  score+=5;

  console.log('BatumHub UI stress: PASS');
  console.log(JSON.stringify({score,version,languageSwitches:32,grammarResizeCycles:25,podcastCycles:6,desktopErrors:pageErrors.length,mobileErrors:mobile.pageErrors.length}));
  assert(score===100,'Stress score was '+score+'/100');
} finally {
  await browser.close();
}

// v5.7-focus final gate

// v5.7-focus compact-header verification
