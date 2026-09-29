const LANGS=['en','es','de','ru'];
const LEVELS=['A1','A2','B1','B2','C1'];
let state={language:'en',level:'A1'};

async function load(){
  state=await chrome.storage.sync.get({language:'en',level:'A1'});
  if(!LANGS.includes(state.language))state.language='en';
  if(!LEVELS.includes(state.level))state.level='A1';
  render();
}
function render(){
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===state.language));
  const box=document.getElementById('levels');
  box.innerHTML=LEVELS.map(l=>'<button data-level="'+l+'" class="'+(l===state.level?'on':'')+'">'+l+'</button>').join('');
  box.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',async()=>{state.level=b.dataset.level;await save();render()}));
}
async function save(){await chrome.runtime.sendMessage({type:'savePrefs',language:state.language,level:state.level})}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',async()=>{state.language=b.dataset.lang;await save();render()}));
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'open',tab:b.dataset.open||''});window.close()}));
load();
