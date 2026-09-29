import puppeteer from 'puppeteer-core';

const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage();
await page.setViewport({width: 1280, height: 900});
await page.evaluateOnNewDocument(() => localStorage.clear());

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  await page.goto('http://127.0.0.1:4173/?smoke=1', {waitUntil:'domcontentloaded', timeout:30000});
  await page.waitForSelector('#languageFlags button[data-lang="es"]', {timeout:10000});
  const version = await page.$eval('#bhVersion', el => el.textContent.trim());
  assert(version === 'v5.1', 'Expected v5.1, got '+version);

  // Spanish global mode.
  await page.click('#languageFlags button[data-lang="es"]');
  await page.waitForFunction(() => document.documentElement.lang === 'es', {timeout:5000});
  const coreEs = await page.$eval('#coreNav', el => el.innerText);
  assert(coreEs.includes('Inicio') && coreEs.includes('Aprender') && coreEs.includes('Mensajes') && coreEs.includes('Personalizar'), 'Spanish core navigation did not localize: '+coreEs);

  const widgetEs = await page.$eval('#widgetGrid', el => el.innerText);
  assert(widgetEs.includes('Palabra del día'), 'Spanish Word of the Day missing: '+widgetEs.slice(0,300));

  // Spanish A1 native curriculum.
  await page.click('#coreNav button[data-core="Learn"]');
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
  console.log('BatumHub UI smoke: PASS');
  console.log(JSON.stringify({version,spanishUnits:spanishUnits.length,grammarCards:grammarControls.length,captionChars:captionText.length}));
} finally {
  await browser.close();
}
