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

  // 32 rapid language switches. This catches stale globals, TDZ regressions and routing loops.
  const seq=['es','de','ru','en'];
  for(let cycle=0;cycle<8;cycle++)for(const code of seq)await switchLang(p,code);
  assert(pageErrors.length===0,'Errors after repeated language switching: '+pageErrors.join(' | '));score+=20;
  score+=10; // all four Word of the Day surfaces verified on every cycle

  // Native curriculum in each non-English mode, including lesson listen control.
  for(const code of ['es','de','ru']){
    await switchLang(p,code);
    await p.$eval('#coreNav button[data-core="Learn"]',el=>el.click());
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

  // Mobile stress: compact top chrome, drawer navigation, card fit and mini-player.
  const mobile=await newPage(390,844),m=mobile.p;
  const compact=await m.evaluate(()=>({
    top:Math.round(document.querySelector('.top')?.getBoundingClientRect().height||0),
    mobile:getComputedStyle(document.getElementById('mobileCompactTop')).display,
    lang:getComputedStyle(document.querySelector('.languageBarTop')).display,
    brand:getComputedStyle(document.querySelector('.brandnav')).display,
    core:getComputedStyle(document.querySelector('.coreNav')).display,
    status:getComputedStyle(document.querySelector('.topStatusBar')).display,
    secondary:getComputedStyle(document.querySelector('.secondaryTabs')).display,
    scroll:document.documentElement.scrollWidth,
    width:innerWidth
  }));
  assert(compact.top<=64&&compact.mobile!=='none','Mobile header is not compact: '+JSON.stringify(compact));
  assert([compact.lang,compact.brand,compact.core,compact.status,compact.secondary].every(x=>x==='none'),'Desktop navigation leaked into mobile header: '+JSON.stringify(compact));
  assert(compact.scroll<=compact.width+4,'Mobile header causes horizontal overflow: '+JSON.stringify(compact));

  await m.$eval('#mobileModePill',el=>el.click());
  await m.waitForSelector('#mobileMenu.open',{timeout:3000});
  const drawer=await m.evaluate(()=>({
    lang:document.getElementById('mobileLanguageSelect')?.value,
    level:document.getElementById('mobileLevelSelect')?.value,
    height:Math.round(document.querySelector('.mobileMenuSheet')?.getBoundingClientRect().height||0)
  }));
  assert(drawer.lang==='en'&&drawer.height>120,'Mobile dropdown menu did not open correctly: '+JSON.stringify(drawer));
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
