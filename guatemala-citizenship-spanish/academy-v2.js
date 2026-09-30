(() => {
  'use strict';

  const DATA=window.GT_ACADEMY_V2_DATA||{vocab:[],questions:[],interviewPrompts:[]};
  const SUPABASE_URL='https://ylyiptbfqtmqwxirhehm.supabase.co';
  const SUPABASE_KEY='sb_publishable_H-tabbTCJePhTEEqwuyVBQ_4z02aTmg';
  const CLOUD_TABLE='guatemala_progress';
  let gtSupa=null,gtUser=null,gtSyncTimer=null,gtMockQuestions=[],gtMockPrompts=[];

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function nowStamp(){return Date.now()}
  function todayLocal(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }
  function ensureAcademyState(){
    if(!S||typeof S!=='object')return;
    if(!Array.isArray(S.errors))S.errors=[];
    if(!Array.isArray(S.mockHistory))S.mockHistory=[];
    if(!S.coach||typeof S.coach!=='object')S.coach={};
    if(!S.onboarding||S.onboarding.version!==1){
      S.onboarding={
        version:1,
        startedAt:todayLocal(),
        srsDone:0,
        civicsDone:0,
        interviewDone:0,
        baselineCompleted:false,
        completedAt:null,
        srsRatings:{again:0,hard:0,good:0,easy:0},
        civicsCorrect:0,
        civicsTotal:0,
        interviewWords:0
      };
    }else{
      S.onboarding.srsRatings=S.onboarding.srsRatings||{again:0,hard:0,good:0,easy:0};
      S.onboarding.srsDone=Number(S.onboarding.srsDone||0);
      S.onboarding.civicsDone=Number(S.onboarding.civicsDone||0);
      S.onboarding.interviewDone=Number(S.onboarding.interviewDone||0);
      S.onboarding.civicsCorrect=Number(S.onboarding.civicsCorrect||0);
      S.onboarding.civicsTotal=Number(S.onboarding.civicsTotal||0);
      S.onboarding.interviewWords=Number(S.onboarding.interviewWords||0);
    }
    if(!S.updatedAt)S.updatedAt=nowStamp();
    if(!S.appSettings)S.appSettings={busuuLevel:'B1',busuuFocus:'Grammar Review',dropsVariant:'Spanish (Mexican) — önerilen',dropsFocus:'Review Dojo / tekrar'};
    if(!Array.isArray(S.words))S.words=[];
    const seen=new Set(S.words.map(w=>String(w.es||'').trim().toLowerCase()));
    DATA.vocab.forEach(v=>{
      const k=String(v.es||'').trim().toLowerCase();
      if(!seen.has(k)){
        S.words.push({id:v.id,es:v.es,tr:v.tr,ex:v.ex,cat:v.cat,ef:2.5,interval:0,reps:0,due:todayLocal(),lastReviewedAt:0});
        seen.add(k);
      }
    });
    localStorage.setItem(KEY,JSON.stringify(S));
  }
  function expandCivics(){
    if(!Array.isArray(civics))return;
    const seen=new Set(civics.map(q=>q.q));
    DATA.questions.forEach(q=>{if(!seen.has(q.q)){civics.push(q);seen.add(q.q)}});
  }
  function persistNoTouch(){
    S.updatedAt=nowStamp();
    localStorage.setItem(KEY,JSON.stringify(S));
    scheduleCloudSync();
  }
  function addError(type,prompt,answer,correct,meta){
    ensureAcademyState();
    const key=type+'|'+prompt+'|'+correct;
    let item=S.errors.find(x=>x.key===key&&!x.resolved);
    if(item){
      item.count=(item.count||1)+1;
      item.lastDate=todayLocal();
      item.answer=answer;
    }else{
      S.errors.unshift({
        id:'e'+nowStamp()+Math.random().toString(36).slice(2,7),
        key,type,prompt,answer,correct,
        meta:meta||{},
        count:1,
        firstDate:todayLocal(),
        lastDate:todayLocal(),
        resolved:false
      });
    }
    S.errors=S.errors.slice(0,250);
  }
  function baselineComplete(){
    return !!(S.onboarding&&S.onboarding.baselineCompleted);
  }
  function maybeFinishBaseline(){
    if(!S.onboarding)return false;
    const done=S.onboarding.srsDone>=10&&S.onboarding.civicsDone>=5&&S.onboarding.interviewDone>=1;
    if(done&&!S.onboarding.baselineCompleted){
      S.onboarding.baselineCompleted=true;
      S.onboarding.completedAt=new Date().toISOString();
      S.onboarding.baselineSnapshot={
        srsRatings:{...S.onboarding.srsRatings},
        civicsCorrect:S.onboarding.civicsCorrect,
        civicsTotal:S.onboarding.civicsTotal,
        interviewWords:S.onboarding.interviewWords
      };
      persistNoTouch();
    }
    return done;
  }
  function baselineProgressPct(){
    if(!S.onboarding)return 0;
    const units=Math.min(10,S.onboarding.srsDone)+Math.min(5,S.onboarding.civicsDone)+Math.min(1,S.onboarding.interviewDone);
    return Math.round(units/16*100);
  }
  function nextBaselineStep(){
    if(!gtUser)return 'cloud';
    if((S.onboarding?.srsDone||0)<10)return 'vocab';
    if((S.onboarding?.civicsDone||0)<5)return 'civics';
    if((S.onboarding?.interviewDone||0)<1)return 'interview';
    return 'done';
  }
  function baselineStepClass(done,active){return done?'baselineDone':active?'baselineActive':'baselineLocked'}
  function renderOnboarding(){
    const box=document.getElementById('academyOnboarding');if(!box||!S.onboarding)return;
    const o=S.onboarding,step=nextBaselineStep(),pct=baselineProgressPct();
    if(o.baselineCompleted){
      const c=o.civicsTotal?Math.round(o.civicsCorrect/o.civicsTotal*100):0;
      box.innerHTML='<div class="academyHead"><div><span class="pill">BAŞLANGIÇ ÖLÇÜMÜ TAMAMLANDI</span><h3>Koç artık gerçek verinle çalışıyor.</h3></div><b>'+pct+'%</b></div>'+
        '<div class="baselineSummary"><span>SRS: 10/10</span><span>Civics: '+o.civicsCorrect+'/'+o.civicsTotal+' · '+c+'%</span><span>Mülakat: '+o.interviewWords+' kelime</span></div>'+
        '<p class="small muted">Bundan sonra günlük plan ve Koç önerileri bu başlangıç ölçümünün üzerine yeni performansını ekler.</p>';
      return;
    }
    const cloudDone=!!gtUser,srsDone=o.srsDone>=10,civDone=o.civicsDone>=5,intDone=o.interviewDone>=1;
    box.innerHTML=
      '<div class="academyHead"><div><span class="pill">İLK KULLANIM · BASELINE</span><h3>Hazırlanmadan gerçek seviyeni ölç.</h3><p class="muted">İlk gün yalnızca bu 3 görevi tamamla. Sonuçları düzeltmeye çalışma; amaç nereden başladığını görmek.</p></div><b>'+pct+'%</b></div>'+
      '<div class="progress baselineProgress"><i style="width:'+pct+'%"></i></div>'+
      '<div class="baselineSteps">'+
        '<button class="'+baselineStepClass(cloudDone,step==='cloud')+'" onclick="gtBaselineGo(\'cloud\')"><b>0 · Bulut hesabı</b><span>'+(cloudDone?'✓ Supabase bağlı': 'Önce Veri bölümünde BatumHub/Supabase hesabına giriş yap')+'</span></button>'+
        '<button class="'+baselineStepClass(srsDone,step==='vocab')+'" onclick="gtBaselineGo(\'vocab\')"><b>1 · SRS '+Math.min(10,o.srsDone)+'/10</b><span>10 kelimeyi cevapla; Tekrar/Zor/İyi/Kolay sonuçlarını kaydet.</span></button>'+
        '<button class="'+baselineStepClass(civDone,step==='civics')+'" onclick="gtBaselineGo(\'civics\')"><b>2 · Civics '+Math.min(5,o.civicsDone)+'/5</b><span>Hazırlanmadan tek 5 soruluk seti çöz.</span></button>'+
        '<button class="'+baselineStepClass(intDone,step==='interview')+'" onclick="gtBaselineGo(\'interview\')"><b>3 · Mülakat '+Math.min(1,o.interviewDone)+'/1</b><span>İspanyolca 35–80 kelimelik doğal bir cevap kaydet.</span></button>'+
      '</div>';
  }
  window.gtBaselineGo=function(target){
    const step=nextBaselineStep();
    if(target==='cloud'){go('data');setTimeout(()=>document.getElementById('cloudCard')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return}
    if(!gtUser){go('data');setCloudStatus('Baseline başlamadan önce Supabase hesabına giriş yap.',false);return}
    if(target==='vocab'){
      if(step!=='vocab'&&step!=='done')return;
      go('vocab');renderFlash();return;
    }
    if(target==='civics'){
      if(step!=='civics'&&step!=='done')return;
      go('civics');newQuiz();return;
    }
    if(target==='interview'){
      if(step!=='interview'&&step!=='done')return;
      go('interview');renderInterview();return;
    }
  };
  function maybeRouteFirstUse(){
    if(baselineComplete())return;
    const k='gtAcademyBaselineRouted.v1';
    if(!gtUser&&!sessionStorage.getItem(k)){
      sessionStorage.setItem(k,'1');
      go('data');
      setTimeout(()=>document.getElementById('cloudCard')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    }else if(gtUser){
      go('home');
      setTimeout(()=>document.getElementById('academyOnboarding')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    }
  }

  function weakTopic(){
    const labels={geography:'Coğrafya',history:'Tarih',constitution:'Anayasa',state:'Devlet yapısı',citizenship:'Mülakat / işlem dili'};
    let best=null;
    Object.keys(labels).forEach(k=>{
      const x=(S.civics&&S.civics.topics&&S.civics.topics[k])||{c:0,t:0};
      const pct=x.t?Math.round(x.c/x.t*100):0;
      const priority=x.t<5?-20:pct;
      if(!best||priority<best.priority)best={key:k,label:labels[k],pct,total:x.t,priority};
    });
    return best||{key:'constitution',label:'Anayasa',pct:0,total:0,priority:0};
  }
  function masteredCount(){return S.words.filter(w=>(w.reps||0)>=3).length}
  function dueCount(){return S.words.filter(w=>String(w.due||todayLocal())<=todayLocal()).length}
  function lastNDays(n){
    const out=[];
    const d=new Date();
    for(let i=0;i<n;i++){
      const x=new Date(d);
      x.setDate(d.getDate()-i);
      const k=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
      out.push([k,(S.days&&S.days[k])||{actions:0,minutes:0}]);
    }
    return out;
  }
  function weeklyStats(){
    const days=lastNDays(7);
    const active=days.filter(x=>(x[1].actions||0)>0).length;
    const localMinutes=days.reduce((a,x)=>a+Number(x[1].minutes||0),0);
    const apps=(S.apps||[]).filter(x=>days.some(d=>d[0]===x.date));
    const appMinutes=apps.reduce((a,x)=>a+Number(x.min||0),0);
    const busuu=apps.filter(x=>x.app==='Busuu').reduce((a,x)=>a+Number(x.min||0),0);
    const drops=apps.filter(x=>x.app==='Drops').reduce((a,x)=>a+Number(x.min||0),0);
    const civAcc=S.civics&&S.civics.total?Math.round(S.civics.correct/S.civics.total*100):0;
    return {active,localMinutes,appMinutes,busuu,drops,civAcc,mastered:masteredCount(),due:dueCount(),interviews:(S.interviews||[]).filter(x=>days.some(d=>d[0]===x.date)).length};
  }
  function coachAdvice(){
    const w=weeklyStats(),weak=weakTopic(),tips=[];
    if(w.active<4)tips.push('Bu hafta süre değil düzen zayıf: en az 4–5 ayrı çalışma günü hedefle.');
    if(w.busuu<60)tips.push('Busuu haftalık 60–80 dk altındasın; '+esc(S.appSettings.busuuFocus||'Grammar Review')+' odağını öne al.');
    if(w.drops<25)tips.push('Drops/Dojo haftalık 25–40 dk hedefinin altında.');
    if(w.civAcc<80)tips.push(weak.label+' doğruluğunu %80 üzerine çıkarmadan yeni konu yükünü artırma.');
    if(w.due>35)tips.push('SRS borcu '+w.due+' kelime. Yeni kelime eklemek yerine borcu erit.');
    if(w.interviews<2)tips.push('Bu hafta en az 2 adet 60–120 saniyelik mülakat cevabı kaydet.');
    if(!tips.length)tips.push('Denge iyi. Bu hafta bir tam deneme yap ve en düşük konu yüzdesini yükselt.');
    return tips.slice(0,4);
  }
  function renderSmartPlan(){
    const host=document.getElementById('academyCoachBox');
    if(!host)return;
    const weak=weakTopic();
    const p=DATA.interviewPrompts.length?DATA.interviewPrompts[new Date().getDate()%DATA.interviewPrompts.length]:'¿Por qué desea adquirir la nacionalidad guatemalteca?';
    host.innerHTML=
      '<div class="academyHead"><div><span class="pill">AKILLI GÜNLÜK PLAN</span><h3>Bugün sistemin önerisi</h3></div><b>'+dueCount()+' SRS</b></div>'+
      '<div class="academyPlanGrid">'+
        '<button onclick="go(\'vocab\')"><b>1 · SRS</b><span>'+Math.min(Math.max(dueCount(),10),25)+' kelime · önce zayıflar</span></button>'+
        '<button onclick="go(\'apps\')"><b>2 · Busuu</b><span>15–20 dk · '+esc(S.appSettings.busuuFocus||'Grammar Review')+'</span></button>'+
        '<button onclick="go(\'civics\')"><b>3 · Civics</b><span>'+esc(weak.label)+' · mevcut '+weak.pct+'%</span></button>'+
        '<button onclick="go(\'interview\')"><b>4 · Konuşma</b><span>'+esc(p)+'</span></button>'+
      '</div>';
  }
  function renderCoach(){
    const box=document.getElementById('coachBody');if(!box)return;
    const w=weeklyStats(),weak=weakTopic(),errors=(S.errors||[]).filter(x=>!x.resolved);
    const mock=(S.mockHistory||[])[0];
    box.innerHTML=
      '<div class="academyStats">'+
        '<div><b>'+w.active+'/7</b><span>aktif gün</span></div>'+
        '<div><b>'+w.busuu+' dk</b><span>Busuu</span></div>'+
        '<div><b>'+w.drops+' dk</b><span>Drops</span></div>'+
        '<div><b>'+w.civAcc+'%</b><span>civics</span></div>'+
        '<div><b>'+w.mastered+'</b><span>3+ tekrar kelime</span></div>'+
        '<div><b>'+errors.length+'</b><span>açık hata</span></div>'+
      '</div>'+
      '<div class="two">'+
        '<div class="card"><h3>Bu haftanın yönlendirmesi</h3><ol>'+coachAdvice().map(x=>'<li>'+x+'</li>').join('')+'</ol><p class="small muted">En zayıf alan: <b>'+esc(weak.label)+'</b> · '+weak.pct+'% ('+weak.total+' soru)</p></div>'+
        '<div class="card"><h3>Son tam deneme</h3>'+(mock?'<p><b>'+mock.score+'/100</b> çalışma skoru</p><p class="muted">'+mock.date+' · Civics '+mock.civicsCorrect+'/'+mock.civicsTotal+' · sözlü öz değerlendirme '+mock.oralScore+'/10</p>':'<p class="muted">Henüz tam deneme yok. İlk deneme başlangıç seviyeni görmek için kullanılacak.</p>')+'<button class="btn" onclick="go(\'mock\');newGtMock()">Tam deneme aç</button></div>'+
      '</div>'+
      '<div class="card" style="margin-top:12px"><div class="academyHead"><h3>Hata Defteri</h3><button class="btn" onclick="clearResolvedErrors()">Çözülmüşleri temizle</button></div>'+
      (errors.length?errors.slice(0,40).map(x=>'<div class="errorRow"><div><span class="tag">'+esc(x.type)+'</span> <b>'+esc(x.prompt)+'</b><small>Senin cevabın: '+esc(x.answer||'—')+' · Doğru: '+esc(x.correct||'—')+' · '+(x.count||1)+' kez</small></div><button onclick="resolveGtError(\''+esc(x.id)+'\')">Çözdüm</button></div>').join(''):'<p class="muted">Açık hata yok. Yanlış civics cevapları ve zorlandığın SRS kartları burada otomatik birikir.</p>')+
      '</div>';
  }
  function renderMockHistory(){
    const h=document.getElementById('mockHistory');if(!h)return;
    h.innerHTML=(S.mockHistory||[]).slice(0,8).map(x=>'<p><b>'+x.date+'</b> · '+x.score+'/100 · Civics '+x.civicsCorrect+'/'+x.civicsTotal+' · sözlü '+x.oralScore+'/10</p>').join('')||'<p class="muted">Henüz kayıt yok.</p>';
  }
  function shuffle(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  window.newGtMock=function(){
    gtMockQuestions=shuffle(civics).slice(0,20);
    gtMockPrompts=shuffle(DATA.interviewPrompts).slice(0,5);
    const qa=document.getElementById('mockQuestions'),oral=document.getElementById('mockOral'),result=document.getElementById('mockResult');
    if(result)result.innerHTML='';
    if(qa)qa.innerHTML=gtMockQuestions.map((q,i)=>
      '<div class="qbox"><b>'+(i+1)+'. '+esc(q.q)+'</b>'+
      q.a.map((a,j)=>'<label><input style="width:auto" type="radio" name="mq'+i+'" value="'+j+'"> '+esc(a)+'</label>').join('')+
      '</div>'
    ).join('');
    if(oral)oral.innerHTML=gtMockPrompts.map((p,i)=>
      '<div class="mockOralItem"><b>'+(i+1)+'. '+esc(p)+'</b><textarea id="moTxt'+i+'" rows="3" placeholder="3–6 cümlelik iskelet veya anahtar kelimeler..."></textarea>'+
      '<label>Öz değerlendirme <select id="moScore'+i+'"><option value="0">0 · Zorlandım</option><option value="1">1 · Kısmen</option><option value="2">2 · Rahat ve tutarlı</option></select></label></div>'
    ).join('');
  };
  window.gradeGtMock=function(){
    if(!gtMockQuestions.length)return;
    let correct=0;
    gtMockQuestions.forEach((q,i)=>{
      const el=document.querySelector('input[name="mq'+i+'"]:checked');
      const v=el?Number(el.value):-1;
      if(v===q.c)correct++;
      else addError('mock-civics',q.q,v>=0?q.a[v]:'Cevap yok',q.a[q.c],{topic:q.t});
    });
    let oral=0;
    gtMockPrompts.forEach((p,i)=>{
      oral+=Number(document.getElementById('moScore'+i)?.value||0);
      const txt=document.getElementById('moTxt'+i)?.value.trim()||'';
      if(Number(document.getElementById('moScore'+i)?.value||0)===0)addError('mock-speaking',p,txt||'Cevap üretilemedi','60–120 saniyelik açık ve tutarlı cevap',{});
    });
    const score=Math.round((correct/20)*60+(oral/10)*40);
    S.mockHistory.unshift({date:todayLocal(),score,civicsCorrect:correct,civicsTotal:20,oralScore:oral});
    S.mockHistory=S.mockHistory.slice(0,30);
    S.days[todayLocal()]=S.days[todayLocal()]||{actions:0,minutes:0};
    S.days[todayLocal()].actions++;
    S.days[todayLocal()].mock=(S.days[todayLocal()].mock||0)+1;
    persistNoTouch();
    const r=document.getElementById('mockResult');
    if(r)r.innerHTML='<div class="mockScore"><b>'+score+'/100</b><span>çalışma skoru</span></div><p>Civics: '+correct+'/20 · sözlü öz değerlendirme: '+oral+'/10.</p><p class="small muted">Bu resmî Guatemala sınav puanı değildir; yalnızca ilerlemeni aynı ölçekte izlemek için oluşturulmuş çalışma göstergesidir.</p>';
    renderCoach();renderMockHistory();renderAll();
  };
  window.resolveGtError=function(id){
    const x=(S.errors||[]).find(e=>e.id===id);if(x){x.resolved=true;x.resolvedDate=todayLocal();persistNoTouch();renderCoach()}
  };
  window.clearResolvedErrors=function(){
    S.errors=(S.errors||[]).filter(x=>!x.resolved);persistNoTouch();renderCoach();
  };

  function injectUI(){
    const nav=document.querySelector('.nav');
    if(nav&&!document.querySelector('[data-tab="coach"]')){
      const coach=document.createElement('button');coach.className='tab';coach.dataset.tab='coach';coach.textContent='Koç + Hatalar';coach.onclick=()=>go('coach');
      const mock=document.createElement('button');mock.className='tab';mock.dataset.tab='mock';mock.textContent='Tam Deneme';mock.onclick=()=>{go('mock');if(!gtMockQuestions.length)newGtMock()};
      const dataBtn=nav.querySelector('[data-tab="data"]');
      nav.insertBefore(coach,dataBtn||null);nav.insertBefore(mock,dataBtn||null);
    }
    const main=document.querySelector('main.wrap');
    if(main&&!document.getElementById('coach')){
      const sec=document.createElement('section');sec.id='coach';sec.className='section';
      sec.innerHTML='<h2>Haftalık Koç + Hata Defteri</h2><p class="muted">Süreyi değil zayıf alanı yönetir. Son 7 gün, SRS borcu, civics doğruluğu, Busuu/Drops yükü ve mülakat sayısına göre yönlendirme üretir.</p><div id="coachBody"></div>';
      main.appendChild(sec);
      const mock=document.createElement('section');mock.id='mock';mock.className='section';
      mock.innerHTML='<h2>Tam Vatandaşlık Provası</h2><p class="muted">20 civics + 5 sözlü/yazılı mülakat görevi. Resmî soru bankası veya resmî sınav puanı değildir.</p><div class="academyHead"><button class="btn" onclick="newGtMock()">Yeni deneme oluştur</button><button class="btn" onclick="gradeGtMock()">Denemeyi değerlendir</button></div><div id="mockResult"></div><div class="two"><div><h3>Civics</h3><div id="mockQuestions"></div></div><div><h3>Sözlü / yazılı cevap</h3><div id="mockOral"></div></div></div><div class="card" style="margin-top:12px"><h3>Deneme geçmişi</h3><div id="mockHistory"></div></div>';
      main.appendChild(mock);
    }
    const home=document.querySelector('#home .card:last-child');
    if(home&&!document.getElementById('academyOnboarding')){
      const onboard=document.createElement('div');onboard.id='academyOnboarding';onboard.className='card academyOnboarding';onboard.style.marginTop='12px';home.insertAdjacentElement('afterend',onboard);
    }
    const onboarding=document.getElementById('academyOnboarding');
    if(onboarding&&!document.getElementById('academyCoachBox')){
      const box=document.createElement('div');box.id='academyCoachBox';box.className='card academyCoach';box.style.marginTop='12px';onboarding.insertAdjacentElement('afterend',box);
    }
    const dataSec=document.getElementById('data');
    if(dataSec&&!document.getElementById('cloudCard')){
      const card=document.createElement('div');card.className='card';card.id='cloudCard';card.style.marginBottom='12px';
      card.innerHTML='<div class="academyHead"><div><h3>☁ Supabase cihazlar arası senkron</h3><p class="muted" id="cloudStatus">Oturum kontrol ediliyor…</p></div><button class="btn" id="cloudSyncBtn" onclick="gtCloudSyncNow()">Şimdi senkronla</button></div><div id="cloudSignedOut"><div class="two"><div><label>E-posta</label><input id="gtEmail" type="email" autocomplete="email" placeholder="BatumHub hesabındaki e-posta"></div><div><label>Şifre</label><input id="gtPassword" type="password" autocomplete="current-password" placeholder="••••••••"></div></div><p><button class="btn" onclick="gtCloudSignIn()">Giriş yap</button> <button class="btn" onclick="gtCloudSignUp()">Hesap oluştur</button></p></div><div id="cloudSignedIn" style="display:none"><p><b id="cloudUserLabel"></b></p><p class="small muted">Aynı BatumHub/Supabase hesabıyla iş ve ev bilgisayarındaki Guatemala ilerlemesi otomatik eşitlenir.</p><button class="btn" onclick="gtCloudSignOut()">Çıkış yap</button></div>';
      dataSec.insertBefore(card,dataSec.children[1]||null);
      const p=dataSec.querySelector('p.muted');if(p)p.textContent='Yerel kayıt her zaman tutulur. Oturum açarsan aynı veri ayrıca Supabase üzerinde kendi hesabına senkronlanır; JSON yedekleme acil durum için kalır.';
    }
    if(!document.getElementById('academyV2Style')){
      const st=document.createElement('style');st.id='academyV2Style';st.textContent=
        '.academyCoach{border-color:#397c71}.academyHead{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.academyPlanGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.academyPlanGrid button{border:1px solid var(--line);background:#0b1b28;color:var(--text);border-radius:13px;padding:12px;text-align:left;cursor:pointer}.academyPlanGrid b,.academyPlanGrid span{display:block}.academyPlanGrid span{color:var(--muted);font-size:12px;margin-top:5px}.academyStats{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:12px 0}.academyStats>div{background:#0b1b28;border:1px solid var(--line);border-radius:13px;padding:12px}.academyStats b,.academyStats span{display:block}.academyStats b{font-size:22px}.academyStats span{font-size:11px;color:var(--muted)}.errorRow{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-top:1px solid var(--line);padding:10px 0}.errorRow small{display:block;color:var(--muted);margin-top:4px}.errorRow button{border:1px solid var(--line);background:#173044;color:#fff;border-radius:9px;padding:6px 8px;cursor:pointer}.mockOralItem{border:1px solid var(--line);border-radius:13px;padding:12px;margin:10px 0;background:#0b1b28}.mockOralItem textarea{margin:10px 0}.mockScore{display:inline-flex;align-items:baseline;gap:8px;padding:12px 16px;background:#13392f;border:1px solid #2f6f5d;border-radius:14px;margin:12px 0}.mockScore b{font-size:32px}.mockScore span{color:#aef2dc}.academyOnboarding{border-color:#4d78a0;background:linear-gradient(145deg,#102638,#0d1d2a)}.baselineProgress{margin:12px 0 14px}.baselineSteps{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.baselineSteps button{border:1px solid var(--line);border-radius:13px;padding:12px;text-align:left;background:#0b1b28;color:var(--text);cursor:pointer}.baselineSteps button b,.baselineSteps button span{display:block}.baselineSteps button span{font-size:12px;color:var(--muted);margin-top:5px}.baselineSteps .baselineActive{border-color:var(--accent2);box-shadow:0 0 0 2px #76bdf222}.baselineSteps .baselineDone{border-color:#2f7d68;background:#11382f}.baselineSteps .baselineLocked{opacity:.52;cursor:not-allowed}.baselineSummary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.baselineSummary span{border:1px solid var(--line);background:#0b1b28;border-radius:999px;padding:6px 9px;font-size:12px}@media(max-width:900px){.academyPlanGrid{grid-template-columns:1fr 1fr}.academyStats{grid-template-columns:repeat(3,1fr)}.baselineSteps{grid-template-columns:1fr 1fr}}@media(max-width:560px){.academyPlanGrid,.academyStats,.baselineSteps{grid-template-columns:1fr}}';
      document.head.appendChild(st);
    }
  }

  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();renderOnboarding();renderSmartPlan();renderCoach();renderMockHistory();renderCloudUI()};

  const originalSave=save;
  save=function(){S.updatedAt=nowStamp();originalSave();scheduleCloudSync()};

  const originalGradeWord=gradeWord;
  gradeWord=function(q){
    const baselineEligible=!!(gtUser&&S.onboarding&&!S.onboarding.baselineCompleted&&S.onboarding.srsDone<10);
    if(currentWord&&q<4)addError('srs',currentWord.es,q<3?'Tekrar':'Zor',currentWord.tr,{cat:currentWord.cat});
    if(currentWord)currentWord.lastReviewedAt=nowStamp();
    const result=originalGradeWord(q);
    if(baselineEligible){
      S.onboarding.srsDone=Math.min(10,S.onboarding.srsDone+1);
      const bucket=q<3?'again':q===3?'hard':q===4?'good':'easy';
      S.onboarding.srsRatings[bucket]=(S.onboarding.srsRatings[bucket]||0)+1;
      persistNoTouch();
      renderAll();
      if(S.onboarding.srsDone>=10&&S.onboarding.civicsDone<5){go('civics');newQuiz()}
    }
    return result;
  };

  const originalGradeQuiz=gradeQuiz;
  gradeQuiz=function(){
    const baselineEligible=!!(gtUser&&S.onboarding&&!S.onboarding.baselineCompleted&&S.onboarding.srsDone>=10&&S.onboarding.civicsDone<5);
    let baselineCorrect=0,baselineAnswered=0;
    quizNow.forEach((q,i)=>{
      const el=document.querySelector('input[name="q'+i+'"]:checked');
      const v=el?Number(el.value):-1;
      if(v>=0)baselineAnswered++;
      if(v===q.c)baselineCorrect++;
      if(v!==q.c&&v>=0)addError('civics',q.q,q.a[v],q.a[q.c],{topic:q.t});
    });
    if(baselineEligible&&baselineAnswered<quizNow.length){
      const area=document.getElementById('quiz');
      if(area){
        const note=document.createElement('div');
        note.className='task';
        note.textContent='Baseline için 5 sorunun tamamını işaretle; boş soru değerlendirmeye alınmaz.';
        area.prepend(note);
        setTimeout(()=>note.remove(),3500);
      }
      return;
    }
    quizNow.forEach((q,i)=>{
      const el=document.querySelector('input[name="q'+i+'"]:checked');
      const v=el?Number(el.value):-1;
      if(v!==q.c)addError('civics',q.q,v>=0?q.a[v]:'Cevap yok',q.a[q.c],{topic:q.t});
    });
    originalGradeQuiz();
    if(baselineEligible){
      const count=Math.min(5-S.onboarding.civicsDone,quizNow.length);
      S.onboarding.civicsDone+=count;
      S.onboarding.civicsCorrect+=baselineCorrect;
      S.onboarding.civicsTotal+=quizNow.length;
      persistNoTouch();
      renderAll();
      if(S.onboarding.civicsDone>=5&&S.onboarding.interviewDone<1){go('interview');renderInterview()}
    }else{
      S.updatedAt=nowStamp();localStorage.setItem(KEY,JSON.stringify(S));scheduleCloudSync();renderCoach();
    }
  };

  const originalSaveInterview=saveInterview;
  saveInterview=function(){
    const txt=document.getElementById('interviewAnswer')?.value.trim()||'';
    const words=txt?txt.split(/\s+/).filter(Boolean).length:0;
    const baselineEligible=!!(gtUser&&txt&&S.onboarding&&!S.onboarding.baselineCompleted&&S.onboarding.srsDone>=10&&S.onboarding.civicsDone>=5&&S.onboarding.interviewDone<1);
    if(txt&&words<35)addError('speaking',interview[intIdx].q,txt,'35–80 kelimelik açık ve bağlı cevap',{});
    originalSaveInterview();
    if(baselineEligible){
      S.onboarding.interviewDone=1;
      S.onboarding.interviewWords=words;
      maybeFinishBaseline();
      persistNoTouch();
      renderAll();
      go('home');
      setTimeout(()=>document.getElementById('academyOnboarding')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
    }else{
      S.updatedAt=nowStamp();localStorage.setItem(KEY,JSON.stringify(S));scheduleCloudSync();renderCoach();
    }
  };

  const originalLogApp=logApp;
  logApp=function(app){originalLogApp(app);S.updatedAt=nowStamp();localStorage.setItem(KEY,JSON.stringify(S));scheduleCloudSync();renderCoach()};

  if(typeof saveAppSettings==='function'){
    const originalSaveAppSettings=saveAppSettings;
    saveAppSettings=function(){originalSaveAppSettings();S.updatedAt=nowStamp();localStorage.setItem(KEY,JSON.stringify(S));scheduleCloudSync();renderSmartPlan()};
  }

  function renderCloudUI(){
    const status=document.getElementById('cloudStatus'),out=document.getElementById('cloudSignedOut'),inside=document.getElementById('cloudSignedIn'),label=document.getElementById('cloudUserLabel'),btn=document.getElementById('cloudSyncBtn');
    if(!status)return;
    if(!gtSupa){status.textContent='Supabase istemcisi yüklenemedi; yerel kayıt çalışmaya devam ediyor.';if(btn)btn.disabled=true;return}
    if(gtUser){
      status.textContent='Bulut senkronu aktif. Değişiklikler otomatik gönderilir.';
      if(out)out.style.display='none';if(inside)inside.style.display='block';if(label)label.textContent=gtUser.email||'BatumHub hesabı';if(btn)btn.disabled=false;
    }else{
      status.textContent='Bulut senkronu kapalı. BatumHub hesabınla giriş yapabilirsin.';
      if(out)out.style.display='block';if(inside)inside.style.display='none';if(btn)btn.disabled=true;
    }
  }
  async function initCloud(){
    if(!(window.supabase&&window.supabase.createClient)){renderCloudUI();return}
    gtSupa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await gtSupa.auth.getSession();
    await handleCloudSession(data.session);
    gtSupa.auth.onAuthStateChange(async(_event,session)=>{await handleCloudSession(session)});
  }
  async function handleCloudSession(session){
    gtUser=session&&session.user?session.user:null;
    renderCloudUI();
    if(gtUser){
      await mergeFromCloud();
      ensureAcademyState();
      renderAll();
      if(!baselineComplete())setCloudStatus('Bulut bağlı. Şimdi başlangıç ölçümünü tamamla: 10 SRS + 5 civics + 1 mülakat.',true);
    }
    maybeRouteFirstUse();
  }
  async function mergeFromCloud(){
    if(!gtUser||!gtSupa)return;
    const {data,error}=await gtSupa.from(CLOUD_TABLE).select('state,updated_at').eq('user_id',gtUser.id).maybeSingle();
    if(error){setCloudStatus('Bulut okunamadı: '+error.message,false);return}
    if(!data||!data.state){await syncCloudNow(true);return}
    const cloud=data.state||{},cloudTs=Number(cloud.updatedAt||new Date(data.updated_at||0).getTime()||0),localTs=Number(S.updatedAt||0);
    if(cloudTs>localTs+1000){
      S=cloud;
      ensureAcademyState();
      localStorage.setItem(KEY,JSON.stringify(S));
      renderAll();
      setCloudStatus('Buluttaki daha yeni ilerleme bu cihaza alındı.',true);
    }else if(localTs>cloudTs+1000){
      await syncCloudNow(true);
    }else{
      setCloudStatus('Yerel ve bulut ilerlemesi güncel.',true);
    }
  }
  function setCloudStatus(msg,ok){
    const e=document.getElementById('cloudStatus');if(!e)return;e.textContent=(ok?'✓ ':'')+msg;
  }
  function scheduleCloudSync(){
    if(!gtUser||!gtSupa)return;
    clearTimeout(gtSyncTimer);
    gtSyncTimer=setTimeout(()=>syncCloudNow(false),900);
  }
  async function syncCloudNow(silent){
    if(!gtUser||!gtSupa){if(!silent)setCloudStatus('Önce hesabınla giriş yap.',false);return}
    S.updatedAt=Number(S.updatedAt||nowStamp());
    const {error}=await gtSupa.from(CLOUD_TABLE).upsert({user_id:gtUser.id,state:S,updated_at:new Date().toISOString()});
    if(error){setCloudStatus('Senkron hatası: '+error.message,false);return}
    if(!silent)setCloudStatus('Buluta senkronlandı: '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),true);
  }
  window.gtCloudSyncNow=()=>syncCloudNow(false);
  window.gtCloudSignIn=async function(){
    if(!gtSupa)return;
    const email=document.getElementById('gtEmail')?.value.trim(),password=document.getElementById('gtPassword')?.value||'';
    if(!email||!password){setCloudStatus('E-posta ve şifre gerekli.',false);return}
    const {error}=await gtSupa.auth.signInWithPassword({email,password});
    if(error)setCloudStatus(error.message,false);
  };
  window.gtCloudSignUp=async function(){
    if(!gtSupa)return;
    const email=document.getElementById('gtEmail')?.value.trim(),password=document.getElementById('gtPassword')?.value||'';
    if(!email||password.length<6){setCloudStatus('Geçerli e-posta ve en az 6 karakter şifre gerekli.',false);return}
    const {error}=await gtSupa.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error)setCloudStatus(error.message,false);else setCloudStatus('Hesap oluşturuldu. E-posta doğrulaması istenirse gelen bağlantıyı aç.',true);
  };
  window.gtCloudSignOut=async function(){if(gtSupa)await gtSupa.auth.signOut()};

  ensureAcademyState();
  expandCivics();
  injectUI();
  renderAll();
  initCloud();
  window.addEventListener('online',()=>scheduleCloudSync());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')scheduleCloudSync()});
})();