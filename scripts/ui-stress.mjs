import puppeteer from 'puppeteer-core';

const chromePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  executablePath:chromePath,
  headless:true,
  args:['--no-sandbox','--disable-setuid-sandbox','--autoplay-policy=no-user-gesture-required']
});

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

  // Mobile stress: language routing, curriculum, card fit, media top offset.
  const mobile=await newPage(390,844),m=mobile.p;
  await switchLang(m,'es');
  await m.$eval('#coreNav button[data-core="Learn"]',el=>el.click());
  await m.waitForSelector('#languageHub:not(.appHidden) .languageUnit',{timeout:5000});
  await switchLang(m,'en');
  await m.evaluate(()=>showAppTab('Grammar',null));
  const fit=await m.$eval('.mission[data-cat="Grammar"]',el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth};
  });
  assert(fit.left>=-2&&fit.right<=fit.width+2&&fit.scroll<=fit.width+4,'Mobile grammar card overflow: '+JSON.stringify(fit));
  await m.$eval('.mission[data-cat="Grammar"] .cardSizer button:nth-child(2)',el=>el.click());
  const fit2=await m.$eval('.mission[data-cat="Grammar"]',el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth}});
  assert(fit2.left>=-2&&fit2.right<=fit2.width+2&&fit2.scroll<=fit2.width+4,'Expanded mobile card overflow: '+JSON.stringify(fit2));
  assert(mobile.pageErrors.length===0,'Mobile page errors: '+mobile.pageErrors.join(' | '));
  score+=5;

  console.log('BatumHub UI stress: PASS');
  console.log(JSON.stringify({score,version,languageSwitches:32,grammarResizeCycles:25,podcastCycles:6,desktopErrors:pageErrors.length,mobileErrors:mobile.pageErrors.length}));
  assert(score===100,'Stress score was '+score+'/100');
} finally {
  await browser.close();
}
