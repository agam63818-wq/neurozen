window._allTimers=[];
function _untrack(id){const a=window._allTimers;for(let i=a.length-1;i>=0;i--){if(a[i].id===id){a.splice(i,1);break;}}}
const _st=(fn,ms)=>{const id=setTimeout(()=>{_untrack(id);try{fn();}catch(e){}},ms);window._allTimers.push({type:'to',id});return id;};
const _si=(fn,ms)=>{const id=setInterval(fn,ms);window._allTimers.push({type:'iv',id});return id;};
function _ct(id){clearTimeout(id);_untrack(id);}
function _cti(id){clearInterval(id);_untrack(id);}
function _clearAllTimers(){window._allTimers.forEach(t=>t.type==='iv'?clearInterval(t.id):clearTimeout(t.id));window._allTimers=[];}
const _noiseCache={};
/* ===================== STATE ===================== */
function _cleanupOldData(){
  try{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('nz_'));
    if(keys.length>50){
      const sorted=keys.sort();
      sorted.slice(0,keys.length-30).forEach(k=>localStorage.removeItem(k));
    }
  }catch(e){}
}
const _SECRET='Nz_Ch3ck!2024';
const _SENSITIVE=new Set(['nz_brain_score','nz_xp','nz_achievements','nz_best_scores','nz_skill_scores','nz_streak']);
function _hash(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return h.toString(36);}
const LS={
  get(k,d){
    try{
      const v=localStorage.getItem(k);
      if(v===null)return d;
      const parsed=JSON.parse(v);
      if(_SENSITIVE.has(k)){
        if(parsed&&typeof parsed==='object'&&'value' in parsed&&'hash' in parsed){
          if(parsed.hash===_hash(JSON.stringify(parsed.value)+_SECRET))return parsed.value;
          console.warn('Tampered key reset to default:',k);
          return d;
        }
        setS(k,parsed);
        return parsed;
      }
      return parsed;
    }catch{return d}
  },
  set(k,v){
    try{
      localStorage.setItem('__nz_probe__','1');
      localStorage.removeItem('__nz_probe__');
      const toStore=_SENSITIVE.has(k)?{value:v,hash:_hash(JSON.stringify(v)+_SECRET)}:v;
      localStorage.setItem(k,JSON.stringify(toStore));
    }catch(e){
      _cleanupOldData();
      try{
        const toStore=_SENSITIVE.has(k)?{value:v,hash:_hash(JSON.stringify(v)+_SECRET)}:v;
        localStorage.setItem(k,JSON.stringify(toStore));
      }catch(e2){}
    }
  },
  clear(prefix){Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k))}
};
const FRESH={
  nz_brain_score:0,nz_streak:0,nz_games_played:0,nz_today_goal:3,
  nz_dark_mode:false,
  nz_achievements:[],
  nz_skill_scores:{memory:0,focus:0,logic:0,speed:0,planning:0,attention:0},
  nz_skill_scores_prev:{memory:0,focus:0,logic:0,speed:0,planning:0,attention:0},
  nz_best_scores:{},nz_last_played:null,
  nz_settings:{reminders:true,sfx:true,notifications:true},
  nz_onboarded:false,nz_username:'Player',
  nz_schulte_level:0,nz_today_games:0,
  nz_xp:0,nz_daily_challenge_date:null,nz_daily_challenge_done:false,nz_daily_challenge_xp:0,
  nz_today_game_counts:{date:'',counts:{}},
  nz_today_categories:{date:'',cats:[]},
  nz_last_skill_gain:{},
  nz_week_skill_start:{},nz_week_start_date:'',
  nz_mastery:{},
  nz_brain_goal:'focus',nz_daily_goal_type:'balanced',nz_calib_done:false,
  nz_game_plays:{}
};
function S(k){return LS.get(k,FRESH[k])}
function setS(k,v){LS.set(k,v)}
let _homePrevScore=0;
function applyDark(){document.body.classList.toggle('dark',!!S('nz_dark_mode'));}
applyDark();

/* ===================== AUDIO ===================== */
let _ac=null;
function getAC(){
  if(!_ac)try{_ac=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}
  return _ac;
}
function tone(freq,dur,type='sine',vol=0.28,ac=null){
  const a=ac||getAC();if(!a)return;
  try{
    const o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);
    o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);
    g.gain.setValueAtTime(vol,a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur);
    o.start(a.currentTime);o.stop(a.currentTime+dur+0.01);
  }catch(e){}
}
function haptic(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function playSound(type){
  if(type==='correct')haptic(10);
  else if(type==='wrong')haptic([30,50,30]);
  else if(type==='complete')haptic(50);
  else if(type==='achievement')haptic(100);
  if(!S('nz_settings').sfx)return;
  const ac=getAC();if(!ac)return;
  try{
    if(type==='correct'){
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);
      o.frequency.setValueAtTime(220,ac.currentTime);
      o.frequency.linearRampToValueAtTime(440,ac.currentTime+0.08);
      g.gain.setValueAtTime(0.3,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);
      o.start();o.stop(ac.currentTime+0.13);
    } else if(type==='wrong'){
      tone(180,0.12,'sawtooth',0.2);
    } else if(type==='complete'){
      [261.6,329.6,392].forEach((f,i)=>setTimeout(()=>tone(f,0.5,'sine',0.14),i*60));
    } else if(type==='achievement'){
      [440,550,660,880,1100].forEach((f,i)=>setTimeout(()=>tone(f,0.1,'sine',0.18),i*70));
    } else if(type==='tap'){
      tone(900,0.03,'sine',0.08);
    }
  }catch(e){}
}

/* ===================== UTILS ===================== */
function $(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}
let _toastT=null;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(_toastT);_toastT=setTimeout(()=>el.classList.remove('show'),2800);
}
function todayKey(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function isPlayedToday(){return S('nz_last_played')===todayKey();}
/* Brain-score tier ladder, scaled for the 0–10000 brain-score range.
   Returns a short label (max 8 chars) so the existing home-page ring chip
   (“🧠 ${brainLevel(score)}”) keeps fitting without UI breakage. */
function brainLevel(s){
  const p=prestigeLevel(s);
  if(p)return p.badge+' '+p.title.toUpperCase();
  if(s<500)  return'BEGINNER';
  if(s<1200) return'NOVICE';
  if(s<2200) return'LEARNER';
  if(s<3500) return'FOCUSED';
  if(s<5000) return'SHARP MIND';
  if(s<6500) return'ANALYTICAL';
  if(s<8000) return'STRATEGIST';
  if(s<9000) return'BRAIN MASTER';
  if(s<9800) return'NEURO ELITE';
  return'NEUROZEN LEGEND';
}
function brainLevelEmoji(s){
  if(s<500)  return'🌱';
  if(s<1200) return'📚';
  if(s<2200) return'🎯';
  if(s<3500) return'⚡';
  if(s<5000) return'🧠';
  if(s<6500) return'🔬';
  if(s<8000) return'💡';
  if(s<9000) return'💎';
  if(s<9800) return'🏆';
  return'👑';
}
function greet(){
  const h=new Date().getHours();
  if(h>=6&&h<12)return'Good morning 👋';
  if(h>=12&&h<17)return'Good afternoon ☀️';
  if(h>=17&&h<21)return'Good evening 🌆';
  return'Hey, night owl 🦉';
}
function confetti(count=60){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const colors=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24'];
  for(let i=0;i<count;i++){
    const c=document.createElement('div');
    c.className='confetti-piece';
    c.style.cssText=`left:${Math.random()*100}vw;background:${colors[i%colors.length]};
      animation:confettiFall ${1.5+Math.random()*2}s ease ${Math.random()*0.8}s forwards;
      transform:rotate(${Math.random()*360}deg);`;
    document.body.appendChild(c);
    setTimeout(()=>c.remove(),4000);
  }
}
let _comboT=null;
function showCombo(text){
  const el=document.getElementById('comboBadge');
  el.textContent=text;
  el.classList.remove('combo-out');
  void el.offsetWidth;
  el.classList.add('combo-in');
  clearTimeout(_comboT);
  _comboT=setTimeout(()=>{el.classList.remove('combo-in');el.classList.add('combo-out');setTimeout(()=>el.classList.remove('combo-out'),400);},1200);
}
function showAchToast(msg){
  const el=document.getElementById('achToast');
  el.innerHTML=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3200);
}

/* ===================== XP / LEVELS ===================== */
const LEVELS=[
  {lv:1,name:'Novice',xp:0},
  {lv:2,name:'Apprentice',xp:400},
  {lv:3,name:'Thinker',xp:900},
  {lv:4,name:'Scholar',xp:1800},
  {lv:5,name:'Expert',xp:3200},
  {lv:6,name:'Genius',xp:5000},
  {lv:7,name:'Prodigy',xp:7500},
  {lv:8,name:'Mastermind',xp:11000},
  {lv:9,name:'Sage',xp:15000},
  {lv:10,name:'Legend',xp:20000},
];
const PRESTIGE_TIERS=[
  {score:10000, badge:'⭐', title:'Ascended'},
  {score:20000, badge:'🌟', title:'Transcendent'},
  {score:35000, badge:'💫', title:'Enlightened'},
  {score:55000, badge:'✨', title:'Cosmic'},
  {score:80000, badge:'🌌', title:'Eternal'},
];
function prestigeLevel(score){
  let tier=null;
  for(const t of PRESTIGE_TIERS){if(score>=t.score)tier=t;}
  return tier;
}
function xpLevel(xp){
  let cur=LEVELS[0];
  for(const l of LEVELS){if(xp>=l.xp)cur=l;}
  const next=cur.lv<10?LEVELS[cur.lv]:null;
  return{cur,next};
}
function showLevelUp(lv){
  playSound('achievement');confetti(80);
  const ov=$(`<div class="lvlup-ov">
    <div class="lvlup-card">
      <div style="font-size:54px;">⬆️</div>
      <div class="lvlup-title">LEVEL UP!</div>
      <div class="lvlup-name">Lv ${lv.lv} · ${lv.name}</div>
      <button class="btn-primary" style="margin-top:18px;min-width:180px;">Awesome! 🎉</button>
    </div>
  </div>`);
  document.body.appendChild(ov);
  ov.querySelector('button').onclick=()=>{ov.style.opacity='0';ov.style.transition='opacity .2s';setTimeout(()=>ov.remove(),200);};
}
/* ===================== DAILY CHALLENGE ===================== */
const DAILY_DEFS=[
  {game:'math',label:'Score 15+ in Quick Math',check:v=>v>=15},
  {game:'wordflash',label:'Score 12+ in Word Flash',check:v=>v>=12},
  {game:'wordchain',label:'Score 20+ in Word Chain',check:v=>v>=20},
  {game:'memory',label:'Score 25+ in Memory Matrix',check:v=>v>=25},
  {game:'pattern',label:'Score 8+ in Pattern IQ',check:v=>v>=8},
  {game:'stroopx',label:'Score 30+ in Color Stroop',check:v=>v>=30},
  {game:'schulte',label:'Score 40+ in Schulte Table',check:v=>v>=40},
  {game:'reactionlab',label:'Score 25+ in Reaction Lab',check:v=>v>=25},
  {game:'mindtrace',label:'Score 25+ in Mind Trace',check:v=>v>=25},
];
function todayChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  return DAILY_DEFS[dayN%DAILY_DEFS.length];
}
function dailyDoneToday(){
  return S('nz_daily_challenge_date')===todayKey()&&!!S('nz_daily_challenge_done');
}

/* ===================== ACHIEVEMENTS ===================== */
const ACHIEVEMENTS=[
  {id:'first_game',emoji:'🎮',title:'First Steps',check:()=>S('nz_games_played')>=1},
  {id:'streak_3',emoji:'🔥',title:'On Fire',check:()=>S('nz_streak')>=3},
  {id:'streak_7',emoji:'⚡',title:'Dedicated',check:()=>S('nz_streak')>=7},
  {id:'score_200',emoji:'🧠',title:'Brain Boost',check:()=>S('nz_brain_score')>=200},
  {id:'score_500',emoji:'💎',title:'Half Way',check:()=>S('nz_brain_score')>=500},
  {id:'score_1000',emoji:'👑',title:'Master Mind',check:()=>S('nz_brain_score')>=1000},
  {id:'games_10',emoji:'🏃',title:'Regular',check:()=>S('nz_games_played')>=10},
  {id:'games_25',emoji:'🏅',title:'Veteran',check:()=>S('nz_games_played')>=25},
  {id:'speed_king',emoji:'⚡',title:'Speed King',check:(gId,sc)=>gId==='math'&&sc>=15},
  {id:'memory_pro',emoji:'💡',title:'Memory Pro',check:(gId,sc)=>gId==='memory'&&sc>=12},
  {id:'wordsmith',emoji:'📝',title:'Wordsmith',check:(gId,sc)=>gId==='wordflash'&&sc>=12},
  {id:'wordchain_pro',emoji:'🔵',title:'Chain Master',check:(gId,sc)=>gId==='wordchain'&&sc>=14},
  {id:'pattern_lord',emoji:'🔷',title:'Pattern Lord',check:(gId,sc)=>gId==='pattern'&&sc>=8},
  {id:'math_wizard',emoji:'🔢',title:'Math Wizard',check:(gId,sc)=>gId==='math'&&sc>=18},
  {id:'schulte_flash',emoji:'▦',title:'Flash Focus',check:(gId,sc)=>gId==='schulte'&&sc>=60},
];
function checkAchievements(gameId,score){
  const unlocked=S('nz_achievements');
  ACHIEVEMENTS.forEach(a=>{
    if(!unlocked.includes(a.id)){
      let pass=false;
      try{pass=a.check(gameId,score);}catch(e){}
      if(pass){
        unlocked.push(a.id);setS('nz_achievements',unlocked);
        playSound('achievement');
        showAchToast(`${a.emoji} Achievement unlocked! <strong>${a.title}</strong>`);
        confetti(40);
      }
    }
  });
}

/* ===================== SCORE SYSTEM ===================== */
const GAME_SKILL_MAP={
  schulte:    {p:'focus',     s:'speed'},
  memory:     {p:'memory',    s:'attention'},
  pattern:    {p:'logic',     s:'focus'},
  wordflash:  {p:'memory',    s:'speed'},
  wordchain:  {p:'memory',    s:'logic'},
  math:       {p:'speed',     s:'logic'},
  stroopx:    {p:'attention', s:'focus'},
  iqtest:     {p:'logic',     s:'memory'},
  reactionlab:{p:'speed',     s:'attention'},
  mindtrace:  {p:'planning',  s:'logic'},
};
function diminishFactor(bs){
  if(bs<2000)return 1.00;
  if(bs<5000)return 0.80;
  if(bs<8000)return 0.55;
  return 0.35;
}
function antiFarmFactor(gameId){
  const today=todayKey();
  const tc=S('nz_today_game_counts');
  if(tc.date!==today){tc.date=today;tc.counts={};}
  const n=(tc.counts[gameId]||0)+1;
  tc.counts[gameId]=n;
  setS('nz_today_game_counts',tc);
  const factors=[1.0,0.85,0.70,0.55,0.40];
  const f=factors[Math.min(n-1,4)];
  if(n===3)setTimeout(()=>toast('🔄 Try a different game for more Brain Score!'),500);
  if(n>=4)setTimeout(()=>toast('🧠 Switch games — your brain needs variety!'),500);
  return f;
}
function diversityBonus(gameId){
  const today=todayKey();
  const dc=S('nz_today_categories');
  if(dc.date!==today){dc.date=today;dc.cats=[];}
  const cat=(GAMES.find(g=>g.id===gameId)||{}).cat||gameId;
  if(!dc.cats.includes(cat))dc.cats.push(cat);
  setS('nz_today_categories',dc);
  return dc.cats.length===3?5:0;
}
function maybeInitWeekSnapshot(){
  const d=new Date();
  const monday=new Date(d);
  monday.setDate(d.getDate()-((d.getDay()+6)%7));
  const mondayKey=monday.toISOString().slice(0,10);
  if(S('nz_week_start_date')!==mondayKey){
    setS('nz_week_start_date',mondayKey);
    setS('nz_week_skill_start',{...S('nz_skill_scores')});
  }
}

function awardScore(rawPts,skillKey,gameId,gameScore,starThresh,isPerfect){
  maybeInitWeekSnapshot();
  const basePts=Math.max(1,rawPts);
  const cur=S('nz_brain_score');
  const df=diminishFactor(cur);
  const af=antiFarmFactor(gameId);

  /* Perfect bonus: 3 stars + new personal best = +3 */
  const bestScores=S('nz_best_scores');
  const isNewBest=!bestScores[gameId]||gameScore>bestScores[gameId];
  const st2=starThresh||[5,10,15];
  const got3Stars=gameScore>=(st2[2]||st2[1]*2);
  const perfectBonus=(got3Stars&&isNewBest)?3:0;

  let pts=Math.max(1,Math.round(basePts*df*af))+perfectBonus;

  const divB=diversityBonus(gameId);
  if(divB>0){pts+=divB;setTimeout(()=>toast('🎯 Diversity Bonus! +'+divB+' Brain Score'),700);}
  if(perfectBonus>0)setTimeout(()=>toast('✨ Perfect Performance! +'+perfectBonus+' Brain Score bonus!'),400);

  const next=Math.max(0,cur+pts);
  setS('nz_brain_score',next);

  const prevPrestige=prestigeLevel(cur);
  const newPrestige=prestigeLevel(next);
  if(newPrestige&&(!prevPrestige||newPrestige.score>prevPrestige.score)){
    setTimeout(()=>{confetti(120);toast(newPrestige.badge+' Prestige: '+newPrestige.title+'!');},1000);
  }

  setS('nz_games_played',S('nz_games_played')+1);
  const gPlays=S('nz_game_plays');
  gPlays[gameId]=(gPlays[gameId]||0)+1;
  setS('nz_game_plays',gPlays);

  const prevLast=S('nz_last_played');
  const today=todayKey();
  if(prevLast!==today){
    const yDate=new Date(Date.now()-86400000);
    const yesterday=yDate.getFullYear()+'-'+String(yDate.getMonth()+1).padStart(2,'0')+'-'+String(yDate.getDate()).padStart(2,'0');
    const newStreak=prevLast===yesterday?S('nz_streak')+1:1;
    setS('nz_streak',newStreak);setS('nz_last_played',today);setS('nz_today_games',1);
    if(newStreak>1)setTimeout(()=>toast('🔥 '+newStreak+' day streak!'),400);
  }else{
    setS('nz_today_games',S('nz_today_games')+1);
  }

  const _dh=S('nz_daily_history')||{};
  _dh[today]=Math.max(_dh[today]||0,next);
  const _allKeys=Object.keys(_dh).sort();
  while(_allKeys.length>7){delete _dh[_allKeys.shift()];}
  setS('nz_daily_history',_dh);

  const skMap=GAME_SKILL_MAP[gameId]||{p:skillKey,s:null};
  const sk=S('nz_skill_scores');
  const skPrev=S('nz_skill_scores_prev');
  Object.keys(sk).forEach(k=>{skPrev[k]=sk[k]||0;});
  const pGain=Math.max(1,Math.round(basePts*0.18));
  const sGain=Math.max(1,Math.round(basePts*0.09));
  if(skMap.p)sk[skMap.p]=Math.min(100,(sk[skMap.p]||0)+pGain);
  if(skMap.s)sk[skMap.s]=Math.min(100,(sk[skMap.s]||0)+sGain);
  setS('nz_skill_scores',sk);
  setS('nz_skill_scores_prev',skPrev);
  setS('nz_last_skill_gain',{
    primary:skMap.p,pGain,secondary:skMap.s,sGain,
    bsGain:pts,prevBs:cur,newBs:next,
    divBonus:divB,perfectBonus,
    farmFactor:af<1?Math.round(af*100):null
  });

  checkAchievements(gameId,gameScore);

  const _st2=starThresh||[5,10,15];
  const _xpTiers={
    schulte:[10,22,38,55],memory:[10,20,35,50],pattern:[10,22,38,55],
    wordflash:[10,20,35,50],wordchain:[10,20,35,48],math:[10,22,38,55],
    stroopx:[10,20,35,50],iqtest:[12,25,42,60],reactionlab:[10,20,35,50],mindtrace:[10,20,35,50],
  };
  const tiers=_xpTiers[gameId]||[10,20,35,50];
  let xpGain;
  if(gameScore>=(_st2[2]||_st2[1]*2))xpGain=tiers[3];
  else if(gameScore>=(_st2[1]||_st2[0]*1.5))xpGain=tiers[2];
  else if(gameScore>=_st2[0])xpGain=tiers[1];
  else xpGain=tiers[0];
  const dch=todayChallenge();
  if(dch&&gameId===dch.game&&!dailyDoneToday()&&dch.check(gameScore)){
    xpGain=Math.round(xpGain*1.5);
    setS('nz_daily_challenge_date',today);setS('nz_daily_challenge_done',true);setS('nz_daily_challenge_xp',xpGain);
    setTimeout(()=>toast('🎯 Daily Challenge complete! Bonus XP!'),600);
  }
  const oldXp=S('nz_xp'),newXp=oldXp+xpGain;
  setS('nz_xp',newXp);
  const prevLv=xpLevel(oldXp).cur.lv,newLv=xpLevel(newXp).cur;
  if(newLv.lv>prevLv)setTimeout(()=>showLevelUp(newLv),900);

  return pts;
}

/* ===================== NAV / RENDER ===================== */
let currentTab='home';
const tabs=['home','games','progress','relax','profile'];
function render(tab,dir){
  if(!dir)dir=tabs.indexOf(tab)>tabs.indexOf(currentTab)?'fwd':'back';
  currentTab=tab;
  _clearAllTimers();
  const app=document.getElementById('app');
  app.innerHTML='';
  let page;
  if(tab==='home')page=renderHome();
  else if(tab==='games')page=renderGames();
  else if(tab==='progress')page=renderProgress();
  else if(tab==='relax')page=renderRelax();
  else if(tab==='profile')page=renderProfile();
  page.classList.add('page','dir-'+dir);
  app.appendChild(page);
  app.appendChild(renderNav());
}
function renderNav(){
  const nav=$(`<div class="nav"><div class="nav-inner"></div></div>`);
  const inner=nav.querySelector('.nav-inner');
  const items=[
    {k:'home',l:'Home',svg:'<path d="M3 12L12 4l9 8M5 10v10h4v-6h6v6h4V10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'},
    {k:'games',l:'Games',svg:'<rect x="3" y="8" width="18" height="12" rx="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/>'},
    {k:'progress',l:'Stats',svg:'<path d="M3 17l5-5 4 4 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 8h6v6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'},
    {k:'relax',l:'Relax',svg:'<path d="M12 3c2 3 2 6 0 9-2 3-2 6 0 9M6 6c1 2 1 4 0 6M18 6c-1 2-1 4 0 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'},
    {k:'profile',l:'Profile',svg:'<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'},
  ];
  items.forEach(it=>{
    const b=$(`<button class="nav-btn ${currentTab===it.k?'active':''}"><svg viewBox="0 0 24 24">${it.svg}</svg><span>${it.l}</span></button>`);
    b.onclick=()=>{
      if(currentTab===it.k)return;
      playSound('tap');
      const dir=tabs.indexOf(it.k)>tabs.indexOf(currentTab)?'fwd':'back';
      render(it.k,dir);
      setTimeout(()=>{const all=document.querySelectorAll('.nav-btn');all[items.findIndex(x=>x.k===it.k)]?.classList.add('bounced');setTimeout(()=>all[items.findIndex(x=>x.k===it.k)]?.classList.remove('bounced'),400)},10);
    };
    inner.appendChild(b);
  });
  return nav;
}

/* ══════════ GAME MASTERY SYSTEM ══════════════════════════
   Each game has a Mastery Level 1-30.
   Mastery XP needed per level increases (50, 55, 61, 68, 75...).
   Mastery is separate from Brain Score — tracks game-specific depth. */

const MASTERY_TITLES={
  1:'Beginner',3:'Explorer',5:'Practitioner',8:'Skilled',
  12:'Expert',16:'Master',20:'Elite',25:'Virtuoso',30:'Legend'
};
function masteryXpForLevel(lv){
  if(lv<=1)return 0;
  return 45+(lv-1)*5;
}
function getMastery(gameId){
  const m=S('nz_mastery');
  return m[gameId]||{level:1,xp:0,totalXp:0};
}
function getMasteryTitle(level){
  let title='Beginner';
  Object.entries(MASTERY_TITLES).forEach(([lv,t])=>{if(level>=+lv)title=t;});
  return title;
}
function getMasteryBadge(level){
  if(level>=30)return'🏅';
  if(level>=20)return'💎';
  if(level>=12)return'🥇';
  if(level>=5) return'🥈';
  if(level>=2) return'🥉';
  return'';
}
function awardMastery(gameId,gameScore,starThresh){
  const st=starThresh||[5,10,15];
  const mxp=gameScore>=(st[2]||20)?12:gameScore>=(st[1]||10)?8:gameScore>=(st[0]||5)?5:3;
  const m=S('nz_mastery');
  if(!m[gameId])m[gameId]={level:1,xp:0,totalXp:0};
  const g=m[gameId];
  g.xp+=mxp;
  g.totalXp=(g.totalXp||0)+mxp;
  let leveled=false;
  while(g.level<30&&g.xp>=masteryXpForLevel(g.level+1)){
    g.xp-=masteryXpForLevel(g.level+1);
    g.level++;
    leveled=true;
  }
  m[gameId]=g;
  setS('nz_mastery',m);
  if(leveled){
    const gName=(GAMES.find(x=>x.id===gameId)||{}).name||gameId;
    const badge=getMasteryBadge(g.level);
    setTimeout(()=>{confetti(50);toast(`${badge} ${gName} Mastery Lv ${g.level}! ${getMasteryTitle(g.level)}`);},1200);
  }
  return{mxp,newLevel:g.level,leveled};
}

/* ===================== HOME ===================== */
function renderHome(){
  const name=S('nz_username');
  const score=S('nz_brain_score');
  const streak=S('nz_streak');
  const goal=S('nz_today_goal');
  const todayCount=isPlayedToday()?S('nz_today_games'):0;
  const todayGame=GAMES[new Date().getDay()%GAMES.length];
  const xp=S('nz_xp');
  const {cur:lvCur,next:lvNext}=xpLevel(xp);
  const xpPct=lvNext?Math.min(100,Math.round((xp-lvCur.xp)/(lvNext.xp-lvCur.xp)*100)):100;
  const p=$(`<div></div>`);
  p.innerHTML=`
    <div class="hdr">
      <div><div class="greet" id="greetTxt"></div><h1>${name}</h1></div>
      <div class="hdr-right">
        <button class="icon-btn" id="darkToggle">${S('nz_dark_mode')?'☀️':'🌙'}</button>
        <div class="avatar">${name.charAt(0).toUpperCase()}</div>
      </div>
    </div>
    <div class="card score-card">
      <div class="ring-wrap">
        <svg width="230" height="230" viewBox="0 0 230 230">
          <defs><linearGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#A78BFA"/><stop offset="50%" stop-color="#60A5FA"/><stop offset="100%" stop-color="#34D399"/>
          </linearGradient></defs>
          <circle cx="115" cy="115" r="100" stroke="rgba(167,139,250,0.12)" stroke-width="16" fill="none"/>
          <circle id="ringFg" cx="115" cy="115" r="100" stroke="url(#ringG)" stroke-width="16" fill="none" stroke-linecap="round" stroke-dasharray="${2*Math.PI*100}" stroke-dashoffset="${2*Math.PI*100}"/>
        </svg>
        <div class="ring-inner">
          <div class="ring-label">BRAIN SCORE</div>
          <div class="ring-num" id="ringNum">0</div>
          <div class="ring-delta">🧠 ${brainLevel(score)}</div>
        </div>
      </div>
      <div class="xp-row">
        <div class="xp-top"><span>⬆️ Lv ${lvCur.lv} · ${lvCur.name}</span><span>${lvNext?`${xp-lvCur.xp}/${lvNext.xp-lvCur.xp} XP to Lv ${lvNext.lv}`:'MAX LEVEL 👑'}</span></div>
        <div class="xp-bar"><div class="xp-fill" id="xpFill" style="width:0%"></div></div>
      </div>
      <div class="stats-row">
        <div class="stat-mini">
          <div class="ico flame flame-pulse">🔥</div>
          <div><div class="v">${streak}</div><div class="l">Day Streak</div></div>
        </div>
        <div class="stat-mini">
          <div class="ico target">🎯</div>
          <div><div class="v">${Math.min(todayCount,goal)}/${goal}</div><div class="l">Today's Goal</div></div>
        </div>
      </div>
    </div>
    <div id="dailyCh"></div>
    <div class="sec-title"><h2>Your Skills</h2><a href="#" onclick="render('progress');return false;">Details ›</a></div>
    <div class="card skills-card"><div id="skillBars"></div></div>
    <div class="sec-title"><h2>Today's Challenge</h2></div>
    <div class="cta feat-float" id="featuredCard" style="cursor:pointer;">
      <div>
        <div class="lbl">FEATURED TODAY</div>
        <div class="ttl">${todayGame.icon} ${todayGame.name}</div>
        <div class="sub">${todayGame.desc}</div>
      </div>
      <div class="play">▶</div>
    </div>
    <div class="sec-title"><h2>Quick Play</h2><a href="#" onclick="render('games');return false;">See all ›</a></div>
    <div class="hscroll" id="qpRow"></div>
    <div class="sec-title"><h2>Daily Brain Workout</h2></div>
    <div id="woSection"></div>
  `;
  p.querySelector('#greetTxt').textContent=greet();
  p.querySelector('#darkToggle').onclick=()=>{setS('nz_dark_mode',!S('nz_dark_mode'));applyDark();render('home');};
  p.querySelector('#featuredCard').onclick=()=>openGame(todayGame.id);
  // Daily challenge card
  const dch=todayChallenge();
  const dchGame=GAMES.find(g=>g.id===dch.game);
  const dchDone=dailyDoneToday();
  const dEl=p.querySelector('#dailyCh');
  dEl.innerHTML=`<div class="sec-title"><h2>Daily Challenge</h2></div>
    <div class="daily-card ${dchDone?'done':''}">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="dc-ico">${dchDone?'✅':'🎯'}</div>
        <div style="flex:1;">
          <div class="dc-name">${dch.label}</div>
          <div class="dc-sub">${dchDone?`Completed! +${S('nz_daily_challenge_xp')} XP earned`:dchGame.icon+' '+dchGame.name}</div>
        </div>
        <span class="dc-badge">2x XP</span>
      </div>
      ${dchDone?'':'<button class="dc-play" id="dcPlay">Play Now ▶</button>'}
    </div>`;
  const dcBtn=dEl.querySelector('#dcPlay');
  if(dcBtn)dcBtn.onclick=()=>{playSound('tap');openGame(dch.game);};
  const qp=p.querySelector('#qpRow');
  GAMES.forEach(g=>{
    const best=S('nz_best_scores')[g.id];
    const m=getMastery(g.id);
    const mb=getMasteryBadge(m.level);
    const c=$(`<div class="qp-card" style="background:${g.bg}">
      <div class="qico" style="background:${g.iconBg}">${g.icon}</div>
      <div>
        <div class="qn">${g.name}</div>
        <div class="qlv">${best?'Best: '+best:'New!'}</div>
        ${m.level>1?`<div class="qp-mastery">${mb} Lv ${m.level}</div>`:''}
      </div>
    </div>`);
    c.onclick=()=>{playSound('tap');openGame(g.id);};
    qp.appendChild(c);
  });
  const wo=p.querySelector('#woSection');
  if(wo){
    const wGames=getWorkoutGames();
    const woCard=$(`<div class="workout-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div><h3>🏋️ Daily Workout</h3><div class="wo-sub">Targets your 3 weakest skill areas</div></div>
        <div style="font-size:26px;opacity:.85;">💪</div>
      </div>
      <div class="wo-games">${wGames.map(g=>`<div class="wo-game"><span>${g.icon}</span><span>${g.name}</span></div>`).join('')}</div>
      <button class="wo-start">Start Workout 🏋️</button>
    </div>`);
    woCard.querySelector('.wo-start').onclick=()=>{playSound('tap');showWorkoutTransition({games:wGames,idx:0});};
    wo.appendChild(woCard);
  }
  const skillBars=p.querySelector('#skillBars');
  const sk=S('nz_skill_scores');
  Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed',Planning:'planning',Attention:'attention'}).forEach(([label,key])=>{
    const val=sk[key]||0;
    const row=$(`<div class="skill-bar-row">
      <div class="skill-bar-label">${label}</div>
      <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:0%"></div></div>
      <div class="skill-bar-val">${val}</div>
    </div>`);
    skillBars.appendChild(row);
    setTimeout(()=>{row.querySelector('.skill-bar-fill').style.width=val+'%';},50);
  });
  setTimeout(()=>{
    const circ=2*Math.PI*100;const pct=Math.min(1,score/10000);
    const fg=p.querySelector('#ringFg');
    fg.style.transition='stroke-dashoffset 1.8s cubic-bezier(.22,1,.36,1)';
    fg.style.strokeDashoffset=circ*(1-pct);
    const xf=p.querySelector('#xpFill');
    if(xf){xf.style.transition='width 1.2s ease';xf.style.width=xpPct+'%';}
    const num=p.querySelector('#ringNum');
    const fromS=_homePrevScore;_homePrevScore=score;
    const start=performance.now();
    function tick(t){const k=Math.min(1,(t-start)/1800);const e=1-Math.pow(1-k,3);num.textContent=Math.round(fromS+(score-fromS)*e);if(k<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  },40);
  return p;
}

/* ===================== GAMES DATA ===================== */
const GAMES=[
  {id:'schulte',name:'Schulte Table',cat:'Focus',skill:'focus',bg:'#EEF2FF',iconBg:'linear-gradient(135deg,#7C3AED,#4F8EF7)',icon:'▦',desc:'Tap numbers in order, as fast as you can'},
  {id:'memory',name:'Memory Matrix',cat:'Memory',skill:'memory',bg:'#F3E8FF',iconBg:'linear-gradient(135deg,#4F8EF7,#60A5FA)',icon:'🧠',desc:'Memorize the pattern, then recall it'},
  {id:'pattern',name:'Pattern IQ',cat:'Logic',skill:'logic',bg:'#FFF0F3',iconBg:'linear-gradient(135deg,#F472B6,#EC4899)',icon:'💡',desc:'Find the pattern in color, number & matrix sequences'},
  {id:'wordflash',name:'Word Flash',cat:'Memory',skill:'memory',bg:'#ECFDF5',iconBg:'linear-gradient(135deg,#34D399,#10B981)',icon:'📝',desc:'Remember the flashed word under time pressure'},
  {id:'wordchain',name:'Word Chain',cat:'Memory',skill:'memory',bg:'#EFF6FF',iconBg:'linear-gradient(135deg,#3B82F6,#1D4ED8)',icon:'🔗',desc:'Remember the chain of words — test your verbal memory'},
  {id:'math',name:'Quick Math',cat:'Speed',skill:'speed',bg:'#FFFBEB',iconBg:'linear-gradient(135deg,#FBBF24,#F59E0B)',icon:'🔢',desc:'Solve math problems at speed'},
  {id:'stroopx',name:'Color Stroop Xtreme',cat:'Focus',skill:'focus',bg:'#FFF0F3',iconBg:'linear-gradient(135deg,#F472B6,#EC4899)',icon:'🎨',desc:'Name the ink color, not the word — as fast as you can'},
  {id:'iqtest',name:'IQ Test',cat:'Reasoning',skill:'logic',bg:'#F0FDF4',iconBg:'linear-gradient(135deg,#34D399,#059669)',icon:'🧩',desc:'25 Hinglish reasoning questions — find your IQ score'},
  {id:'reactionlab',name:'Reaction Lab',cat:'Speed',skill:'speed',bg:'#FFFBEB',iconBg:'linear-gradient(135deg,#F59E0B,#EF4444)',icon:'⚡',desc:'Tap the circle the instant it appears — test your raw reaction speed'},
  {id:'mindtrace',name:'Mind Trace',cat:'Logic',skill:'logic',bg:'#EEF2FF',iconBg:'linear-gradient(135deg,#6D28D9,#7C3AED)',icon:'✏️',desc:'Trace every edge in ONE stroke — plan your path before drawing'},
];
const CATS=['All','Memory','Focus','Logic','Speed','Reasoning'];
let gamesFilter='All';

function renderGames(){
  const p=$(`<div></div>`);
  p.innerHTML=`
    <div class="hdr"><div><div class="greet">Train your brain</div><h1>All Games</h1></div></div>
    <div class="chip-row" id="chips"></div>
    <div class="game-grid" id="ggrid"></div>
  `;
  const chips=p.querySelector('#chips');
  CATS.forEach(c=>{
    const ch=$(`<button class="chip ${c===gamesFilter?'active':''}">${c}</button>`);
    ch.onclick=()=>{playSound('tap');gamesFilter=c;fill();chips.querySelectorAll('.chip').forEach((el,i)=>el.classList.toggle('active',CATS[i]===c));};
    chips.appendChild(ch);
  });
  const grid=p.querySelector('#ggrid');
  function fill(){
    grid.innerHTML='';
    GAMES.filter(g=>gamesFilter==='All'||g.cat===gamesFilter).forEach(g=>{
      const best=S('nz_best_scores')[g.id];
      const plays=S('nz_game_plays')[g.id]||0;
      const isNew=plays<3;
      const isDaily=todayChallenge().game===g.id;
      const gm=getMastery(g.id);
      const c=$(`<div class="gcard" style="background:${g.bg}">
        ${isNew?'<div class="new-badge">NEW</div>':''}
        ${isDaily?'<div class="featured-badge">🎯 TODAY</div>':''}
        <div class="gico gico-shimmer" style="background:${g.iconBg}">${g.icon}</div>
        <div class="gn">${g.name}</div>
        <div class="gbest">${best?'Best: '+best:'Play to set record!'}</div>
        ${gm.level>1?`<div class="gm-mastery">${getMasteryBadge(gm.level)} Mastery Lv ${gm.level} · ${getMasteryTitle(gm.level)}</div>`:''}
        <div class="grow"><span class="gtag">${g.cat}</span></div>
        ${best?`<div class="pb-badge">PB: ${best}</div>`:''}
      </div>`);
      c.onclick=()=>{playSound('tap');openGame(g.id);};
      grid.appendChild(c);
    });
  }
  fill();
  return p;
}

/* ===================== GAME SCREEN FRAMEWORK ===================== */
function openGame(id,wkCtx){
  const g=GAMES.find(x=>x.id===id);
  // Remove existing game screens to prevent timer conflicts
  const existingScreens=document.querySelectorAll('.game-screen');
  existingScreens.forEach(el=>{
    el.dispatchEvent(new Event('remove_game'));
    el.remove();
  });
  _clearAllTimers();
  const wrap=$(`<div class="game-screen"></div>`);
  document.body.appendChild(wrap);
  let state={score:0,timer:null,startTs:Date.now(),_frozenTime:null,_frozenScore:undefined,_pausedAt:null,_visHandler:null};
  function hdr(){
    const _t=state._frozenTime?(state._frozenTime+'s'):state.startTs?(((Date.now()-state.startTs)/1000).toFixed(1)+'s'):'0.0s';
    const _s=state._frozenScore!==undefined?state._frozenScore:(state.score||0);
    return `<div class="gs-hdr">
      <button class="gs-back">←</button>
      <div class="gs-title">${g.name}</div>
      <span class="gs-tag">${g.cat}</span>
    </div>
    <div class="gs-stats">
      <div class="gs-stat"><div class="v" id="gsTime">${_t}</div><div class="l">Time</div></div>
      <div class="gs-stat"><div class="v" id="gsScore">${_s}</div><div class="l">Score</div></div>
    </div>`;
  }
  function closeGame(){
    if(state._visHandler){document.removeEventListener('visibilitychange',state._visHandler);state._visHandler=null;}
    wrap.dispatchEvent(new Event('remove_game'));
    clearInterval(state.timer);
    state.timer=null;
    _clearAllTimers();
    // Remove ALL game screens to be safe
    document.querySelectorAll('.game-screen').forEach(el=>{
      if(el!==wrap)el.remove();
    });
    wrap.style.animation='slideUp .25s reverse';
    setTimeout(()=>{wrap.remove();},230);
  }
  function startClock(){
    state.startTs=Date.now();
    state._pausedAt=null;
    function _tick(){
      const el=wrap.querySelector('#gsTime');
      if(el)el.textContent=((Date.now()-state.startTs)/1000).toFixed(1)+'s';
    }
    state._visHandler=()=>{
      if(document.hidden){
        state._pausedAt=Date.now();
        clearInterval(state.timer);state.timer=null;
      }else if(state._pausedAt){
        state.startTs+=Date.now()-state._pausedAt;
        state._pausedAt=null;
        state.timer=setInterval(_tick,100);
      }
    };
    document.addEventListener('visibilitychange',state._visHandler);
    state.timer=setInterval(_tick,100);
  }
  function setScore(s){state.score=s;const el=wrap.querySelector('#gsScore');if(el)el.textContent=s;}
  function endGame(opts){
    clearInterval(state.timer);
    const secs=state.startTs?((Date.now()-state.startTs)/1000).toFixed(1):'0.0';
    state._frozenTime=opts.timeOverride||secs;
    state._frozenScore=state.score||0;
    const best=S('nz_best_scores');
    const isRec=opts.bestVal!==undefined?(!best[id]||opts.bestVal>best[id]):(!best[id]||opts.value>best[id]);
    const recVal=opts.bestVal!==undefined?opts.bestVal:opts.value;
    if(isRec){best[id]=recVal;setS('nz_best_scores',best);}
    const pts=awardScore(Math.max(2,opts.points||2),g.skill,id,opts.value,opts.starThresh);
    const mResult=awardMastery(id,opts.value,opts.starThresh);
    playSound('complete');
    const starThresh=opts.starThresh||[5,10,15];
    const stars=opts.value>=starThresh[2]?3:opts.value>=starThresh[1]?2:opts.value>=starThresh[0]?1:0;
    const rankPct=opts.value/(starThresh[2]||1);
    const rank=rankPct>=0.9?'S':rankPct>=0.75?'A':rankPct>=0.5?'B':'C';
    const nextG=GAMES[(GAMES.findIndex(x=>x.id===id)+1)%GAMES.length];
    if(stars===3)confetti(50);
    wrap.innerHTML=`${hdr()}
      <div class="end ${rank==='S'?'rank-s-border':''}">
        <div class="em">${opts.emoji||'🎉'}</div>
        <h2>${opts.title||'Well done!'}</h2>
        <div style="color:var(--text2);font-size:13px;margin-bottom:8px;">${opts.sub||''}</div>
        <div class="stars">
          <span class="star ${stars>=1?'lit':''}">⭐</span>
          <span class="star ${stars>=2?'lit':''}">⭐</span>
          <span class="star ${stars>=3?'lit':''}">⭐</span>
        </div>
        <div class="rank-chip rank-${rank.toLowerCase()}">RANK ${rank}</div>
        ${(()=>{
          const sg=S('nz_last_skill_gain')||{};
          const L={memory:'Memory',focus:'Focus',logic:'Logic',speed:'Speed',planning:'Planning',attention:'Attention'};
          return `<div class="end-skill-gain">
            ${sg.primary?`<div class="esg-row"><span>${L[sg.primary]||sg.primary}</span><span class="esg-plus">+${sg.pGain||0}</span></div>`:''}
            ${sg.secondary?`<div class="esg-row"><span>${L[sg.secondary]||sg.secondary}</span><span class="esg-plus">+${sg.sGain||0}</span></div>`:''}
            ${sg.perfectBonus?`<div class="esg-row"><span>✨ Perfect Bonus</span><span class="esg-plus">+${sg.perfectBonus}</span></div>`:''}
            ${sg.divBonus?`<div class="esg-row"><span>🎯 Diversity Bonus</span><span class="esg-plus">+${sg.divBonus}</span></div>`:''}
            ${sg.farmFactor?`<div class="esg-row" style="opacity:.6"><span>⚠️ Farm penalty (${sg.farmFactor}%)</span></div>`:''}
            <div class="esg-divider"></div>
            <div class="esg-total"><span>Brain Score</span><span class="gain">+${pts}</span></div>
            <div class="esg-progress">${sg.prevBs||0} → <strong>${sg.newBs||0}</strong></div>
          </div>`;
        })()}
        ${isRec?'<div class="rec">✨ New Personal Record!</div>':''}
        <div class="mastery-chip">
          ${getMasteryBadge(mResult.newLevel)} ${g.name} Mastery
          <strong>Lv ${mResult.newLevel}</strong>
          · ${getMasteryTitle(mResult.newLevel)}
          ${mResult.leveled?'<span class="mastery-levelup">LEVEL UP! 🎉</span>':''}
        </div>
        ${opts.statsHtml||''}
        <div class="btns">
          <button class="btn-primary" id="again">Play Again</button>
          <button class="btn-share">📋 Share Score</button>
          <button class="btn-ghost" id="nextGameBtn">Try ${nextG.name} →</button>
          <button class="btn-ghost" id="back">Back to Games</button>
        </div>
      </div>`;
    wrap.querySelector('#nextGameBtn').onclick=()=>{wrap.remove();openGame(nextG.id);};
    wrap.querySelector('#again').onclick=()=>{wrap.remove();openGame(id);};
    wrap.querySelector('#back').onclick=()=>{closeGame();setTimeout(()=>render('games'),240);};
    wrap.querySelector('.gs-back').onclick=()=>{closeGame();setTimeout(()=>render('games'),240);};
    wrap.querySelector('.btn-share').onclick=()=>{
      const txt=`I scored ${opts.value} in ${g.name} on NeuroZen! 🧠 Can you beat it?`;
      navigator.clipboard?.writeText(txt).then(()=>toast('📋 Copied to clipboard!')).catch(()=>toast(txt));
    };
    if(wkCtx!==undefined){
      const isLast=wkCtx.idx>=wkCtx.games.length-1;
      const backBtn=wrap.querySelector('#back');
      if(backBtn){
        backBtn.textContent=isLast?'✅ Finish Workout':`Next: ${wkCtx.games[wkCtx.idx+1].name} ›`;
        backBtn.style.cssText='background:var(--grad);color:#fff;padding:16px;border-radius:14px;font-weight:700;font-size:15px;box-shadow:var(--shadow);';
        backBtn.onclick=()=>{closeGame();if(!isLast)setTimeout(()=>showWorkoutTransition({...wkCtx,idx:wkCtx.idx+1}),240);else setTimeout(()=>{toast('🏋️ Workout complete! Great job!');render('home');},240);};
      }
      const againBtn=wrap.querySelector('#again');
      if(againBtn)againBtn.onclick=()=>{wrap.remove();openGame(id,wkCtx);};
    }
  }
  wrap.innerHTML=hdr()+`<div class="gs-body" id="gsBody"></div>`;
  wrap.querySelector('.gs-back').onclick=()=>{
    closeGame();
    setTimeout(()=>render('games'),240);
  };
  const body=wrap.querySelector('#gsBody');
  if(id==='schulte')playSchulte(body,setScore,endGame,wrap,startClock);
  else if(id==='memory')playMemory(body,setScore,endGame,wrap,startClock);
  else if(id==='pattern')playPattern(body,setScore,endGame,wrap,startClock);
  else if(id==='wordflash')playWordFlash(body,setScore,endGame,wrap,startClock);
  else if(id==='wordchain')playNeuralChain(body,setScore,endGame,wrap,startClock);
  else if(id==='math')playMath(body,setScore,endGame,wrap,startClock);
  else if(id==='stroopx')playStroopX(body,setScore,endGame,wrap,startClock);
  else if(id==='iqtest')playIQTest(body,setScore,endGame,wrap,startClock);
  else if(id==='reactionlab')playReactionLab(body,setScore,endGame,wrap,startClock);
  else if(id==='mindtrace')playMindTrace(body,setScore,endGame,wrap,startClock);
}

/* ===================== PROGRESS ===================== */
function renderProgress(){
  const p=$(`<div></div>`);
  // Build last-7-days array from date-keyed nz_daily_history
  const _dh7=S('nz_daily_history')||{};
  const _dow7=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const _short7=['S','M','T','W','T','F','S'];
  const h=[];const hDays=[];
  let _lastKnown=0;
  for(let _i=6;_i>=0;_i--){
    const _d=new Date(Date.now()-_i*86400000);
    /* Use LOCAL date — matches todayKey() fix */
    const _k=_d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
    const _val=_dh7[_k]||0;
    if(_val>0)_lastKnown=_val;
    h.push(_val>0?_val:_lastKnown); /* carry forward — no fake dips to 0 */
    hDays.push({label:_dow7[_d.getDay()],short:_short7[_d.getDay()],isToday:_i===0});
  }
  const delta=h[h.length-1]-(h[h.length-2]||0);
  p.innerHTML=`
    <div class="hdr"><div><div class="greet">Track your gains</div><h1>Your Progress</h1></div></div>
    <div class="card line-chart-wrap">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:14px;">Brain Score · 7 days</strong>
        <span style="font-size:12px;color:${delta>=0?'var(--mint)':'#EF4444'};font-weight:600;">${delta>=0?'↗':'-'} ${Math.abs(delta)}</span>
      </div>
      <div id="lineChart"></div>
    </div>
    <div class="sec-title"><h2>Skills Breakdown</h2></div>
    <div class="card" style="padding:18px;">
      <div id="skillBarsP"></div>
    </div>
    <div class="cmp-card" style="margin-top:16px;">
      ${(()=>{
        const _sc=S('nz_brain_score');
        const _p=prestigeLevel(_sc);
        const _nxt=PRESTIGE_TIERS.find(t=>t.score>_sc);
        if(_p&&!_nxt)return`<h3>${_p.badge} Brain Score: ${_sc}</h3><div style="font-size:12px;opacity:.85;">Maximum Prestige achieved! 🌌</div>`;
        if(_nxt)return`<h3>🏆 Brain Score: ${_sc} / ${_nxt.score}</h3><div style="font-size:12px;opacity:.85;">Reach ${_nxt.score} to become ${_nxt.badge} ${_nxt.title}!</div>`;
        return`<h3>🏆 Brain Score: ${_sc} / 10000</h3><div style="font-size:12px;opacity:.85;">Keep training to reach 10000!</div>`;
      })()}
      <div class="pbar"><div id="pbarFill" style="width:0%"></div></div>
    </div>
    <div class="sec-title"><h2>All Time</h2></div>
    <div class="pill-row">
      <div class="pill"><div class="v">${S('nz_games_played')}</div><div class="l">Games</div></div>
      <div class="pill"><div class="v">${S('nz_streak')}</div><div class="l">Day Streak</div></div>
      <div class="pill"><div class="v">${S('nz_achievements').length}</div><div class="l">Achievements</div></div>
    </div>
    <div class="sec-title"><h2>Achievements</h2></div>
    <div class="card"><div class="ach-grid" id="achGrid"></div></div>
  `;
  const sk=S('nz_skill_scores');const skPrev=S('nz_skill_scores_prev');
  const skBars=p.querySelector('#skillBarsP');
  Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed',Planning:'planning',Attention:'attention'}).forEach(([label,key])=>{
    const val=sk[key]||0;const prev=skPrev[key]||0;const diff=val-prev;
    const row=$(`<div class="skill-bar-row">
      <div class="skill-bar-label">${label}</div>
      <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:0%"></div></div>
      <div class="skill-bar-val">${val}${diff>0?`<span style="font-size:10px;color:var(--mint)"> +${diff}</span>`:''}</div>
    </div>`);
    skBars.appendChild(row);
    setTimeout(()=>{row.querySelector('.skill-bar-fill').style.width=val+'%';},80);
  });
  const unlocked=S('nz_achievements');
  const achGrid=p.querySelector('#achGrid');
  ACHIEVEMENTS.forEach(a=>{
    const isUnlocked=unlocked.includes(a.id);
    const el=$(`<div class="ach ${isUnlocked?'unlocked':'locked'}">
      <div class="ach-em">${a.emoji}</div>
      <div class="ach-lbl">${a.title}</div>
    </div>`);
    achGrid.appendChild(el);
  });
  setTimeout(()=>{
    drawLineChart(p.querySelector('#lineChart'),h,hDays);
    const _scPct=S('nz_brain_score');
    const _nxtPct=PRESTIGE_TIERS.find(t=>t.score>_scPct);
    const _targetPct=_nxtPct?_nxtPct.score:Math.max(_scPct,10000);
    const pct=Math.min(100,Math.round(_scPct/_targetPct*100));
    p.querySelector('#pbarFill').style.width=pct+'%';
  },40);
  return p;
}
function drawLineChart(host,data,dayMeta){
  const W=320,H=150,pad=20;
  const filled=data.filter(v=>v>0);
  if(filled.length<2){host.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2);font-size:13px;">Play games to see your progress chart!</div>';return;}
  const min=Math.max(0,Math.min(...filled)-20),max=Math.max(...filled)+20;
  const xs=data.map((_,i)=>pad+i*((W-pad*2)/(data.length-1)));
  const ys=data.map(v=>H-pad-((v-min)/(max-min||1))*(H-pad*2));
  let path=`M ${xs[0]} ${ys[0]}`;
  for(let i=0;i<xs.length-1;i++){const cx=(xs[i]+xs[i+1])/2;path+=` Q ${xs[i]} ${ys[i]} ${cx} ${(ys[i]+ys[i+1])/2}`;}
  path+=` T ${xs[xs.length-1]} ${ys[ys.length-1]}`;
  const area=path+` L ${xs[xs.length-1]} ${H-pad} L ${xs[0]} ${H-pad} Z`;
  const days=dayMeta?dayMeta.map(d=>d.label):['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%">
    <defs><linearGradient id="lcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C3AED" stop-opacity=".35"/><stop offset="1" stop-color="#7C3AED" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#lcG)"/>
    <path d="${path}" stroke="#7C3AED" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  xs.forEach((x,i)=>{
    svg+=`<circle cx="${x}" cy="${ys[i]}" r="4" fill="#7C3AED"/>`;
    svg+=`<text x="${x}" y="${H-4}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${days[i]}</text>`;
    if(i===data.length-1)svg+=`<text x="${x}" y="${ys[i]-9}" text-anchor="middle" font-size="10" font-weight="700" fill="#7C3AED">${data[i]}</text>`;
  });
  svg+='</svg>';
  host.innerHTML=svg;
}

/* ===================== RELAX ===================== */
const SOUNDS=[
  {name:'528 Hz Healing',emoji:'🧬',desc:'Cellular repair frequency'},
  {name:'Deep Theta',emoji:'🌊',desc:'6Hz meditation waves'},
  {name:'Study Focus',emoji:'📚',desc:'Alpha waves for concentration'},
  {name:'Singing Bowl',emoji:'🔔',desc:'Tibetan bowl resonance'},
  {name:'Soft Piano Drone',emoji:'🎹',desc:'Ambient harmonic pad'},
  {name:'Om Tone',emoji:'🕉️',desc:'136.1Hz sacred frequency'},
];
let relaxAudio={ctx:null,master:null,nodes:[],timers:[],playing:-1,targetVol:0.7,paused:false};

function stopRelaxAudio(){
  const ac=relaxAudio.ctx;
  relaxAudio.timers.forEach(t=>{clearInterval(t);clearTimeout(t);});
  relaxAudio.timers=[];
  if(ac&&relaxAudio.master){
    const m=relaxAudio.master;const stale=[...relaxAudio.nodes];
    try{m.gain.cancelScheduledValues(ac.currentTime);m.gain.setValueAtTime(m.gain.value,ac.currentTime);m.gain.linearRampToValueAtTime(0,ac.currentTime+1.5);}catch(e){}
    setTimeout(()=>stale.forEach(n=>{try{n.stop();}catch(e){}}),1600);
  }else{relaxAudio.nodes.forEach(n=>{try{n.stop();}catch(e){}});}
  relaxAudio.nodes=[];relaxAudio.master=null;relaxAudio.playing=-1;relaxAudio.paused=false;
}

function makeNoiseBuffer(ac,type){
  if(_noiseCache[type])return _noiseCache[type];
  const len=ac.sampleRate*2;
  const buf=ac.createBuffer(1,len,ac.sampleRate);
  const d=buf.getChannelData(0);
  if(type==='brown'){
    let last=0;
    for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+0.02*w)/1.02;d[i]=last*3.5;}
  }else if(type==='pink'){
    let b0=0,b1=0,b2=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      b0=0.99765*b0+w*0.099046;b1=0.96300*b1+w*0.2965164;b2=0.57000*b2+w*1.0526913;
      d[i]=(b0+b1+b2+w*0.1848)*0.18;
    }
  }else{for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*0.5;}
  _noiseCache[type]=buf;
  return buf;
}

/* birdChirp retained for potential future use */
function birdChirp(ac,dest){
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    const f=1800+Math.random()*2400;
    o.type='sine';
    o.frequency.setValueAtTime(f,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(f*1.5,ac.currentTime+0.07);
    o.frequency.exponentialRampToValueAtTime(f*0.8,ac.currentTime+0.18);
    g.gain.setValueAtTime(0.0001,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08,ac.currentTime+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.3);
    o.onended=()=>{try{o.disconnect();}catch(e){}};
    o.connect(g);g.connect(dest);o.start();o.stop(ac.currentTime+0.32);
  }catch(e){}
}

function playRelaxSound(idx,vol){
  const ac=getAC();if(!ac)return;
  if(ac.state==='suspended')ac.resume();
  // Fade out old (overlap with fade in of new — smooth crossfade)
  if(relaxAudio.master&&relaxAudio.ctx){
    const m=relaxAudio.master;const stale=[...relaxAudio.nodes];
    try{m.gain.cancelScheduledValues(ac.currentTime);m.gain.setValueAtTime(m.gain.value,ac.currentTime);m.gain.linearRampToValueAtTime(0,ac.currentTime+1.5);}catch(e){}
    setTimeout(()=>stale.forEach(n=>{try{n.stop();}catch(e){}}),1600);
  }
  relaxAudio.timers.forEach(t=>{clearInterval(t);clearTimeout(t);});
  relaxAudio.timers=[];relaxAudio.nodes=[];relaxAudio.master=null;
  // New master with 2s fade in
  const master=ac.createGain();
  master.gain.setValueAtTime(0.0001,ac.currentTime);
  master.gain.linearRampToValueAtTime(vol,ac.currentTime+2);
  master.connect(ac.destination);
  relaxAudio.ctx=ac;relaxAudio.master=master;relaxAudio.playing=idx;relaxAudio.targetVol=vol;relaxAudio.paused=false;
  buildRelaxSound(idx,ac,master);
}

function buildRelaxSound(idx,ac,master){
  function addN(n){relaxAudio.nodes.push(n);return n;}
  function addT(t){relaxAudio.timers.push(t);return t;}

  if(idx===0){
    /* ── 528 Hz HEALING ─────────────────────────────────────────────────────
       Pure 528Hz sine + slow tremolo LFO (0.15Hz, 15% depth) + 264Hz sub
       ──────────────────────────────────────────────────────────────────── */
    // Primary 528Hz tone
    const oMain=ac.createOscillator();const gMain=ac.createGain();
    oMain.type='sine';oMain.frequency.value=528;gMain.gain.value=0.30;
    oMain.connect(gMain);gMain.connect(master);oMain.start();addN(oMain);
    // Tremolo LFO — 0.15Hz, depth 15% of gain (oscillates ±0.045 around 0.30)
    const tLfo=ac.createOscillator();const tLfoG=ac.createGain();
    tLfo.type='sine';tLfo.frequency.value=0.15;tLfoG.gain.value=0.045;
    tLfo.connect(tLfoG);tLfoG.connect(gMain.gain);tLfo.start();addN(tLfo);
    // Sub-harmonic 264Hz at 20% of main (0.30 × 0.20 = 0.06)
    const oSub=ac.createOscillator();const gSub=ac.createGain();
    oSub.type='sine';oSub.frequency.value=264;gSub.gain.value=0.06;
    oSub.connect(gSub);gSub.connect(master);oSub.start();addN(oSub);

  }else if(idx===1){
    /* ── DEEP THETA 6Hz ──────────────────────────────────────────────────────
       Binaural: 200Hz left, 206Hz right → 6Hz theta perceived beat
       Underlay: pink noise at 8% through lowpass 800Hz
       ──────────────────────────────────────────────────────────────────── */
    try{
      const oL=ac.createOscillator();const pL=ac.createStereoPanner();const gL=ac.createGain();
      oL.type='sine';oL.frequency.value=200;pL.pan.value=-1;gL.gain.value=0.26;
      oL.connect(gL);gL.connect(pL);pL.connect(master);oL.start();addN(oL);
      const oR=ac.createOscillator();const pR=ac.createStereoPanner();const gR=ac.createGain();
      oR.type='sine';oR.frequency.value=206;pR.pan.value=1;gR.gain.value=0.26;
      oR.connect(gR);gR.connect(pR);pR.connect(master);oR.start();addN(oR);
    }catch(e){
      // Fallback (no StereoPanner): single 203Hz tone
      const oF=ac.createOscillator();const gF=ac.createGain();
      oF.type='sine';oF.frequency.value=203;gF.gain.value=0.22;
      oF.connect(gF);gF.connect(master);oF.start();addN(oF);
    }
    // Pink noise underlay at 8%, lowpass 800Hz
    const ns=ac.createBufferSource();ns.buffer=makeNoiseBuffer(ac,'pink');ns.loop=true;
    const nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=800;
    const nsg=ac.createGain();nsg.gain.value=0.08;
    ns.connect(nf);nf.connect(nsg);nsg.connect(master);ns.start();addN(ns);

  }else if(idx===2){
    /* ── STUDY FOCUS 10Hz ALPHA ──────────────────────────────────────────────
       Binaural: 220Hz left, 230Hz right → 10Hz alpha wave
       Underlay: pink noise through lowpass 2000Hz at 10%
       ──────────────────────────────────────────────────────────────────── */
    try{
      const oL=ac.createOscillator();const pL=ac.createStereoPanner();const gL=ac.createGain();
      oL.type='sine';oL.frequency.value=220;pL.pan.value=-1;gL.gain.value=0.25;
      oL.connect(gL);gL.connect(pL);pL.connect(master);oL.start();addN(oL);
      const oR=ac.createOscillator();const pR=ac.createStereoPanner();const gR=ac.createGain();
      oR.type='sine';oR.frequency.value=230;pR.pan.value=1;gR.gain.value=0.25;
      oR.connect(gR);gR.connect(pR);pR.connect(master);oR.start();addN(oR);
    }catch(e){
      const oF=ac.createOscillator();const gF=ac.createGain();
      oF.type='sine';oF.frequency.value=225;gF.gain.value=0.20;
      oF.connect(gF);gF.connect(master);oF.start();addN(oF);
    }
    // Pink noise underlay at 10%, lowpass 2000Hz
    const ns=ac.createBufferSource();ns.buffer=makeNoiseBuffer(ac,'pink');ns.loop=true;
    const nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=2000;
    const nsg=ac.createGain();nsg.gain.value=0.10;
    ns.connect(nf);nf.connect(nsg);nsg.connect(master);ns.start();addN(ns);

  }else if(idx===3){
    /* ── SINGING BOWL ────────────────────────────────────────────────────────
       Inharmonic bowl spectrum: fundamental F + 2.1× + 3.3× + 4.7× partials
       Long attack (3s) + long decay (8s), loop with staggered overlap
       Random ±2 cents pitch drift per partial for organic shimmer
       ──────────────────────────────────────────────────────────────────── */
    const bowlFund=220; // fundamental Hz
    const ratios=[1,2.1,3.3,4.7];
    const vols=[0.28,0.14,0.08,0.04];
    // Convert cents offset to frequency multiplier
    function centsToMult(c){return Math.pow(2,c/1200);}

    function spawnBowl(){
      if(relaxAudio.playing!==3)return;
      const t=ac.currentTime;
      ratios.forEach((r,ri)=>{
        try{
          const drift=(Math.random()*4-2); // ±2 cents
          const freq=bowlFund*r*centsToMult(drift);
          const o=ac.createOscillator();const g=ac.createGain();
          o.type='sine';o.frequency.value=freq;
          // Attack 3s, sustain briefly, decay 8s
          g.gain.setValueAtTime(0.0001,t);
          g.gain.linearRampToValueAtTime(vols[ri],t+3.0);
          g.gain.setValueAtTime(vols[ri],t+3.5);
          g.gain.exponentialRampToValueAtTime(0.0001,t+11.5);
          o.onended=()=>{try{o.disconnect();g.disconnect();}catch(e){}};
          o.connect(g);g.connect(master);o.start(t);o.stop(t+12);
        }catch(e){}
      });
      // Next bowl spawns 9s after this one starts (overlapping decay)
      addT(setTimeout(spawnBowl,9000));
    }
    spawnBowl();

  }else if(idx===4){
    /* ── SOFT PIANO DRONE ────────────────────────────────────────────────────
       C major chord: C4(261Hz), E4(329Hz), G4(392Hz) — sine/triangle blend
       2s slow attack. Chorus: ±3 cent detuned copies at 40% volume each.
       ──────────────────────────────────────────────────────────────────── */
    const notes=[261.63,329.63,392.00];
    const noteVols=[0.20,0.16,0.14];
    function centsToMult(c){return Math.pow(2,c/1200);}

    notes.forEach((freq,ni)=>{
      const vol=noteVols[ni];
      // Primary sine + triangle blend
      [[0,'sine',1.0],[+3,'triangle',0.40],[-3,'triangle',0.40]].forEach(([cents,wtype,relVol])=>{
        try{
          const o=ac.createOscillator();const g=ac.createGain();
          o.type=wtype;o.frequency.value=freq*centsToMult(cents);
          // Slow 2s fade in
          g.gain.setValueAtTime(0.0001,ac.currentTime);
          g.gain.linearRampToValueAtTime(vol*relVol,ac.currentTime+2.0);
          o.connect(g);g.connect(master);o.start();addN(o);
        }catch(e){}
      });
    });

  }else if(idx===5){
    /* ── OM CHANT TONE ───────────────────────────────────────────────────────
       136.1Hz fundamental + 2nd harmonic (272.2Hz, 50%) + 3rd (408.3Hz, 25%)
       Formant sweep: lowpass cutoff oscillating 400-900Hz at 0.1Hz LFO
       ──────────────────────────────────────────────────────────────────── */
    // Merge all partials through a shared formant filter
    const formant=ac.createBiquadFilter();
    formant.type='lowpass';formant.frequency.value=650;formant.Q.value=1.8;
    formant.connect(master);

    // 136.1Hz fundamental (loudest)
    const o1=ac.createOscillator();const g1=ac.createGain();
    o1.type='sine';o1.frequency.value=136.1;g1.gain.value=0.28;
    o1.connect(g1);g1.connect(formant);o1.start();addN(o1);
    // 272.2Hz — 2nd harmonic at 50% of fundamental volume
    const o2=ac.createOscillator();const g2=ac.createGain();
    o2.type='sine';o2.frequency.value=272.2;g2.gain.value=0.14;
    o2.connect(g2);g2.connect(formant);o2.start();addN(o2);
    // 408.3Hz — 3rd harmonic at 25%
    const o3=ac.createOscillator();const g3=ac.createGain();
    o3.type='sine';o3.frequency.value=408.3;g3.gain.value=0.07;
    o3.connect(g3);g3.connect(formant);o3.start();addN(o3);

    // Formant sweep LFO: 0.1Hz, sweeps cutoff ±250Hz around 650Hz (range 400-900Hz)
    const fLfo=ac.createOscillator();const fLfoG=ac.createGain();
    fLfo.type='sine';fLfo.frequency.value=0.1;fLfoG.gain.value=250;
    fLfo.connect(fLfoG);fLfoG.connect(formant.frequency);fLfo.start();addN(fLfo);
  }
}
function renderRelax(){
  const p=$(`<div class="relax-page"></div>`);
  p.innerHTML=`<div class="relax-bg"></div>
    <div class="hdr"><div><div class="greet">Rest your mind</div><h1>Relax</h1></div></div>
    <div class="card">
      <div class="now-playing">
        <div class="np-disk"><div class="np-icon" id="npIcon">🎵</div></div>
        <div class="np-lbl">NOW PLAYING</div>
        <div class="np-name" id="npName">Choose a sound</div>
      </div>
      <div class="player-row">
        <button class="pl-btn" id="prevBtn">⏮</button>
        <button class="pl-play" id="playBtn">▶</button>
        <button class="pl-btn" id="nextBtn">⏭</button>
      </div>
      <div class="vol-row">
        <span style="font-size:16px;">🔈</span>
        <input type="range" min="0" max="100" value="70" id="volSlider"/>
        <span class="vol-pct" id="volPct">70%</span>
      </div>
    </div>
    <div class="sec-title"><h2>Soundscapes</h2></div>
    <div class="sound-grid" id="soundGrid"></div>
    <div class="sec-title"><h2>Breathing Guide</h2></div>
    <div class="card" style="text-align:center;padding:24px;">
      <div id="breathCircle" style="width:100px;height:100px;border-radius:50%;background:var(--grad);margin:0 auto 14px;transition:transform 4s ease,opacity 4s ease;"></div>
      <div id="breathTxt" style="font-size:15px;font-weight:600;color:var(--text2);">Box Breathing</div>
      <div style="font-size:12px;color:var(--text2);margin-top:6px;">4s in · 4s hold · 4s out · 4s hold</div>
      <button class="btn-primary" id="breathBtn" style="margin-top:16px;max-width:200px;">Start Breathing</button>
    </div>
  `;
  const sg=p.querySelector('#soundGrid');
  let vol=0.7;
  const volSlider=p.querySelector('#volSlider');
  const volPct=p.querySelector('#volPct');
  const playBtn=p.querySelector('#playBtn');
  function resumeCtx(){if(relaxAudio.ctx&&relaxAudio.ctx.state==='suspended')relaxAudio.ctx.resume();}
  function updateUI(){
    const idx=relaxAudio.playing;
    const npName=p.querySelector('#npName'),npIcon=p.querySelector('#npIcon');
    if(!npName||!npIcon)return;
    if(idx>=0){npName.textContent=SOUNDS[idx].name;npIcon.textContent=SOUNDS[idx].emoji;}
    else{npName.textContent='Choose a sound';npIcon.textContent='🎵';}
    playBtn.textContent=(idx>=0&&!relaxAudio.paused)?'⏸':'▶';
    sg.querySelectorAll('.sound-btn').forEach((b,j)=>b.classList.toggle('active',idx===j));
  }
  volSlider.oninput=()=>{
    vol=volSlider.value/100;volPct.textContent=volSlider.value+'%';
    relaxAudio.targetVol=vol;
    if(relaxAudio.master&&relaxAudio.ctx&&!relaxAudio.paused)relaxAudio.master.gain.setTargetAtTime(vol,relaxAudio.ctx.currentTime,0.02);
  };
  function startSound(i){resumeCtx();playRelaxSound(i,vol);updateUI();}
  playBtn.onclick=()=>{
    resumeCtx();
    if(relaxAudio.playing<0){startSound(0);return;}
    if(relaxAudio.paused){
      relaxAudio.paused=false;
      if(relaxAudio.master&&relaxAudio.ctx)relaxAudio.master.gain.setTargetAtTime(relaxAudio.targetVol,relaxAudio.ctx.currentTime,0.1);
    } else {
      relaxAudio.paused=true;
      if(relaxAudio.master&&relaxAudio.ctx)relaxAudio.master.gain.setTargetAtTime(0.0001,relaxAudio.ctx.currentTime,0.1);
    }
    updateUI();
  };
  p.querySelector('#prevBtn').onclick=()=>{startSound(((relaxAudio.playing<0?0:relaxAudio.playing)-1+SOUNDS.length)%SOUNDS.length);};
  p.querySelector('#nextBtn').onclick=()=>{startSound((relaxAudio.playing+1)%SOUNDS.length);};
  SOUNDS.forEach((s,i)=>{
    const btn=$(`<button class="sound-btn ${relaxAudio.playing===i?'active':''}">
      <div class="se">${s.emoji}</div>
      <div class="sn">${s.name}</div>
      <div class="sd">${s.desc}</div>
    </button>`);
    btn.onclick=()=>{
      resumeCtx();
      if(relaxAudio.playing===i)stopRelaxAudio();
      else playRelaxSound(i,vol);
      updateUI();
    };
    sg.appendChild(btn);
  });
  updateUI();
  // Breathing
  let breathRunning=false,breathPhase=0,breathTimer=null;
  const phases=['Breathe In 🫁','Hold ⏸','Breathe Out 💨','Hold ⏸'];
  p.querySelector('#breathBtn').onclick=()=>{
    breathRunning=!breathRunning;
    p.querySelector('#breathBtn').textContent=breathRunning?'Stop':'Start Breathing';
    if(breathRunning)runBreath();else{clearTimeout(breathTimer);p.querySelector('#breathCircle').style.transform='scale(1)';p.querySelector('#breathTxt').textContent='Box Breathing';}
  };
  function runBreath(){
    if(!breathRunning)return;
    const circle=p.querySelector('#breathCircle');const txt=p.querySelector('#breathTxt');
    if(!circle)return;
    txt.textContent=phases[breathPhase];
    if(breathPhase===0){circle.style.transform='scale(1.4)';circle.style.opacity='1';}
    else if(breathPhase===1){circle.style.transform='scale(1.4)';}
    else if(breathPhase===2){circle.style.transform='scale(1)';circle.style.opacity='0.7';}
    else{circle.style.transform='scale(1)';circle.style.opacity='1';}
    breathPhase=(breathPhase+1)%4;
    breathTimer=setTimeout(runBreath,4000);
  }
  return p;
}

/* ===================== PROFILE ===================== */
function renderProfile(){
  const name=S('nz_username');
  const sett=S('nz_settings');
  const lvP=xpLevel(S('nz_xp')).cur;
  const score=S('nz_brain_score');
  const tier=brainLevel(score);
  const tierEm=brainLevelEmoji(score);
  const sk=S('nz_skill_scores');
  const bestScores=S('nz_best_scores');
  const ach=S('nz_achievements')||[];
  const hist=S('nz_score_history')||[];
  const gamesPlayed=S('nz_games_played');
  const p=$(`<div></div>`);
  /* Build top 3 best-score games */
  const bestRows=Object.entries(bestScores||{})
    .map(([id,v])=>{const g=GAMES.find(x=>x.id===id);return g?{name:g.name,icon:g.icon,v:v,color:g.color}:null;})
    .filter(Boolean)
    .sort((a,b)=>b.v-a.v).slice(0,3);
  /* Last 3 unlocked achievements */
  const recentAch=ACHIEVEMENTS.filter(a=>ach.includes(a.id)).slice(-3);
  /* Last 7 Days — date-keyed history */
  const _dailyH=S('nz_daily_history')||{};
  // build array for last 7 calendar days (oldest→newest)
  const _dayLabels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const _shortLbls=['S','M','T','W','T','F','S'];
  const _7days=[];
  for(let _i=6;_i>=0;_i--){
    const _d=new Date(Date.now()-_i*86400000);
    /* Use LOCAL date — matches todayKey() fix */
    const _k=_d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
    _7days.push({key:_k,val:_dailyH[_k]||0,dow:_d.getDay(),isToday:_i===0});
  }
  const _histMax=Math.max(1,..._7days.map(d=>d.val));
  const _weekTotal=_7days.reduce((a,d)=>a+d.val,0);
  const _todayVal=_7days[_7days.length-1].val;

  p.innerHTML=`
    <div class="hdr"><div><div class="greet">Your account</div><h1>Profile</h1></div></div>

    <div class="prof-card">
      <div class="prof-top">
        <div class="prof-avatar">${name.charAt(0).toUpperCase()}</div>
        <div style="flex:1;"><div class="prof-name">${name}</div><div class="prof-email">NeuroZen Player</div></div>
        <div class="lvl-badge">Lv ${lvP.lv}<br><span style="font-size:9px;letter-spacing:.06em;">${lvP.name.toUpperCase()}</span></div>
      </div>
      <div class="prof-stats">
        <div class="prof-stat"><div class="v">${score}</div><div class="l">Brain Score</div></div>
        <div class="prof-stat"><div class="v">${S('nz_streak')}</div><div class="l">Streak</div></div>
        <div class="prof-stat"><div class="v">${gamesPlayed}</div><div class="l">Games</div></div>
      </div>
      <div class="pf-tier-chip">${tierEm} <span>${tier}</span></div>
    </div>

    <div class="sec-title"><h2>Skills Snapshot</h2><a href="#" id="pfSeeProgress">Details ›</a></div>
    <div class="card pf-skills">
      ${[['memory','Memory','#7C3AED'],['focus','Focus','#4F8EF7'],['logic','Logic','#34D399'],['speed','Speed','#F97316'],['planning','Planning','#8B5CF6'],['attention','Attention','#06B6D4']].map(([k,lbl,col])=>{
        const v=Math.min(100,sk[k]||0);
        return `<div class="pf-skill-row">
          <div class="pf-skill-lbl">${lbl}</div>
          <div class="pf-skill-bar"><div class="pf-skill-fill" style="width:${v}%;background:linear-gradient(90deg,${col},${col}cc);"></div></div>
          <div class="pf-skill-val">${v}</div>
        </div>`;
      }).join('')}
    </div>

    ${bestRows.length?`
    <div class="sec-title"><h2>Top Games</h2><a href="#" id="pfSeeGames">All ›</a></div>
    <div class="card pf-best">
      ${bestRows.map((r,i)=>`<div class="pf-best-row">
        <div class="pf-best-rank pf-rank-${i}">#${i+1}</div>
        <div class="pf-best-icon" style="background:${r.color||'var(--grad)'};">${r.icon}</div>
        <div class="pf-best-name">${r.name}</div>
        <div class="pf-best-val">${r.v}<span>best</span></div>
      </div>`).join('')}
    </div>`:''}

    <div class="sec-title"><h2>Last 7 Days</h2></div>
    <div class="card pf-week">
      <div class="pf-week-bars">
        ${_7days.map((d)=>{
          const h=Math.max(4,Math.round((d.val/_histMax)*46));
          return `<div class="pf-day"><div class="pf-day-bar ${d.isToday?'today':''}" style="height:${h}px;" title="${d.key}: ${d.val}"></div><div class="pf-day-lbl ${d.isToday?'today':''}">${_shortLbls[d.dow]}</div></div>`;
        }).join('')}
      </div>
      <div class="pf-week-foot">${_todayVal} today · ${_weekTotal} this week</div>
    </div>

    ${recentAch.length?`
    <div class="sec-title"><h2>Recent Achievements</h2><a href="#" id="pfSeeAch">View all ›</a></div>
    <div class="card pf-ach">
      ${recentAch.map(a=>`<div class="pf-ach-item"><div class="pf-ach-em">${a.emoji}</div><div class="pf-ach-name">${a.title}</div></div>`).join('')}
      ${recentAch.length<3?Array(3-recentAch.length).fill('<div class="pf-ach-item locked"><div class="pf-ach-em">\u{1F512}</div><div class="pf-ach-name">Locked</div></div>').join(''):''}
    </div>`:''}

    <div class="sec-title"><h2>Settings</h2></div>
    <div class="pf-settings-group"><div class="pf-group-lbl">Appearance</div><div id="settAppear"></div></div>
    <div class="pf-settings-group"><div class="pf-group-lbl">Audio & Feedback</div><div id="settAudio"></div></div>
    <div class="pf-settings-group"><div class="pf-group-lbl">Notifications</div><div id="settNotif"></div></div>
    <div class="pf-settings-group"><div class="pf-group-lbl">Data & Privacy</div><div id="settData"></div></div>
    <div class="pf-settings-group"><div class="pf-group-lbl pf-group-danger">Danger Zone</div><div id="settDanger"></div></div>

    <div class="sec-title"><h2>App Info</h2></div>
    <div class="card pf-app-info">
      <div class="pf-app-row"><span class="pf-app-k">Version</span><span class="pf-app-v">v3.0</span></div>
      <div class="pf-app-row"><span class="pf-app-k">Games</span><span class="pf-app-v">10 brain-training</span></div>
      <div class="pf-app-row"><span class="pf-app-k">Storage</span><span class="pf-app-v">Local-only</span></div>
      <div class="pf-app-row"><span class="pf-app-k">Account</span><span class="pf-app-v">Not required</span></div>
    </div>
  `;

  /* settings helpers (same behaviour as before, just routed into groups) */
  function attachToggle(host,key,ico,title,sub){
    const tgl=$(`<div class="tgl ${sett[key]?'on':''}"></div>`);
    const el=$(`<div class="setting"><div class="sic">${ico}</div><div style="flex:1;"><div class="sttl">${title}</div>${sub?`<div class="ssub">${sub}</div>`:''}</div></div>`);
    el.appendChild(tgl);host.appendChild(el);
    el.onclick=()=>{const s=S('nz_settings');s[key]=!s[key];setS('nz_settings',s);tgl.classList.toggle('on',!!s[key]);toast(s[key]?`${title} enabled`:`${title} disabled`);};
  }
  function attachAction(host,ico,title,sub,right,onClick,danger){
    const el=$(`<div class="setting${danger?' danger':''}"><div class="sic">${ico}</div><div style="flex:1;"><div class="sttl">${title}</div>${sub?`<div class="ssub">${sub}</div>`:''}</div><div class="sright">${right}</div></div>`);
    el.onclick=onClick;host.appendChild(el);
  }
  /* Appearance */
  const appearHost=p.querySelector('#settAppear');
  const dmEl=$(`<div class="setting"><div class="sic">\u{1F319}</div><div style="flex:1;"><div class="sttl">Dark Mode</div><div class="ssub">${S('nz_dark_mode')?'On':'Off'} \u00b7 follows system at first launch</div></div><div class="tgl ${S('nz_dark_mode')?'on':''}" id="dmTgl"></div></div>`);
  dmEl.onclick=()=>{const v=!S('nz_dark_mode');setS('nz_dark_mode',v);applyDark();dmEl.querySelector('#dmTgl').classList.toggle('on',v);dmEl.querySelector('.ssub').textContent=(v?'On':'Off')+' \u00b7 follows system at first launch';};
  appearHost.appendChild(dmEl);
  /* Audio */
  attachToggle(p.querySelector('#settAudio'),'sfx','\u{1F50A}','Sound Effects','In-game audio feedback');
  /* Notifications */
  attachToggle(p.querySelector('#settNotif'),'reminders','\u23F0','Daily Reminders','Practice at your peak time');
  attachAction(p.querySelector('#settNotif'),'\u{1F514}','Notifications','App alerts','\u203a',()=>{const s=S('nz_settings');s.notifications=!s.notifications;setS('nz_settings',s);toast(s.notifications?'\u{1F514} Notifications enabled':'\u{1F515} Notifications disabled');});
  /* Data & Privacy */
  attachAction(p.querySelector('#settData'),'\u{1F512}','Privacy','Your data, your device','\u203a',()=>showModal('privacy'));
  attachAction(p.querySelector('#settData'),'\u2753','Help & FAQ','Common questions','\u203a',()=>showModal('help'));
  /* Danger */
  attachAction(p.querySelector('#settDanger'),'\u{1F6AA}','Log Out','Reset all progress','',()=>showModal('logout'),true);

  /* link nav clicks */
  const goProgress=p.querySelector('#pfSeeProgress'); if(goProgress)goProgress.onclick=(e)=>{e.preventDefault();render('progress');};
  const goGames   =p.querySelector('#pfSeeGames');    if(goGames)   goGames.onclick   =(e)=>{e.preventDefault();render('games');};
  const goAch     =p.querySelector('#pfSeeAch');      if(goAch)     goAch.onclick     =(e)=>{e.preventDefault();render('progress');};
  return p;
}

/* ===================== MODALS ===================== */
function showModal(type){
  const bg=$(`<div class="modal-bg"></div>`);
  let content='';
  if(type==='privacy'){
    content=`<h3>🔒 Privacy</h3>
      <p>Your data is stored <strong>locally on this device only</strong>. NeuroZen never sends your data to any server. No account required. All progress, scores, and achievements live in your browser's localStorage.</p>
      <button class="modal-btn primary">Got it</button>`;
  } else if(type==='help'){
    content=`<h3>❓ Help & FAQ</h3>
      <div class="faq-item"><div class="fq">How is Brain Score calculated?</div><div class="fa">Each game awards 5–50 points based on your performance. Higher skill levels get slightly fewer points to keep things fair.</div></div>
      <div class="faq-item"><div class="fq">How do streaks work?</div><div class="fa">Complete at least 1 game per day to maintain your streak. A new day starts at midnight.</div></div>
      <div class="faq-item"><div class="fq">How to reset progress?</div><div class="fa">Go to Profile → Log Out, then confirm. This clears all data including your brain score and achievements.</div></div>
      <button class="modal-btn primary">Got it</button>`;
  } else if(type==='logout'){
    content=`<h3>🚪 Reset All Progress?</h3>
      <p>This will permanently delete your brain score, streak, all achievements, and game history. <strong>This cannot be undone.</strong></p>
      <button class="modal-btn danger" id="confirmLogout">Yes, Reset Everything</button>
      <button class="modal-btn ghost" id="cancelLogout">Cancel</button>`;
  }
  const box=$(`<div class="modal-box">${content}</div>`);
  bg.appendChild(box);
  document.body.appendChild(bg);
  bg.onclick=e=>{if(e.target===bg)bg.remove();};
  box.querySelector('.modal-btn.primary,#cancelLogout')?.addEventListener('click',()=>bg.remove());
  box.querySelector('#confirmLogout')?.addEventListener('click',()=>{
    LS.clear('nz_');
    bg.remove();
    toast('Progress reset. Starting fresh!');
    setTimeout(()=>init(),300);
  });
}

/* ===================== ONBOARDING (premium 7-screen + calibration) ===================== */
function showOnboarding(){
  const onb=$(`<div class="onb" id="onbScreen"></div>`);
  document.body.appendChild(onb);

  let userName='',brainGoal='focus',dailyGoalType='balanced',dailyGoalGames=3;
  let reactionTimes=[],memoryScore=0,focusTimeSec=0;
  let calibResults={speed:50,memory:50,focus:50};

  const QUOTES=[
    'Your brain becomes stronger every session.',
    'Small improvements create extraordinary minds.',
    'Focus is a superpower.',
    'Every rep makes your mind sharper.',
    'Consistency beats intensity. Train daily.',
  ];
  const quote=QUOTES[Math.floor(Math.random()*QUOTES.length)];

  function makeParticles(n){
    n=n||15;
    let h='<div class="onb-particles">';
    for(let i=0;i<n;i++){
      const sz=4+Math.random()*8,lf=Math.random()*100,dl=Math.random()*5,dr=4+Math.random()*6;
      h+='<div class="onb-particle" style="width:'+sz+'px;height:'+sz+'px;left:'+lf+'%;animation-delay:'+dl+'s;animation-duration:'+dr+'s"></div>';
    }
    return h+'</div>';
  }

  function dots(cur,total){
    let h='<div class="onb-dots">';
    for(let i=0;i<total;i++)h+='<div class="onb-dot'+(i===cur?' active':'')+'"></div>';
    return h+'</div>';
  }

  function go(fn){
    onb.style.cssText='opacity:0;transform:translateY(12px);transition:none';
    _st(()=>{fn();onb.style.cssText='opacity:1;transform:translateY(0);transition:opacity .25s,transform .25s';},220);
  }

  /* ── SCREEN 1: Welcome ── */
  function s0(){
    onb.innerHTML=
      makeParticles(18)+
      '<div class="onb-mascot pulse">🧠</div>'+
      '<h1 class="onb-title">Unlock Your Brain\'s<br>True Potential</h1>'+
      '<p class="onb-sub">Improve Focus • Memory • Logic • Speed<br>through science-inspired training.</p>'+
      '<div class="onb-feats">'+
        '<div class="onb-feat"><span>⭐</span><span>10 Brain Games</span></div>'+
        '<div class="onb-feat"><span>🧠</span><span>Adaptive Training</span></div>'+
        '<div class="onb-feat"><span>📊</span><span>Personal Brain Analytics</span></div>'+
        '<div class="onb-feat"><span>⏱</span><span>Only 5 minutes/day</span></div>'+
      '</div>'+
      '<p class="onb-quote">"'+quote+'"</p>'+
      dots(0,7)+
      '<button class="btn-primary onb-btn">Start Your Journey →</button>';
    onb.querySelector('.onb-btn').onclick=()=>go(s1);
  }

  /* ── SCREEN 2: Name ── */
  function s1(){
    onb.innerHTML=
      '<div class="onb-mascot">😊</div>'+
      '<h1 class="onb-title">What should we<br>call you?</h1>'+
      '<p class="onb-sub">We\'ll personalize your training experience.</p>'+
      '<input type="text" id="nameIn" class="onb-input" placeholder="Enter your first name" maxlength="20" value="'+userName+'" autocomplete="off"/>'+
      '<p class="onb-hint">🔒 Your progress is saved locally on your device.</p>'+
      dots(1,7)+
      '<button class="btn-primary onb-btn" style="margin-top:16px;">Continue →</button>';
    const inp=onb.querySelector('#nameIn');
    _st(()=>inp.focus(),150);
    function tryNext(){
      const v=inp.value.trim();
      if(!v){inp.style.borderColor='#EF4444';inp.classList.add('onb-shake');_st(()=>{inp.classList.remove('onb-shake');inp.style.borderColor='';},400);return;}
      userName=v.charAt(0).toUpperCase()+v.slice(1);
      go(s2);
    }
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')tryNext();});
    onb.querySelector('.onb-btn').onclick=tryNext;
  }

  /* ── SCREEN 3: Brain Goal ── */
  function s2(){
    const G=[
      {id:'focus', icon:'🎯',label:'Improve Focus',   sub:'Sharpen attention & concentration'},
      {id:'memory',icon:'🧠',label:'Boost Memory',    sub:'Enhance recall & retention'},
      {id:'speed', icon:'⚡',label:'Think Faster',    sub:'Increase mental processing speed'},
      {id:'logic', icon:'💡',label:'Sharpen Logic',   sub:'Strengthen reasoning & IQ'},
      {id:'relax', icon:'😌',label:'Relax Mind',      sub:'Reduce stress, improve clarity'},
    ];
    onb.innerHTML=
      '<div class="onb-mascot">🎯</div>'+
      '<h1 class="onb-title">What\'s your<br>primary goal?</h1>'+
      '<p class="onb-sub">We\'ll personalize your training plan.</p>'+
      '<div class="onb-list">'+
      G.map(g=>'<button class="onb-row'+(brainGoal===g.id?' sel':'')+'" data-g="'+g.id+'">'+
        '<span class="onb-row-icon">'+g.icon+'</span>'+
        '<div><div class="onb-row-label">'+g.label+'</div><div class="onb-row-sub">'+g.sub+'</div></div>'+
      '</button>').join('')+
      '</div>'+
      dots(2,7)+
      '<button class="btn-primary onb-btn" style="margin-top:16px;">Continue →</button>';
    onb.querySelectorAll('.onb-row').forEach(b=>{
      b.onclick=()=>{brainGoal=b.dataset.g;onb.querySelectorAll('.onb-row').forEach(x=>x.classList.toggle('sel',x.dataset.g===brainGoal));};
    });
    onb.querySelector('.onb-btn').onclick=()=>go(s3);
  }

  /* ── SCREEN 4: Daily Goal ── */
  function s3(){
    const D=[
      {id:'light',    icon:'🌱',label:'Light',    sub:'5 min · 1–2 games/day',  g:1},
      {id:'balanced', icon:'⚖️',label:'Balanced', sub:'10 min · 3 games/day',   g:3},
      {id:'intensive',icon:'🔥',label:'Intensive',sub:'15 min · 5 games/day',   g:5},
    ];
    onb.innerHTML=
      '<div class="onb-mascot">⏱️</div>'+
      '<h1 class="onb-title">Choose your<br>daily training</h1>'+
      '<p class="onb-sub">How much time can you commit each day?</p>'+
      '<div class="onb-list">'+
      D.map(d=>'<button class="onb-row'+(dailyGoalType===d.id?' sel':'')+'" data-t="'+d.id+'" data-g="'+d.g+'">'+
        '<span class="onb-row-icon">'+d.icon+'</span>'+
        '<div><div class="onb-row-label">'+d.label+'</div><div class="onb-row-sub">'+d.sub+'</div></div>'+
      '</button>').join('')+
      '</div>'+
      dots(3,7)+
      '<button class="btn-primary onb-btn" style="margin-top:16px;">Continue →</button>';
    onb.querySelectorAll('.onb-row').forEach(b=>{
      b.onclick=()=>{
        dailyGoalType=b.dataset.t;dailyGoalGames=+b.dataset.g;
        onb.querySelectorAll('.onb-row').forEach(x=>x.classList.toggle('sel',x.dataset.t===dailyGoalType));
      };
    });
    onb.querySelector('.onb-btn').onclick=()=>go(s4);
  }

  /* ── SCREEN 5: Calibration Intro ── */
  function s4(){
    onb.innerHTML=
      makeParticles(10)+
      '<div class="onb-mascot">⚡</div>'+
      '<h1 class="onb-title">Let\'s calibrate<br>your brain.</h1>'+
      '<p class="onb-sub">3 quick challenges. Takes only <strong>30 seconds</strong>.</p>'+
      '<div class="onb-calib-steps">'+
        '<div class="onb-calib-step"><span>⚡</span><span>Reaction Speed</span><span class="onb-cs-time">~10s</span></div>'+
        '<div class="onb-calib-step"><span>🧠</span><span>Memory Check</span><span class="onb-cs-time">~10s</span></div>'+
        '<div class="onb-calib-step"><span>👁️</span><span>Focus Test</span><span class="onb-cs-time">~10s</span></div>'+
      '</div>'+
      '<p class="onb-hint">Results build your personal Brain Profile.</p>'+
      dots(4,7)+
      '<button class="btn-primary onb-btn">Start Calibration ⚡</button>';
    onb.querySelector('.onb-btn').onclick=()=>go(()=>calib_reaction());
  }

  /* ── CALIBRATION A: Reaction ── */
  function calib_reaction(round,times){
    round=round||0;times=times||[];
    if(round===5){reactionTimes=times;go(()=>calib_memory());return;}
    const delay=900+Math.random()*1100;
    onb.innerHTML=
      '<div class="onb-calib-hdr"><span>⚡ Reaction Speed</span><span class="onb-calib-prog">'+(round+1)+' / 5</span></div>'+
      '<p class="onb-sub" style="margin-bottom:24px;">Tap the circle the instant it turns green</p>'+
      '<div class="onb-react-wrap" id="rWrap">'+
        '<div class="onb-react-circle wait" id="rCircle"></div>'+
        '<p id="rTxt" style="margin-top:20px;font-size:14px;color:var(--text2);">Wait for green...</p>'+
      '</div>'+
      dots(4,7);
    const circle=onb.querySelector('#rCircle');
    const txt=onb.querySelector('#rTxt');
    const wrap=onb.querySelector('#rWrap');
    let ready=false,t0=0;
    const timer=_st(()=>{ready=true;t0=Date.now();circle.className='onb-react-circle go';txt.textContent='TAP NOW! 👆';},delay);
    wrap.onclick=()=>{
      if(!ready){clearTimeout(timer);circle.className='onb-react-circle wrong';txt.textContent='Too early! Wait for green ⚠️';_st(()=>calib_reaction(round,times),1000);return;}
      const rt=Date.now()-t0;times.push(rt);
      circle.className='onb-react-circle done';txt.textContent=rt+'ms ✓';
      _st(()=>calib_reaction(round+1,times),700);
    };
  }

  /* ── CALIBRATION B: Memory ── */
  function calib_memory(round,correct){
    round=round||0;correct=correct||0;
    if(round===2){memoryScore=correct;go(()=>calib_focus());return;}
    const targets=[];while(targets.length<3){const n=Math.floor(Math.random()*9);if(targets.indexOf(n)<0)targets.push(n);}
    onb.innerHTML=
      '<div class="onb-calib-hdr"><span>🧠 Memory Check</span><span class="onb-calib-prog">'+(round+1)+' / 2</span></div>'+
      '<p class="onb-sub" style="margin-bottom:16px;">Memorize the highlighted cells</p>'+
      '<div class="onb-mem-grid" id="mGrid">'+
      Array.from({length:9},(_,i)=>'<div class="onb-mem-cell'+(targets.indexOf(i)>=0?' lit':'')+'" data-i="'+i+'"></div>').join('')+
      '</div>'+
      '<p id="mTxt" style="margin-top:16px;font-size:14px;color:var(--text2);">Memorizing...</p>'+
      dots(4,7);
    _st(()=>{
      onb.querySelectorAll('.onb-mem-cell').forEach(c=>c.classList.remove('lit'));
      const txt=onb.querySelector('#mTxt');
      if(txt)txt.textContent='Now tap the 3 cells you saw!';
      const sel=[];
      onb.querySelectorAll('.onb-mem-cell').forEach((c,i)=>{
        c.onclick=()=>{
          if(sel.indexOf(i)>=0)return;
          sel.push(i);c.classList.add('sel');
          if(sel.length===3){
            const hit=targets.filter(t=>sel.indexOf(t)>=0).length;
            if(hit===3)correct++;
            if(txt)txt.textContent=hit===3?'✓ Perfect! All correct!':'Done!';
            _st(()=>calib_memory(round+1,correct),800);
          }
        };
      });
    },1800);
  }

  /* ── CALIBRATION C: Focus (Schulte 3×3) ── */
  function calib_focus(){
    const nums=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-.5);
    let next=1;
    const t0=Date.now();
    onb.innerHTML=
      '<div class="onb-calib-hdr"><span>👁️ Focus Test</span><span class="onb-calib-prog">Find 1 → 9</span></div>'+
      '<p class="onb-sub" style="margin-bottom:16px;">Tap numbers 1 to 9 in order, as fast as you can</p>'+
      '<div class="onb-schulte" id="sGrid">'+
      nums.map(n=>'<button class="onb-sch-cell" data-n="'+n+'">'+n+'</button>').join('')+
      '</div>'+
      '<p id="sFb" style="margin-top:14px;font-size:13px;color:var(--text2);">Find: <strong id="sNext">1</strong></p>'+
      dots(4,7);
    onb.querySelectorAll('.onb-sch-cell').forEach(b=>{
      b.onclick=()=>{
        if(+b.dataset.n===next){
          b.classList.add('done');b.disabled=true;next++;
          const nEl=onb.querySelector('#sNext');
          if(next<=9&&nEl)nEl.textContent=next;
          else if(next>9){focusTimeSec=(Date.now()-t0)/1000;go(()=>doAnalyzing());}
        }else{b.classList.add('wrong');_st(()=>b.classList.remove('wrong'),250);}
      };
    });
  }

  /* ── SCREEN 6: Analyzing ── */
  function doAnalyzing(){
    onb.innerHTML=
      '<div class="onb-mascot">🤔</div>'+
      '<h1 class="onb-title">Analyzing your<br>brain data...</h1>'+
      '<div class="onb-analyze">'+
        '<div class="onb-arow"><span>⚡ Processing Speed</span><div class="onb-abar"><div class="onb-afill" style="animation-delay:.1s"></div></div></div>'+
        '<div class="onb-arow"><span>🧠 Memory Patterns</span><div class="onb-abar"><div class="onb-afill" style="animation-delay:.6s"></div></div></div>'+
        '<div class="onb-arow"><span>👁️ Attention Span</span><div class="onb-abar"><div class="onb-afill" style="animation-delay:1.1s"></div></div></div>'+
        '<div class="onb-arow"><span>💡 Logic Baseline</span><div class="onb-abar"><div class="onb-afill" style="animation-delay:1.6s"></div></div></div>'+
      '</div>'+
      '<p id="aTxt" class="onb-hint">Processing reaction data...</p>'+
      dots(5,7);
    const msgs=['Processing reaction data...','Evaluating memory patterns...','Measuring attention span...','Building your brain profile...'];
    let mi=0;
    const iv=_si(()=>{mi++;const el=onb.querySelector('#aTxt');if(el&&msgs[mi])el.textContent=msgs[mi];},750);
    _st(()=>{_cti(iv);go(()=>doProfile());},3400);
  }

  /* ── SCREEN 7: Brain Profile Reveal ── */
  function doProfile(){
    const avgRT=reactionTimes.length?reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length:500;
    const spd=avgRT<250?92:avgRT<350?78:avgRT<500?62:avgRT<700?46:30;
    const mem=memoryScore===2?80:memoryScore===1?55:35;
    const foc=focusTimeSec>0?(focusTimeSec<8?88:focusTimeSec<12?72:focusTimeSec<18?56:38):50;
    calibResults={speed:spd,memory:mem,focus:foc};

    const lbl=(v,hi,mid,lo)=>v>=hi?'Excellent':v>=mid?'Good':v>=lo?'Average':'Developing';
    const rows=[
      {icon:'⚡',label:'Speed',  val:spd, lbl:lbl(spd,80,65,50)},
      {icon:'🧠',label:'Memory', val:mem, lbl:lbl(mem,75,55,40)},
      {icon:'👁️',label:'Focus',  val:foc, lbl:lbl(foc,80,62,48)},
      {icon:'💡',label:'Logic',  val:0,   lbl:'Not Tested'},
    ];
    onb.innerHTML=
      makeParticles(12)+
      '<div class="onb-mascot celebrate">🎉</div>'+
      '<h1 class="onb-title">Welcome, '+userName+'! 👋</h1>'+
      '<p class="onb-sub">Here\'s your initial Brain Profile</p>'+
      '<div class="onb-profile">'+
        '<div class="onb-profile-title">🧬 Initial Brain Profile</div>'+
        rows.map(r=>'<div class="onb-prow">'+
          '<span class="onb-plabel">'+r.icon+' '+r.label+'</span>'+
          '<div class="onb-pbar"><div class="onb-pbar-fill" style="width:'+r.val+'%"></div></div>'+
          '<span class="onb-pval">'+(r.val||'—')+' <small>'+r.lbl+'</small></span>'+
        '</div>').join('')+
        '<p class="onb-profile-note">We\'ll update these scores as you continue training.</p>'+
      '</div>'+
      '<div class="onb-level-badge">🏅 Starting Rank: <strong>Level 1 · Brain Explorer</strong></div>'+
      dots(6,7)+
      '<button class="btn-primary onb-btn" style="margin-top:20px;">Start Training 🚀</button>';
    onb.querySelector('.onb-btn').onclick=()=>{
      setS('nz_username',userName);
      setS('nz_brain_goal',brainGoal);
      setS('nz_daily_goal_type',dailyGoalType);
      setS('nz_today_goal',dailyGoalGames);
      setS('nz_brain_score',0);setS('nz_xp',0);setS('nz_streak',0);
      setS('nz_games_played',0);setS('nz_today_games',0);
      setS('nz_achievements',[]);
      setS('nz_skill_scores',{memory:calibResults.memory,focus:calibResults.focus,speed:calibResults.speed,logic:0,planning:0,attention:0});
      setS('nz_skill_scores_prev',{memory:0,focus:0,speed:0,logic:0,planning:0,attention:0});
      setS('nz_best_scores',{});setS('nz_last_played',null);
      setS('nz_settings',{reminders:true,sfx:true,notifications:true});
      setS('nz_onboarded',true);setS('nz_schulte_level',0);setS('nz_daily_history',{});
      setS('nz_calib_done',true);
      onb.style.cssText='opacity:0;transform:translateY(10px);transition:opacity .3s,transform .3s';
      _st(()=>{onb.remove();render('home');confetti(80);toast('Welcome, '+userName+'! Your brain training begins now. 🧠');},300);
    };
  }

  s0();
}


/* ===================== WORKOUT ===================== */
function getWorkoutGames(){
  const sk=S('nz_skill_scores');
  const sorted=[...GAMES].sort((a,b)=>(sk[a.skill]||0)-(sk[b.skill]||0));
  const seen=new Set();const picks=[];
  for(const g of sorted){if(picks.length>=3)break;if(!seen.has(g.skill)){seen.add(g.skill);picks.push(g);}}
  for(const g of sorted){if(picks.length>=3)break;if(!picks.includes(g))picks.push(g);}
  return picks.slice(0,3);
}
function showWorkoutTransition(wkCtx){
  const {games,idx}=wkCtx;
  const g=games[idx];
  const ov=$(`<div class="wo-transition">
    <div style="font-size:52px;margin-bottom:10px;">${g.icon}</div>
    <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--primary);margin-bottom:10px;">GAME ${idx+1} OF ${games.length}</div>
    <h2 style="margin:0 0 8px;font-size:22px;">${g.name}</h2>
    <p style="color:var(--text2);font-size:13px;margin:0 0 28px;line-height:1.6;">${g.desc}</p>
    <button class="btn-primary" style="max-width:240px;" id="woReady">I'm Ready ▶</button>
    <button style="margin-top:12px;font-size:13px;color:var(--text2);background:none;border:none;cursor:pointer;font-family:inherit;" id="woSkip">Skip this game</button>
    <button style="margin-top:8px;font-size:12px;color:var(--text2);background:none;border:none;cursor:pointer;font-family:inherit;" id="woQuit">✕ Exit workout</button>
  </div>`);
  document.body.appendChild(ov);
  ov.querySelector('#woReady').onclick=()=>{playSound('tap');ov.remove();openGame(g.id,wkCtx);};
  ov.querySelector('#woSkip').onclick=()=>{
    ov.remove();
    if(idx+1<games.length)showWorkoutTransition({...wkCtx,idx:idx+1});
    else{toast('🏋️ Workout complete! Great job!');render('home');}
  };
  ov.querySelector('#woQuit').onclick=()=>{ov.remove();render('home');};
}

/* ===================== LEGACY KEY MIGRATION ===================== */
/* One-time migration: rename internal id 'dualnback' -> 'wordchain' so the
   data layer matches the actual game name. Runs once per device. */
function _migrateLegacyKeys(){
  if(S('nz_migrated_wordchain'))return;
  try{
    // Migrate per-game best score
    const bs=S('nz_best_scores')||{};
    if(bs.dualnback!=null&&bs.wordchain==null){bs.wordchain=bs.dualnback;}
    if('dualnback' in bs){delete bs.dualnback;}
    setS('nz_best_scores',bs);
    // Migrate per-game play counts
    const gp=S('nz_game_plays')||{};
    if(gp.dualnback!=null&&gp.wordchain==null){gp.wordchain=gp.dualnback;}
    if('dualnback' in gp){delete gp.dualnback;}
    setS('nz_game_plays',gp);
    // Migrate the renamed achievement id (nback_pro -> wordchain_pro)
    const ach=S('nz_achievements')||[];
    if(ach.includes('nback_pro')&&!ach.includes('wordchain_pro')){
      ach.push('wordchain_pro');
    }
    const cleaned=ach.filter(id=>id!=='nback_pro');
    setS('nz_achievements',cleaned);
  }catch(e){/* never block boot on migration */}
  setS('nz_migrated_wordchain',true);
}

/* ===================== INIT ===================== */
function init(){
  _migrateLegacyKeys();
  if(!S('nz_onboarded')){showOnboarding();}
  else{render('home');}
}
init();
