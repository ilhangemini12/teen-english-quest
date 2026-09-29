(function(){
  function cap(){return window.Capacitor||null}
  function isNative(){
    try{return !!(cap()&&typeof cap().isNativePlatform==='function'&&cap().isNativePlatform())}catch(e){return false}
  }
  function plugin(name){try{return cap()&&cap().Plugins&&cap().Plugins[name]}catch(e){return null}}
  function showNativeSettings(){
    document.documentElement.classList.toggle('native-app',isNative());
    var box=document.getElementById('nativeOnlySettings');if(box&&isNative())box.style.display='';
  }
  function closeTopLayer(){
    var acc=document.getElementById('accountModal');if(acc&&acc.classList.contains('open')&&window.closeAccount){closeAccount();return true}
    var pl=document.getElementById('placementModal');if(pl&&pl.classList.contains('open')&&window.closePlacementTest){closePlacementTest();return true}
    var q=document.getElementById('contentQuizModal');if(q&&q.classList.contains('open')&&window.closeContentQuiz){closeContentQuiz();return true}
    var media=document.getElementById('mediaDock');if(media&&media.classList.contains('open')&&window.closeMedia){closeMedia();return true}
    var dict=document.getElementById('dictPopup');if(dict&&dict.classList.contains('open')&&window.closeDict){closeDict();return true}
    return false;
  }
  async function setupBackButton(){
    if(!isNative())return;
    var App=plugin('App');if(!App||!App.addListener)return;
    try{
      await App.addListener('backButton',function(){
        if(closeTopLayer())return;
        var st=history.state||{};
        if(st.bh==='study'||st.bh==='review'||(st.bh==='tab'&&st.tab&&st.tab!=='Home')){history.back();return}
        if(typeof App.exitApp==='function')App.exitApp();
      });
    }catch(e){}
  }
  async function setupStatusBar(){
    if(!isNative())return;
    var StatusBar=plugin('StatusBar');if(!StatusBar)return;
    try{if(StatusBar.setOverlaysWebView)await StatusBar.setOverlaysWebView({overlay:false})}catch(e){}
  }
  window.bhNativeHaptic=async function(kind){
    if(!isNative())return;
    var H=plugin('Haptics');if(!H)return;
    try{
      if(H.notification)await H.notification({type:kind==='warning'?'WARNING':'SUCCESS'});
      else if(H.vibrate)await H.vibrate({duration:35});
    }catch(e){}
  };
  function notificationId(word){
    var h=2166136261,s=String(word||'word');
    for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return Math.abs(h%2000000000)+1;
  }
  window.bhScheduleReviewNotification=async function(nextReview,word){
    if(!isNative()||localStorage.getItem('bh-native-reminders')!=='1')return;
    var N=plugin('LocalNotifications');if(!N||!N.schedule)return;
    var at=new Date(nextReview);if(!Number.isFinite(at.getTime())||at.getTime()<Date.now()+60000)at=new Date(Date.now()+60000);
    try{
      await N.schedule({notifications:[{
        id:notificationId(word),
        title:'BatumHub · Quick word review',
        body:'Can you still remember “'+String(word||'this word')+'”?',
        schedule:{at:at},
        extra:{target:'Vocabulary'}
      }]});
    }catch(e){}
  };
  window.bhEnableStudyReminders=async function(){
    if(!isNative()){alert('Study reminders are available in the Android/iOS app.');return}
    var N=plugin('LocalNotifications');if(!N)return;
    try{
      var p=N.checkPermissions?await N.checkPermissions():{display:'prompt'};
      if(p.display!=='granted'&&N.requestPermissions)p=await N.requestPermissions();
      if(p.display==='granted'){
        localStorage.setItem('bh-native-reminders','1');
        if(window.eqGetLocalState){
          var s=window.eqGetLocalState(),words=Object.values((s&&s.wordBank)||{}).slice(0,20);
          for(var i=0;i<words.length;i++)if(words[i].nextReview)await window.bhScheduleReviewNotification(words[i].nextReview,words[i].word);
        }
        alert('Study reminders are on.');
      }else alert('Notifications were not enabled.');
    }catch(e){alert('Notifications could not be enabled on this device.')}
  };
  document.addEventListener('DOMContentLoaded',function(){showNativeSettings();setupBackButton();setupStatusBar()});
})();