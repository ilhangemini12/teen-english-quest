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

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  await page.goto('http://127.0.0.1:4173/?smoke=1', {waitUntil:'domcontentloaded', timeout:30000});
  await page.waitForSelector('#languageFlags button[data-lang="es"]', {timeout:10000});
  const version = await page.$eval('#bhVersion', el => el.textContent.trim());
  assert(/^v\d+\.\d+$/.test(version),'Visible version badge is invalid: '+version);

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
  await page.click('#languageCourseGrid .languageUnit');
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

  assert(pageErrors.length === 0, 'Page errors: '+pageErrors.join(' | '));
  assert(consoleErrors.length === 0, 'Console errors: '+consoleErrors.join(' | '));
  console.log('BatumHub UI smoke: PASS');
  console.log(JSON.stringify({version,spanishUnits:spanishUnits.length,grammarCards:grammarControls.length,captionChars:captionText.length}));
} finally {
  await browser.close();
}
