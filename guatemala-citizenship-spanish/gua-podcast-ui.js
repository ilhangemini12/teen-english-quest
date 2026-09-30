(() => {
 const E=window.GUA_PODCASTS||[];
 let idx=Number(localStorage.getItem('guaPodcastIdx')||0); if(idx<0||idx>=E.length)idx=0;
 let speaking=false,utter=null;
 const isNative=()=>!!(window.GuaNative&&typeof window.GuaNative.playPlaylist==='function');
 function esc(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
 function add(){
   const nav=document.querySelector('.nav');
   if(nav&&!document.querySelector('[data-tab="podcast"]')){
     const b=document.createElement('button');b.className='tab';b.dataset.tab='podcast';b.textContent='🎧 Gym Podcast';b.onclick=()=>go('podcast');
     const data=nav.querySelector('[data-tab="data"]');nav.insertBefore(b,data||null);
   }
   const main=document.querySelector('main.wrap');
   if(main&&!document.getElementById('podcast')){
     const s=document.createElement('section');s.id='podcast';s.className='section';
     s.innerHTML='<h2>🎧 GUA Gym / Podcast Mode</h2><p class="muted">Ekrana bakmadan dinle, shadowing yap ve cevaplarını yüksek sesle ver. APK içinde ekran kilitliyken de devam eder.</p><div class="two"><div class="card"><span class="pill">BACKGROUND AUDIO</span><h3 id="guaPodTitle"></h3><p id="guaPodSummary" class="muted"></p><div class="podControls"><button class="btn" onclick="guaPrev()">⏮</button><button class="btn podMain" onclick="guaPlay()">▶ Dinle</button><button class="btn" onclick="guaPause()">⏸</button><button class="btn" onclick="guaResume()">⏯</button><button class="btn" onclick="guaStop()">⏹</button><button class="btn" onclick="guaNext()">⏭</button></div><label>Hız <select id="guaRate" onchange="guaRateChanged()"><option value="0.8">0.8×</option><option value="0.9">0.9×</option><option value="1" selected>1.0×</option><option value="1.1">1.1×</option><option value="1.2">1.2×</option></select></label><p class="small muted" id="guaPodMode"></p><div class="actions"><button class="btn" onclick="guaOpenGPT()">GUA GPT Project ↗</button><button class="btn" onclick="go(\'interview\')">Konuşma pratiğine geç</button></div></div><div class="card"><h3>Bölümler</h3><div id="guaEpisodeList"></div></div></div>';
     main.appendChild(s);
   }
   if(!document.getElementById('guaPodStyle')){const st=document.createElement('style');st.id='guaPodStyle';st.textContent='.podControls{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.podControls .podMain{background:#1d665a}.podEpisode{display:block;width:100%;text-align:left;border:1px solid var(--line);background:#0b1b28;color:var(--text);border-radius:12px;padding:11px;margin:7px 0;cursor:pointer}.podEpisode.on{border-color:var(--accent);background:#12352f}.podEpisode b,.podEpisode span{display:block}.podEpisode span{font-size:12px;color:var(--muted);margin-top:3px}';document.head.appendChild(st)}
   render();
 }
 function render(){
   const e=E[idx];if(!e)return;
   const t=document.getElementById('guaPodTitle'),s=document.getElementById('guaPodSummary'),m=document.getElementById('guaPodMode'),l=document.getElementById('guaEpisodeList');
   if(t)t.textContent=e.title+' · ~'+e.minutes+' dk'; if(s)s.textContent=e.summary;
   if(m)m.textContent=isNative()?'APK modu: gerçek arka plan oynatma aktif. Bildirimden kontrol edebilirsin.':'Web modu: cihaz/tarayıcı TTS kullanılır; ekran kapalıyken devam garantisi yok.';
   if(l)l.innerHTML=E.map((x,i)=>'<button class="podEpisode '+(i===idx?'on':'')+'" onclick="guaSelect('+i+')"><b>'+esc(x.title)+'</b><span>'+esc(x.level)+' · ~'+x.minutes+' dk · '+esc(x.summary)+'</span></button>').join('');
   localStorage.setItem('guaPodcastIdx',String(idx));
 }
 function rate(){return Number(document.getElementById('guaRate')?.value||1)}
 function webPlay(){
   if(!('speechSynthesis' in window)){alert('Bu tarayıcı TTS desteklemiyor. APK Gym Mode kullan.');return}
   speechSynthesis.cancel();utter=new SpeechSynthesisUtterance(E[idx].text);utter.lang='es-GT';utter.rate=rate();utter.onend=()=>{if(idx<E.length-1){idx++;render();webPlay()}};speechSynthesis.speak(utter);speaking=true;
 }
 window.guaPlay=()=>{if(isNative()){window.GuaNative.playPlaylist(JSON.stringify(E.map(x=>({title:x.title,text:x.text}))),idx,rate())}else webPlay()};
 window.guaPause=()=>{if(isNative())window.GuaNative.pause();else if(speechSynthesis.speaking)speechSynthesis.pause()};
 window.guaResume=()=>{if(isNative())window.GuaNative.resume();else if(speechSynthesis.paused)speechSynthesis.resume()};
 window.guaStop=()=>{if(isNative())window.GuaNative.stop();else{speechSynthesis.cancel();speaking=false}};
 window.guaNext=()=>{idx=(idx+1)%E.length;render();window.guaPlay()};
 window.guaPrev=()=>{idx=(idx-1+E.length)%E.length;render();window.guaPlay()};
 window.guaSelect=i=>{idx=i;render()};
 window.guaRateChanged=()=>{};
 window.guaOpenGPT=()=>{const url=localStorage.getItem('guaGptProjectUrl')||'https://chatgpt.com/';if(isNative()&&window.GuaNative.openExternal)window.GuaNative.openExternal(url);else window.open(url,'_blank','noopener')};
 document.addEventListener('DOMContentLoaded',add);if(document.readyState!=='loading')add();
})();