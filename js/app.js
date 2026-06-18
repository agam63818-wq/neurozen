window._allTimers=[];
function _untrack(id){const a=window._allTimers;for(let i=a.length-1;i>=0;i--){if(a[i].id===id){a.splice(i,1);break;}}}
const _st=(fn,ms)=>{const id=setTimeout(()=>{_untrack(id);try{fn();}catch(e){}},ms);window._allTimers.push({type:'to',id});return id;};
const _si=(fn,ms)=>{const id=setInterval(fn,ms);window._allTimers.push({type:'iv',id});return id;};
function _ct(id){clearTimeout(id);_untrack(id);}
function _cti(id){clearInterval(id);_untrack(id);}
function _clearAllTimers(){window._allTimers.forEach(t=>t.type==='iv'?clearInterval(t.id):clearTimeout(t.id));window._allTimers=[];}
const _noiseCache={};
/* ===================== STATE ===================== */
const LS={
  get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))},
  clear(prefix){Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k))}
};
const FRESH={
  nz_brain_score:0,nz_streak:0,nz_games_played:0,nz_today_goal:3,
  nz_dark_mode:false,nz_score_history:[0,0,0,0,0,0,0],
  nz_achievements:[],nz_skill_scores:{memory:0,focus:0,logic:0,speed:0},
  nz_skill_scores_prev:{memory:0,focus:0,logic:0,speed:0},
  nz_best_scores:{},nz_last_played:null,
  nz_settings:{reminders:true,sfx:true,notifications:true},
  nz_onboarded:false,nz_username:'Player',
  nz_schulte_level:0,nz_today_games:0,
  nz_xp:0,nz_daily_challenge_date:null,nz_daily_challenge_done:false,nz_daily_challenge_xp:0,
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
function todayKey(){return new Date().toISOString().slice(0,10);}
function isPlayedToday(){return S('nz_last_played')===todayKey();}
function brainLevel(s){if(s<=100)return'BEGINNER';if(s<=300)return'DEVELOPING';if(s<=500)return'SHARP';if(s<=750)return'EXPERT';return'MASTER';}
function greet(){
  const h=new Date().getHours();
  if(h>=6&&h<12)return'Good morning 👋';
  if(h>=12&&h<17)return'Good afternoon ☀️';
  if(h>=17&&h<21)return'Good evening 🌆';
  return'Hey, night owl 🦉';
}
function confetti(count=60){
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
  {lv:1,name:'Novice',xp:0},{lv:2,name:'Apprentice',xp:1500},{lv:3,name:'Thinker',xp:3600},
  {lv:4,name:'Scholar',xp:7500},{lv:5,name:'Expert',xp:13500},{lv:6,name:'Genius',xp:21000},
  {lv:7,name:'Prodigy',xp:30000},{lv:8,name:'Mastermind',xp:42000},{lv:9,name:'Sage',xp:57000},
  {lv:10,name:'Legend',xp:75000},
];
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
  {game:'dualnback',label:'Score 20+ in Word Chain',check:v=>v>=20},
  {game:'memory',label:'Score 25+ in Memory Matrix',check:v=>v>=25},
  {game:'pattern',label:'Score 8+ in Pattern IQ',check:v=>v>=8},
  {game:'stroopx',label:'Score 30+ in Color Stroop',check:v=>v>=30},
  {game:'schulte',label:'Score 40+ in Schulte Table',check:v=>v>=40},
  {game:'reactionlab',label:'Score 25+ in Reaction Lab',check:v=>v>=25},
  {game:'spatialspin',label:'Score 8+ in Spatial Spin',check:v=>v>=8},
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
  {id:'score_1000',emoji:'👑',title:'Master Mind',check:()=>S('nz_brain_score')>=10000},
  {id:'games_10',emoji:'🏃',title:'Regular',check:()=>S('nz_games_played')>=10},
  {id:'games_25',emoji:'🏅',title:'Veteran',check:()=>S('nz_games_played')>=25},
  {id:'speed_king',emoji:'⚡',title:'Speed King',check:(gId,sc)=>gId==='math'&&sc>=15},
  {id:'memory_pro',emoji:'💡',title:'Memory Pro',check:(gId,sc)=>gId==='memory'&&sc>=12},
  {id:'wordsmith',emoji:'📝',title:'Wordsmith',check:(gId,sc)=>gId==='wordflash'&&sc>=12},
  {id:'nback_pro',emoji:'🔵',title:'N-Back Pro',check:(gId,sc)=>gId==='dualnback'&&sc>=14},
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
function awardScore(rawPts,skillKey,gameId,gameScore){
  const skillLvl=(S('nz_skill_scores')[skillKey]||0);
  const mult=skillLvl<30?1.0:skillLvl<60?0.8:0.6;
  const pts=Math.round(rawPts*mult);
  const cur=S('nz_brain_score');
  const next=Math.max(0,Math.min(10000,cur+pts));
  setS('nz_brain_score',next);
  setS('nz_games_played',S('nz_games_played')+1);
  const gPlays=S('nz_game_plays');gPlays[gameId]=(gPlays[gameId]||0)+1;setS('nz_game_plays',gPlays);
  // streak
  const prevLast=S('nz_last_played');
  const today=todayKey();
  if(prevLast!==today){
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const newStreak=prevLast===yesterday?S('nz_streak')+1:1;
    setS('nz_streak',newStreak);
    setS('nz_last_played',today);
    setS('nz_today_games',1);
  } else {
    toast('🔥 Streak saved! Come back tomorrow!');
    setS('nz_today_games',S('nz_today_games')+1);
  }
  // score history
  const h=S('nz_score_history');
  h.push(next);if(h.length>7)h.shift();
  setS('nz_score_history',h);
  // skill
  if(skillKey){
    const prev=S('nz_skill_scores');
    const prevPrev=S('nz_skill_scores_prev');
    prevPrev[skillKey]=prev[skillKey]||0;
    prev[skillKey]=Math.min(100,Math.max(0,(prev[skillKey]||0)+Math.round(pts*0.12)));
    setS('nz_skill_scores',prev);setS('nz_skill_scores_prev',prevPrev);
  }
  checkAchievements(gameId,gameScore);
  // XP + level system
  let xpGain=Math.max(0,Math.round((gameScore||0)*10));
  const dch=todayChallenge();
  if(dch&&gameId===dch.game&&!dailyDoneToday()&&dch.check(gameScore)){
    xpGain*=2;
    setS('nz_daily_challenge_date',todayKey());
    setS('nz_daily_challenge_done',true);
    setS('nz_daily_challenge_xp',xpGain);
    setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP earned!'),600);
  }
  const oldXp=S('nz_xp');
  const newXp=oldXp+xpGain;
  setS('nz_xp',newXp);
  const prevLv=xpLevel(oldXp).cur.lv;
  const newLv=xpLevel(newXp).cur;
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
    const c=$(`<div class="qp-card" style="background:${g.bg}">
      <div class="qico" style="background:${g.iconBg}">${g.icon}</div>
      <div><div class="qn">${g.name}</div><div class="qlv">${best?'Best: '+best:'New!'}</div></div>
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
  Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed'}).forEach(([label,key])=>{
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
  {id:'dualnback',name:'Word Chain',cat:'Memory',skill:'memory',bg:'#EFF6FF',iconBg:'linear-gradient(135deg,#3B82F6,#1D4ED8)',icon:'🔗',desc:'Remember the chain of words — test your verbal memory'},
  {id:'math',name:'Quick Math',cat:'Speed',skill:'speed',bg:'#FFFBEB',iconBg:'linear-gradient(135deg,#FBBF24,#F59E0B)',icon:'🔢',desc:'Solve math problems at speed'},
  {id:'stroopx',name:'Color Stroop Xtreme',cat:'Focus',skill:'focus',bg:'#FFF0F3',iconBg:'linear-gradient(135deg,#F472B6,#EC4899)',icon:'🎨',desc:'Name the ink color, not the word — as fast as you can'},
  {id:'iqtest',name:'IQ Test',cat:'Reasoning',skill:'logic',bg:'#F0FDF4',iconBg:'linear-gradient(135deg,#34D399,#059669)',icon:'🧩',desc:'25 Hinglish reasoning questions — find your IQ score'},
  {id:'reactionlab',name:'Reaction Lab',cat:'Speed',skill:'speed',bg:'#FFFBEB',iconBg:'linear-gradient(135deg,#F59E0B,#EF4444)',icon:'⚡',desc:'Tap the circle the instant it appears — test your raw reaction speed'},
  {id:'spatialspin',name:'Spatial Spin',cat:'Logic',skill:'logic',bg:'#EEF2FF',iconBg:'linear-gradient(135deg,#6366F1,#8B5CF6)',icon:'🔄',desc:'Rotate shapes mentally — can you see in 3D?'},
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
      const c=$(`<div class="gcard" style="background:${g.bg}">
        ${isNew?'<div class="new-badge">NEW</div>':''}
        ${isDaily?'<div class="featured-badge">🎯 TODAY</div>':''}
        <div class="gico gico-shimmer" style="background:${g.iconBg}">${g.icon}</div>
        <div class="gn">${g.name}</div>
        <div class="gbest">${best?'Best: '+best:'Play to set record!'}</div>
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
  const wrap=$(`<div class="game-screen"></div>`);
  document.body.appendChild(wrap);
  let state={score:0,timer:null,startTs:Date.now(),_frozenTime:null,_frozenScore:undefined};
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
    wrap.dispatchEvent(new Event('remove_game'));
    clearInterval(state.timer);
    _clearAllTimers();
    wrap.style.animation='slideUp .25s reverse';
    setTimeout(()=>{wrap.remove();},230);
  }
  function startClock(){
    state.startTs=Date.now();
    state.timer=setInterval(()=>{
      const el=wrap.querySelector('#gsTime');
      if(el)el.textContent=((Date.now()-state.startTs)/1000).toFixed(1)+'s';
    },100);
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
    const pts=awardScore(Math.max(2,opts.points||2),g.skill,id,opts.value);
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
        <div><span class="gain">+${pts} Brain Score</span></div>
        ${isRec?'<div class="rec">✨ New Personal Record!</div>':''}
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
  else if(id==='dualnback')playNeuralChain(body,setScore,endGame,wrap,startClock);
  else if(id==='math')playMath(body,setScore,endGame,wrap,startClock);
  else if(id==='stroopx')playStroopX(body,setScore,endGame,wrap,startClock);
  else if(id==='iqtest')playIQTest(body,setScore,endGame,wrap,startClock);
  else if(id==='reactionlab')playReactionLab(body,setScore,endGame,wrap,startClock);
  else if(id==='spatialspin')playSpatialSpin(body,setScore,endGame,wrap,startClock);
}

/* ===================== SCHULTE TABLE (redesigned) ===================== */
/* No fixed levels. Fresh random board every game. Modes + records + daily challenge. */
const SCHULTE_MODES={
  normal:{size:5,label:'Normal',sub:'Classic Focus',emoji:'',reverse:false,ghost:false,bestKey:'nz_schulte_best_normal',thresh:[30,25,20,15,10]},
  medium:{size:6,label:'Medium',sub:'Sharp Mind',emoji:'',reverse:false,ghost:false,bestKey:'nz_schulte_best_medium',thresh:[40,35,30,25,20]},
  hard:{size:7,label:'Hard',sub:'Elite Focus',emoji:'',reverse:false,ghost:false,bestKey:'nz_schulte_best_hard',thresh:[50,45,40,35,30]},
  reverse:{size:5,label:'Reverse',sub:'Tap 25→1',emoji:'↩️',reverse:true,ghost:false,bestKey:'nz_schulte_best_normal',thresh:[30,25,20,15,10]},
  ghost:{size:5,label:'Ghost',sub:'Numbers vanish in 3s',emoji:'👻',reverse:false,ghost:true,bestKey:'nz_schulte_best_normal',thresh:[30,25,20,15,10]},
  zen:{size:5,label:'Zen',sub:'No timer, no pressure',emoji:'🧘',reverse:false,ghost:false,zen:true,bestKey:null,thresh:[30,25,20,15,10]},
};
/* Rating from time using mode thresholds [good,great,amazing,incredible,genius] (genius->legendary below) */
function schulteRating(secs,thresh){
  const [t30,t25,t20,t15,t10]=thresh;
  if(secs>=t30)return{emoji:'🙂',text:'Good'};
  if(secs>=t25)return{emoji:'😎',text:'Great'};
  if(secs>=t20)return{emoji:'🔥',text:'Amazing'};
  if(secs>=t15)return{emoji:'⚡',text:'Incredible'};
  if(secs>=t10)return{emoji:'🧠',text:'Genius'};
  return{emoji:'👑',text:'Legendary Focus'};
}
function schulteAccuracyAvg(){
  const h=S('nz_schulte_accuracy_history')||[];
  if(!h.length)return 0;
  return Math.round(h.reduce((a,b)=>a+b,0)/h.length);
}
function schulteFocusRating(){
  // 0-100 derived from avg accuracy and best normal time
  const acc=schulteAccuracyAvg();
  const best=S('nz_schulte_best_normal');
  let timeScore=50;
  if(best!=null){const b=+best;timeScore=Math.max(0,Math.min(100,Math.round(100-(b-8)*3)));}
  if(!acc&&best==null)return 0;
  return Math.round(acc*0.5+timeScore*0.5);
}
/* Daily challenge from date seed */
function schulteDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {mode:'normal',label:'Normal Mode under 20s',limit:20},
    {mode:'medium',label:'Medium Mode under 35s',limit:35},
    {mode:'ghost',label:'Ghost Mode any time',limit:Infinity},
    {mode:'hard',label:'Hard Mode under 50s',limit:50},
    {mode:'reverse',label:'Reverse Mode under 25s',limit:25},
    {mode:'normal',label:'Normal Mode under 15s',limit:15},
    {mode:'medium',label:'Medium Mode under 30s',limit:30},
  ];
  return defs[dayN%defs.length];
}
function schulteDailyDone(){
  return S('nz_schulte_daily_date')===todayKey()&&!!S('nz_schulte_daily_done');
}
function playSchulte(body,setScore,end,wrap,startClock){
  let mode='normal';
  let challenge=true; // Challenge Mode (timer on, records) vs Practice
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const bestN=S('nz_schulte_best_normal');
    const games=S('nz_schulte_games')||0;
    const acc=schulteAccuracyAvg();
    const focus=schulteFocusRating();
    const dc=schulteDailyChallenge();
    const dcDone=schulteDailyDone();
    const screen=$(`<div class="sch-start"></div>`);
    screen.innerHTML=`
      <div class="sch-stats">
        <div class="sch-stat"><div class="v">${bestN!=null?bestN+'s':'—'}</div><div class="l">Best Time</div></div>
        <div class="sch-stat"><div class="v">${games}</div><div class="l">Games</div></div>
        <div class="sch-stat"><div class="v">${acc}%</div><div class="l">Accuracy</div></div>
        <div class="sch-stat"><div class="v">${focus}</div><div class="l">Focus</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for bonus XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="sch-mode-title">Choose a Mode</div>
      <div class="sch-modes" id="schModes"></div>
      <div class="sch-toggle" id="schToggle">
        <button class="sch-tg active" data-c="1">⏱ Challenge<span>Timer · records</span></button>
        <button class="sch-tg" data-c="0">🧘 Practice<span>No ranking</span></button>
      </div>
      <button class="btn-primary" id="schGo" style="margin-top:18px;">Start Game ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#schModes');
    const order=['normal','medium','hard','reverse','ghost','zen'];
    order.forEach(k=>{
      const m=SCHULTE_MODES[k];
      const card=$(`<button class="sch-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji||'▦'} ${m.label}</div>
        <div class="sm-grid">${m.size}×${m.size}${m.zen?'':k==='reverse'?' · 25→1':k==='ghost'?'':' · 1-'+(m.size*m.size)}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.sch-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));updateToggleForMode();};
      modesEl.appendChild(card);
    });
    const toggleEl=screen.querySelector('#schToggle');
    function updateToggleForMode(){
      // Zen mode forces practice (no timer)
      const zen=SCHULTE_MODES[mode].zen;
      if(zen){challenge=false;}
      toggleEl.querySelectorAll('.sch-tg').forEach(b=>b.classList.toggle('active',(b.dataset.c==='1')===challenge));
      toggleEl.style.opacity=zen?'0.5':'1';
      toggleEl.style.pointerEvents=zen?'none':'auto';
    }
    toggleEl.querySelectorAll('.sch-tg').forEach(b=>{
      b.onclick=()=>{playSound('tap');challenge=b.dataset.c==='1';updateToggleForMode();};
    });
    updateToggleForMode();
    screen.querySelector('#schGo').onclick=()=>{playSound('tap');startClock&&startClock();startCountdown();};
  }

  function startCountdown(){
    const m=SCHULTE_MODES[mode];
    const useTimer=challenge&&!m.zen;
    body.innerHTML='';
    const ov=$(`<div class="countdown-overlay"><div class="countdown-num" id="cdNum">3</div><div class="countdown-sub">Get ready…</div></div>`);
    wrap.appendChild(ov);
    buildBoard(m,useTimer);
    let n=3;
    const numEl=ov.querySelector('#cdNum');
    const step=()=>{
      n--;
      if(n>0){numEl.textContent=n;numEl.style.animation='none';void numEl.offsetWidth;numEl.style.animation='countPop .35s cubic-bezier(.16,1,.3,1)';_st(step,800);}
      else{numEl.textContent='GO!';numEl.style.animation='none';void numEl.offsetWidth;numEl.style.animation='countPop .4s cubic-bezier(.16,1,.3,1)';playSound('complete');_st(()=>{ov.remove();beginGame(m,useTimer);},650);}
    };
    _st(step,800);
  }

  let board=null;
  function buildBoard(m,useTimer){
    const total=m.size*m.size;
    const nums=Array.from({length:total},(_,i)=>i+1).sort(()=>Math.random()-.5);
    const chipEmoji=m.emoji||(mode==='medium'?'⚡':mode==='hard'?'🔥':'▦');
    const fs=m.size<=5?'22px':m.size===6?'17px':'14px';
    const cont=$(`<div class="sch-play${m.zen?' sch-zen':''}"></div>`);
    cont.innerHTML=`
      <div class="sch-chip">${chipEmoji} ${m.label} Mode${useTimer?'':' · Practice'}</div>
      <div class="sch-progress"><div class="sch-progress-fill" id="schProg" style="width:0%"></div></div>
      ${useTimer?'<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>':''}
      <div class="schulte-grid" id="schGrid" style="grid-template-columns:repeat(${m.size},1fr);font-size:${fs};"></div>
      <div class="sch-find" id="schFind">Find: <strong id="schNext"></strong></div>
    `;
    body.appendChild(cont);
    const grid=cont.querySelector('#schGrid');
    const cells=[];
    nums.forEach(n=>{
      const c=$(`<div class="sc-cell">${n}</div>`);
      c.dataset.n=n;
      grid.appendChild(c);
      cells.push(c);
    });
    board={m,total,cells,locked:true,cont};
  }

  function beginGame(m,useTimer){
    const {total,cells,cont}=board;
    board.locked=false;
    const reverse=m.reverse;
    let next=reverse?total:1;
    let done=0,correct=0,wrong=0,startTs=Date.now(),barTimer=null,penaltyMs=0;
    const findEl=cont.querySelector('#schNext');
    const progEl=cont.querySelector('#schProg');
    if(findEl)findEl.textContent=next;
    // Ghost: numbers vanish after 3s
    if(m.ghost){
      _st(()=>{cells.forEach(cell=>{if(!cell.classList.contains('done'))cell.classList.add('sch-ghost-hidden');});},3000);
    }
    if(useTimer){
      const maxMs=(m.thresh[0]+20)*1000;
      barTimer=_si(()=>{
        const elapsed=Date.now()-startTs+penaltyMs;
        const pct=Math.max(0,100-(elapsed/maxMs*100));
        const bar=wrap.querySelector('#sBar');
        if(bar){bar.style.width=pct+'%';const rem=(maxMs-elapsed)/1000;bar.className='timer-fill '+(rem<10?'timer-red':rem<25?'timer-yellow':'timer-green');}
      },100);
    }
    cells.forEach(c=>{
      c.onclick=()=>{
        if(board.locked)return;
        const n=+c.dataset.n;
        if(n===next){
          correct++;done++;
          playSound('correct');
          c.classList.add('done');c.classList.remove('sch-ghost-hidden');
          if(m.ghost)c.classList.add('sch-revealed');
          setScore(done);
          if(progEl)progEl.style.width=Math.round(done/total*100)+'%';
          next=reverse?next-1:next+1;
          const remaining=reverse?next>=1:next<=total;
          if(findEl&&remaining)findEl.textContent=next;
          if(done>=total){
            if(barTimer)_cti(barTimer);
            finish();
          }
        } else {
          wrong++;
          playSound('wrong');
          haptic([30,50,30]);
          c.classList.add('wrong');
          penaltyMs+=2000; // -2s penalty (applies to displayed timer where shown)
          flashEdge();
          if(m.ghost){const pen=$(`<span class="sch-pen">-2s</span>`);c.appendChild(pen);_st(()=>pen.remove(),800);}
          _st(()=>c.classList.remove('wrong'),350);
        }
      };
    });

    function finish(){
      board.locked=true;
      const rawSecs=(Date.now()-startTs)/1000;
      const secs=rawSecs+(useTimer?penaltyMs/1000:0);
      const secsR=Math.round(secs*10)/10;
      const totalTaps=correct+wrong;
      const accuracy=totalTaps?Math.round(correct/totalTaps*100):100;
      const rating=schulteRating(secsR,m.thresh);
      // Focus Score
      let focusScore=100-(wrong*5);
      const overGood=secsR-m.thresh[4]; // seconds over the genius threshold
      if(overGood>0)focusScore-=Math.min(60,Math.round(overGood*2));
      focusScore=Math.max(10,Math.min(100,focusScore));
      // Completion wave + confetti
      cells.forEach((cell,i)=>{_st(()=>{cell.classList.add('sch-wave');_st(()=>cell.classList.remove('sch-wave'),400);},i*22);});
      confetti(50);
      // Records (only Challenge mode, not Zen/Practice)
      let newPB=false;
      const ranked=useTimer&&!m.zen;
      if(ranked){
        setS('nz_schulte_games',(S('nz_schulte_games')||0)+1);
        const accH=S('nz_schulte_accuracy_history')||[];
        accH.push(accuracy);while(accH.length>10)accH.shift();
        setS('nz_schulte_accuracy_history',accH);
        if(m.bestKey){
          const prev=S(m.bestKey);
          if(prev==null||secsR<+prev){setS(m.bestKey,secsR);newPB=true;}
        }
        // Daily challenge
        const dc=schulteDailyChallenge();
        if(dc.mode===mode&&!schulteDailyDone()&&secsR<=dc.limit){
          setS('nz_schulte_daily_date',todayKey());
          setS('nz_schulte_daily_done',true);
          setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);
        }
      }
      const pts=Math.max(2,Math.round(focusScore/3));
      end({
        title:`${rating.emoji} ${rating.text}`,emoji:rating.emoji,
        sub:`${secsR}s · ${m.emoji||''} ${m.label} Mode`,
        value:focusScore,points:pts,
        starThresh:[40,65,85],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Time</span><span class="val">${secsR}s</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}%</span></div>
          <div class="row"><span>Wrong Taps</span><span class="val">${wrong}</span></div>
          <div class="row"><span>Focus Score</span><span class="val">${focusScore}/100</span></div>
          ${!ranked?'<div class="row"><span>Mode</span><span class="val">Practice (not ranked)</span></div>':''}
          ${newPB?'<div class="row"><span>🏆 New Personal Best!</span><span class="val">'+secsR+'s</span></div>':''}
        </div>`
      });
    }
  }

  function flashEdge(){
    let g=document.getElementById('schEdgeGlow');
    if(!g){g=$(`<div id="schEdgeGlow" class="sch-edge-glow"></div>`);document.body.appendChild(g);}
    g.classList.add('show');
    _st(()=>{g.classList.remove('show');},120);
  }
}

/* ===================== MEMORY MATRIX v3 (fully rebuilt) ===================== */
const MM_MODES={
  easy:{label:'Easy',emoji:'🌱',sub:'3×3 grid · Chill start',start:3,max:10,ghost:false,zen:false,color:false},
  medium:{label:'Medium',emoji:'⚡',sub:'4×4 grid · More cells',start:4,max:14,ghost:false,zen:false,color:false},
  hard:{label:'Hard',emoji:'🔥',sub:'5×5+ grid · Tough!',start:5,max:18,ghost:false,zen:false,color:false},
  ghost:{label:'Ghost',emoji:'👻',sub:'Cells vanish — memory only!',start:3,max:12,ghost:true,zen:false,color:false},
  color:{label:'Color',emoji:'🎨',sub:'Remember colors + positions',start:3,max:10,ghost:false,zen:false,color:true},
  zen:{label:'Zen',emoji:'🧘',sub:'No pressure, just practice',start:3,max:12,ghost:false,zen:true,color:false},
};
const MM_COLORS=[
  {n:'Red',hex:'#EF4444',light:'#FEE2E2'},
  {n:'Blue',hex:'#3B82F6',light:'#DBEAFE'},
  {n:'Green',hex:'#22C55E',light:'#DCFCE7'},
  {n:'Yellow',hex:'#EAB308',light:'#FEF9C3'},
  {n:'Purple',hex:'#A855F7',light:'#F3E8FF'},
  {n:'Orange',hex:'#F97316',light:'#FFEDD5'},
];
function mmGridSize(round,mode){
  if(mode==='easy'){if(round<=4)return 3;if(round<=10)return 4;return 5;}
  if(mode==='medium'){if(round<=3)return 4;if(round<=8)return 5;return 6;}
  if(mode==='hard'){if(round<=3)return 5;if(round<=7)return 6;return 7;}
  if(mode==='ghost'){if(round<=5)return 3;if(round<=10)return 4;return 5;}
  if(mode==='color'){if(round<=4)return 3;if(round<=9)return 4;return 5;}
  // zen
  if(round<=5)return 3;if(round<=10)return 4;return 5;
}
function mmFlashMs(round,mode){
  const base=mode==='ghost'?1800:mode==='hard'?2200:2400;
  const decay=mode==='ghost'?120:mode==='hard'?80:60;
  return Math.max(mode==='ghost'?500:600,base-round*decay);
}
function mmRank(round){
  if(round<=4)return{em:'🌱',txt:'Keep Practicing'};
  if(round<=8)return{em:'💪',txt:'Getting Better'};
  if(round<=13)return{em:'🧠',txt:'Sharp Mind'};
  if(round<=18)return{em:'⚡',txt:'Memory Expert'};
  if(round<=25)return{em:'🏆',txt:'Memory Master'};
  return{em:'👑',txt:'Legendary Memory'};
}
function mmDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Reach Round 10',type:'round',target:10},
    {label:'5 perfect rounds in a row',type:'streak',target:5},
    {label:'Survive Ghost mode 8 rounds',type:'ghost',target:8},
    {label:'Reach Round 15',type:'round',target:15},
    {label:'7 correct streak',type:'streak',target:7},
    {label:'Color mode Round 8+',type:'color',target:8},
  ];
  return defs[dayN%defs.length];
}
function mmDailyDone(){return S('nz_mm_daily_date')===todayKey()&&!!S('nz_mm_daily_done');}
function mmEdgeFlash(){
  let g=document.getElementById('mmEdgeGlow');
  if(!g){g=$(`<div id="mmEdgeGlow" class="mm-edge-glow"></div>`);document.body.appendChild(g);}
  g.classList.add('show');_st(()=>g.classList.remove('show'),200);
}
function playMemory(body,setScore,end,wrap,startClock){
  let mode='easy';
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_mm_best_round')||0;
    const games=S('nz_mm_games')||0;
    const accH=S('nz_mm_accuracy')||[];
    const bestAcc=accH.length?Math.max(...accH):0;
    const dc=mmDailyChallenge();
    const dcDone=mmDailyDone();
    const screen=$(`<div class="mm-start"></div>`);
    screen.innerHTML=`
      <div class="mm-hero">
        <div style="font-size:52px;">🧠</div>
        <h2 style="margin:8px 0 4px;font-size:20px;">Memory Matrix</h2>
        <p style="font-size:12px;color:var(--text2);margin:0;">Memorize cells · Recall the pattern · Survive!</p>
      </div>
      <div class="mm-stats">
        <div class="mm-stat"><div class="v">${bestRound}</div><div class="l">Best Round</div></div>
        <div class="mm-stat"><div class="v">${games}</div><div class="l">Games</div></div>
        <div class="mm-stat"><div class="v">${bestAcc}%</div><div class="l">Best Acc</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="mm-mode-title">Choose a Mode</div>
      <div class="mm-modes" id="mmModes"></div>
      <button class="btn-primary" id="mmGo" style="margin-top:18px;width:100%;padding:16px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#mmModes');
    ['easy','medium','hard','ghost','color','zen'].forEach(k=>{
      const m=MM_MODES[k];
      const card=$(`<button class="mm-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-grid">${m.start} cells start</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.mm-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#mmGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const m=MM_MODES[mode];
    let round=1,lives=3,cells=m.start,streak=0,bestStreak=0,correctRounds=0,totalRounds=0;
    body.innerHTML='';
    const stage=$(`<div class="mm-stage${m.zen?' mm-zen':''}"></div>`);
    body.appendChild(stage);

    function heartsHtml(){
      return [0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('');
    }
    function hud(extra){
      const best=S('nz_mm_best_round')||0;
      const modeTag=`<span class="mm-mode-tag">${m.emoji} ${m.label}</span>`;
      return `<div class="wc-hearts">${heartsHtml()}</div>
        <div class="mm-roundrow">
          <span>Round <strong>${round}</strong>${streak>=2?` · 🔥${streak}`:''}  </span>
          <span>${modeTag}</span>
          <span>Best <strong>${Math.max(best,round-1)}</strong></span>
        </div>
        ${extra||''}`;
    }

    function showPhaseToast(){
      if(m.zen)return;
      if(round===5)toast('⚡ Getting faster!');
      else if(round===10)toast('🧠 Expert territory!');
      else if(round===15)toast('👑 Legendary round!');
    }

    function doRound(){
      showPhaseToast();
      const gsize=mmGridSize(round,mode);
      const cellCount=gsize*gsize;
      const n=Math.min(cells,cellCount-1,m.max);
      // Cell size: fit nicely
      const maxW=Math.min(320,window.innerWidth-40);
      const cellPx=Math.min(56,Math.floor((maxW-gsize*4)/gsize));
      const flashMs=mmFlashMs(round,mode);
      const isGhost=m.ghost;
      const isColor=m.color;

      // Pick random pattern indices
      const idxs=Array.from({length:cellCount},(_,i)=>i);
      for(let i=idxs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]];}
      const pattern=idxs.slice(0,n);

      // Assign colors for color mode
      const colorOf={};
      if(isColor){
        const shuffled=[...MM_COLORS].sort(()=>Math.random()-.5);
        pattern.forEach((idx,i)=>{colorOf[idx]=shuffled[i%shuffled.length];});
      }

      const phaseLabel=isGhost?'👻 Memorize fast!':(isColor?'🎨 Remember colors!':'🧠 Memorize!');
      stage.innerHTML=hud(`
        <div class="mm-phase-label" id="mmPhase">${phaseLabel} (${n} cell${n>1?'s':''})</div>
        <div class="mm-flash-bar"><div class="mm-flash-fill" id="mmFlashFill" style="width:100%;transition:width ${flashMs}ms linear;"></div></div>
        <div class="mm-gridwrap">
          <div class="mm-grid" id="mmGrid" style="display:grid;grid-template-columns:repeat(${gsize},${cellPx}px);gap:4px;"></div>
        </div>
        ${isColor?`<div class="mm-color-guide" id="mmColorGuide"></div>`:''}
      `);

      const grid=stage.querySelector('#mmGrid');
      const cellEls=[];
      for(let i=0;i<cellCount;i++){
        const c=$(`<div class="mm-cell" style="width:${cellPx}px;height:${cellPx}px;border-radius:${cellPx>44?'10px':'8px'};"></div>`);
        c.dataset.i=i;grid.appendChild(c);cellEls.push(c);
      }

      // Start flash bar animation
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          const fb=stage.querySelector('#mmFlashFill');
          if(fb){fb.style.width='0%';}
        });
      });

      // --- REVEAL PHASE ---
      function reveal(){
        const phaseEl=stage.querySelector('#mmPhase');

        if(isGhost){
          // Ghost: show all at once, then vanish one by one
          pattern.forEach(idx=>{
            cellEls[idx].classList.add('mm-flash');
          });
          // Stagger vanish
          pattern.forEach((idx,i)=>{
            _st(()=>{
              cellEls[idx].classList.remove('mm-flash');
              cellEls[idx].classList.add('mm-ghost-gone');
            }, Math.floor(flashMs * (i+1) / (n+1)));
          });
          _st(()=>{
            cellEls.forEach(c=>{c.classList.remove('mm-ghost-gone');});
            if(phaseEl)phaseEl.textContent=`🎯 Tap the ${n} cell${n>1?'s':''}!`;
            beginRecall();
          }, flashMs+200);
        } else if(isColor){
          // Color mode: show all colored cells at once
          pattern.forEach(idx=>{
            const col=colorOf[idx];
            cellEls[idx].classList.add('mm-flash');
            cellEls[idx].style.background=col.hex;
            cellEls[idx].style.boxShadow=`0 0 14px ${col.hex}88`;
          });
          // Build color guide
          const guideEl=stage.querySelector('#mmColorGuide');
          if(guideEl){
            const uniqueCols=[...new Set(pattern.map(idx=>colorOf[idx].n))];
            guideEl.innerHTML=uniqueCols.map(n=>{
              const col=MM_COLORS.find(c=>c.n===n);
              return`<span class="mm-col-pill" style="background:${col.hex};">${col.n}</span>`;
            }).join('');
          }
          _st(()=>{
            pattern.forEach(idx=>{
              cellEls[idx].classList.remove('mm-flash');
              cellEls[idx].style.background='';
              cellEls[idx].style.boxShadow='';
            });
            if(phaseEl)phaseEl.textContent='🎨 Tap each cell in its color order!';
            // Show which color to tap next
            beginColorRecall();
          },flashMs);
        } else {
          // Normal: show all, then hide
          pattern.forEach(idx=>{cellEls[idx].classList.add('mm-flash');});
          _st(()=>{
            pattern.forEach(idx=>{cellEls[idx].classList.remove('mm-flash');});
            if(phaseEl)phaseEl.textContent=`🎯 Tap the ${n} cell${n>1?'s':''}!`;
            beginRecall();
          },flashMs);
        }
      }

      // --- NORMAL RECALL ---
      function beginRecall(){
        const picked=[];
        let roundFailed=false;
        cellEls.forEach(c=>{
          c.onclick=()=>{
            if(roundFailed)return;
            const idx=+c.dataset.i;
            if(picked.includes(idx))return;
            if(pattern.includes(idx)){
              picked.push(idx);
              c.classList.add('mm-correct');
              playSound('correct');haptic(10);
              c.style.transform='scale(0.92)';
              setTimeout(()=>{c.style.transform='';},150);
              if(picked.length>=n){
                // Success!
                roundFailed=true;
                _st(roundComplete,300);
              }
            } else {
              roundFailed=true;
              c.classList.add('mm-wrong');
              playSound('wrong');haptic([30,50,30]);mmEdgeFlash();
              // Reveal correct pattern
              pattern.forEach(idx2=>{
                if(!picked.includes(idx2))cellEls[idx2].classList.add('mm-reveal');
              });
              _st(()=>loseLife(),1000);
            }
          };
        });
      }

      // --- COLOR RECALL (color mode) ---
      function beginColorRecall(){
        // Sort pattern by color order (Red→Blue→Green→Yellow→Purple→Orange)
        const colorOrder=['Red','Blue','Green','Yellow','Purple','Orange'];
        const orderedPattern=[...pattern].sort((a,b)=>{
          const ai=colorOrder.indexOf(colorOf[a].n);
          const bi=colorOrder.indexOf(colorOf[b].n);
          return ai-bi;
        });
        let nextIdx=0;
        let roundFailed=false;

        // Update the color guide to show which to tap next
        function updateColorGuide(){
          const phaseEl=stage.querySelector('#mmPhase');
          if(nextIdx<orderedPattern.length){
            const nextCol=colorOf[orderedPattern[nextIdx]];
            if(phaseEl)phaseEl.innerHTML=`Tap: <span style="color:${nextCol.hex};font-weight:700;">${nextCol.n}</span> (${nextIdx+1}/${n})`;
          }
        }
        updateColorGuide();

        cellEls.forEach(c=>{
          c.onclick=()=>{
            if(roundFailed)return;
            const idx=+c.dataset.i;
            if(!pattern.includes(idx)){
              // Wrong — not even in pattern
              roundFailed=true;
              c.classList.add('mm-wrong');
              playSound('wrong');haptic([30,50,30]);mmEdgeFlash();
              orderedPattern.forEach(pi=>cellEls[pi].classList.add('mm-reveal'));
              _st(()=>loseLife(),1000);
              return;
            }
            if(idx!==orderedPattern[nextIdx]){
              // In pattern but wrong order
              roundFailed=true;
              c.classList.add('mm-wrong');
              playSound('wrong');haptic([30,50,30]);mmEdgeFlash();
              orderedPattern.forEach(pi=>{
                const col=colorOf[pi];
                cellEls[pi].classList.add('mm-reveal');
                cellEls[pi].style.background=col.hex;
                cellEls[pi].style.opacity='0.5';
              });
              _st(()=>loseLife(),1000);
              return;
            }
            // Correct
            const col=colorOf[idx];
            c.classList.add('mm-correct');
            c.style.background=col.hex;
            c.style.color='#fff';
            playSound('correct');haptic(10);
            nextIdx++;
            updateColorGuide();
            if(nextIdx>=orderedPattern.length){
              roundFailed=true;
              _st(roundComplete,300);
            }
          };
        });
      }

      function roundComplete(){
        correctRounds++;totalRounds++;streak++;if(streak>bestStreak)bestStreak=streak;
        haptic(20);
        // Wave animation on correct cells
        pattern.forEach((idx,i)=>_st(()=>{
          cellEls[idx].classList.add('mm-wave');
          _st(()=>cellEls[idx].classList.remove('mm-wave'),350);
        },i*50));
        // Streak milestone messages
        if(streak===3)showCombo('🔥 3 STREAK!');
        else if(streak===5)showCombo('⚡ HOT STREAK × 5!');
        else if(streak===10)showCombo('👑 LEGEND!');
        else toast(`✅ Round ${round}!`);
        cells=Math.min(cells+1,m.max);
        round++;
        setScore(round-1);
        _st(doRound,900);
      }

      reveal();
    }

    function loseLife(){
      lives--;totalRounds++;streak=0;
      // Update hearts in DOM immediately
      const hearts=stage.querySelectorAll('.wc-heart');
      if(hearts[lives]){
        hearts[lives].textContent='💔';
        hearts[lives].classList.add('crack','lost');
      }
      toast(`❌ Wrong! ${lives} lives left`);
      if(lives<=0){_st(gameOver,1200);return;}
      _st(doRound,1200);
    }

    function gameOver(){
      const finalRound=round;
      const accuracy=totalRounds?Math.round(correctRounds/totalRounds*100):0;
      const prevBest=S('nz_mm_best_round')||0;
      const newPB=finalRound>prevBest;
      if(newPB)setS('nz_mm_best_round',finalRound);
      setS('nz_mm_games',(S('nz_mm_games')||0)+1);
      const accH=S('nz_mm_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_mm_accuracy',accH);
      if(bestStreak>(S('nz_mm_best_streak')||0))setS('nz_mm_best_streak',bestStreak);
      const dc=mmDailyChallenge();
      if(!mmDailyDone()){
        let pass=false;
        if(dc.type==='round')pass=finalRound>=dc.target;
        else if(dc.type==='streak')pass=bestStreak>=dc.target;
        else if(dc.type==='ghost')pass=(mode==='ghost'&&finalRound>=dc.target);
        else if(dc.type==='color')pass=(mode==='color'&&finalRound>=dc.target);
        if(pass){setS('nz_mm_daily_date',todayKey());setS('nz_mm_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge done! 2x XP'),700);}
      }
      const rank=mmRank(finalRound);
      if(newPB)confetti(60);
      setScore(finalRound);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Round ${finalRound} · ${m.emoji} ${m.label} Mode${newPB?' · 🏆 New Best!':''}`,
        value:finalRound,points:Math.round(finalRound*2.8),starThresh:[6,12,20],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Round Reached</span><span class="val">${finalRound}</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(finalRound,prevBest)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}% (${correctRounds}/${totalRounds})</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Mode</span><span class="val">${m.emoji} ${m.label}</span></div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    doRound();
  }
}

/* ===================== PATTERN IQ (v3 — fully rebuilt) ===================== */
const PAT_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24','#EF4444','#06B6D4'];
const PAT_COLOR_NAMES=['Purple','Blue','Green','Orange','Pink','Yellow','Red','Cyan'];
const PAT_SHAPES=['●','■','▲','◆','★','⬟','⬡','✦'];
const PAT_SHAPE_NAMES=['Circle','Square','Triangle','Diamond','Star','Hexagon','Hex2','Sparkle'];

/* --- Number sequence generators (8 types) --- */
function genNumSeq(){
  const rnd=n=>Math.floor(Math.random()*n)+1;
  const types=[
    ()=>{const a=rnd(8)+1,d=rnd(9)+2;return{seq:[a,a+d,a+2*d,a+3*d],ans:a+4*d,hint:'+'+d+' each step'};},
    ()=>{const a=rnd(4)+2,r=rnd(3)+2;return{seq:[a,a*r,a*r*r,a*r*r*r],ans:a*r*r*r*r,hint:'×'+r+' each step'};},
    ()=>{const a=rnd(6)+1,b=rnd(6)+2;const s=[a,b,a+b,a+2*b,2*a+3*b];return{seq:s.slice(0,4),ans:s[4],hint:'Fibonacci-like'};},
    ()=>{const n=rnd(5)+1;return{seq:[n*n,(n+1)*(n+1),(n+2)*(n+2),(n+3)*(n+3)],ans:(n+4)*(n+4),hint:'Perfect squares'};},
    ()=>{const primes=[2,3,5,7,11,13,17,19,23,29];const s=rnd(5);return{seq:primes.slice(s,s+4),ans:primes[s+4],hint:'Prime numbers'};},
    ()=>{const a=rnd(15)+5,d=rnd(5)+1;return{seq:[a,a-d,a-2*d,a-3*d],ans:a-4*d,hint:'-'+d+' each step'};},
    ()=>{const a=rnd(6)+2,b=rnd(4)+2;return{seq:[a,a+b,a+3*b,a+6*b],ans:a+10*b,hint:'Gaps: +b,+2b,+3b,+4b'};},
    ()=>{const a=rnd(4)+2,b=rnd(3)+2;const s=[a,a*b,a*b+a,a*b+a*b];return{seq:s,ans:s[3]+a,hint:'Alternate +,×'};},
  ];
  const t=types[Math.floor(Math.random()*types.length)]();
  const dist=new Set([t.ans]);
  while(dist.size<4){const d=t.ans+Math.floor(Math.random()*22)-11;if(d>0&&d!==t.ans)dist.add(d);}
  const opts=[...dist].sort(()=>Math.random()-.5);
  return{...t,opts,answerIdx:opts.indexOf(t.ans)};
}

/* --- Letter sequence generators --- */
function genLetterSeq(){
  const rnd=n=>Math.floor(Math.random()*n);
  const type=rnd(4);
  if(type===0){
    const skip=rnd(3)+1,start=rnd(6);
    const seq=Array.from({length:4},(_,i)=>String.fromCharCode(65+start+i*(skip+1)));
    const ans=String.fromCharCode(65+start+4*(skip+1));
    if(ans.charCodeAt(0)>90)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Skip +'+skip+' letters forward'};
  } else if(type===1){
    const start=rnd(6)+18,skip=rnd(2)+1;
    const seq=Array.from({length:4},(_,i)=>String.fromCharCode(start-i*skip));
    const ans=String.fromCharCode(start-4*skip);
    if(ans.charCodeAt(0)<65)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Going backward -'+skip};
  } else if(type===2){
    // alternating skip: +1,+2,+1,+2...
    const start=rnd(8);
    const gaps=[1,2,1,2,1];
    const positions=[start];
    for(let i=0;i<4;i++)positions.push(positions[i]+gaps[i]);
    const seq=positions.slice(0,4).map(p=>String.fromCharCode(65+p));
    const ans=String.fromCharCode(65+positions[4]);
    if(positions[4]>25||positions[4]<0)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Alternating +1,+2 gaps'};
  } else {
    // number+letter pairs
    const pairs=[['A',1],['C',3],['E',5],['G',7],['I',9]];
    const start=rnd(3);
    const seq=pairs.slice(start,start+4).map(p=>p[0]+p[1]);
    const ans=pairs[start+4]?pairs[start+4][0]+pairs[start+4][1]:'K11';
    const dist=['B2','D4','F6','J10'].filter(x=>x!==ans).slice(0,3);
    if(dist.length<3)return genLetterSeq();
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Letter+number both increment'};
  }
}

/* --- Matrix 3×3 generator (smarter, not always bottom-right missing) --- */
function genMatrixQ(){
  const rowShapes=[0,1,2].map(()=>Math.floor(Math.random()*PAT_SHAPES.length));
  const rowCols=[0,1,2].map(()=>Math.floor(Math.random()*PAT_COLORS.length));
  // randomly pick which cell is missing (not always index 8)
  const missingPos=Math.floor(Math.random()*9);
  const grid=[];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:rowShapes[r],c:rowCols[c]});
  const missingCell=grid[missingPos];
  const correct=`${missingCell.s}_${missingCell.c}`;
  const wrongOpts=new Set();
  while(wrongOpts.size<3){
    const ws=(missingCell.s+(Math.floor(Math.random()*4)+1))%PAT_SHAPES.length;
    const wc=(missingCell.c+(Math.floor(Math.random()*4)+1))%PAT_COLORS.length;
    const k=`${ws}_${wc}`;
    if(k!==correct)wrongOpts.add(k);
  }
  const opts=[correct,...wrongOpts].sort(()=>Math.random()-.5);
  const answerIdx=opts.indexOf(correct);
  const cellHTML=grid.map((cell,i)=>i===missingPos?
    `<div class="pm-cell missing">?</div>`:
    `<div class="pm-cell" style="background:${PAT_COLORS[cell.c]};color:#fff;">${PAT_SHAPES[cell.s]}</div>`
  ).join('');
  const hint=`Row has same shape, column has same color`;
  return{cellHTML,opts,answerIdx,hint};
}

/* --- Color sequence generator (longer, more interesting) --- */
function genColorSeq(){
  const shape=PAT_SHAPES[Math.floor(Math.random()*PAT_SHAPES.length)];
  const type=Math.floor(Math.random()*3);
  if(type===0){
    // ABAB pattern - find C in ABCA?BC
    const a=Math.floor(Math.random()*PAT_COLORS.length);
    let b=a;while(b===a)b=Math.floor(Math.random()*PAT_COLORS.length);
    const seq=[a,b,a,b,a];const ans=b;
    const missingPos=4; // show 4 items, ask 5th
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans).sort(()=>Math.random()-.5).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq:seq.slice(0,4),opts,answerIdx:opts.indexOf(ans),shape,hint:'ABAB repeating pattern'};
  } else if(type===1){
    // ABCABC repeating
    const pool=Array.from({length:PAT_COLORS.length},(_,i)=>i).sort(()=>Math.random()-.5).slice(0,3);
    const [a,b,c]=pool;
    const seq=[a,b,c,a,b];const ans=c;
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans&&i!==a&&i!==b).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),shape,hint:'ABC repeating — find next in cycle'};
  } else {
    // Rainbow-like: advancing through color wheel
    const start=Math.floor(Math.random()*PAT_COLORS.length);
    const seq=Array.from({length:4},(_,i)=>(start+i)%PAT_COLORS.length);
    const ans=(start+4)%PAT_COLORS.length;
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans).sort(()=>Math.random()-.5).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),shape,hint:'Sequential color progression'};
  }
}

/* --- Shape rule question --- */
function genShapeRuleQ(){
  // Each row: shapes increase in count 1,2,3 or rotate through types
  const type=Math.floor(Math.random()*2);
  if(type===0){
    // Count pattern: row1→[1,2,3] shapes of same color, find missing count
    const shape=PAT_SHAPES[Math.floor(Math.random()*4)];
    const col=PAT_COLORS[Math.floor(Math.random()*PAT_COLORS.length)];
    const make=(n,s,c)=>Array(n).fill(0).map(()=>`<span style="color:${c};font-size:20px;">${s}</span>`).join('');
    // 3×3: col increases 1→3, row uses different shapes
    const shapes3=[0,1,2].map(()=>Math.floor(Math.random()*PAT_SHAPES.length));
    const cols3=[0,1,2].map(()=>Math.floor(Math.random()*PAT_COLORS.length));
    const missingRow=Math.floor(Math.random()*3);
    const missingCol2=Math.floor(Math.random()*3);
    const correct=`${shapes3[missingRow]}_${cols3[missingCol2]}`;
    const wrongOpts=new Set();
    while(wrongOpts.size<3){
      const ws=(shapes3[missingRow]+(Math.floor(Math.random()*3)+1))%PAT_SHAPES.length;
      const wc=(cols3[missingCol2]+(Math.floor(Math.random()*3)+1))%PAT_COLORS.length;
      wrongOpts.add(`${ws}_${wc}`);
    }
    const opts=[correct,...wrongOpts].sort(()=>Math.random()-.5);
    const answerIdx=opts.indexOf(correct);
    const grid=[];
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      const isMissing=(r===missingRow&&c===missingCol2);
      grid.push(isMissing?`<div class="pm-cell missing">?</div>`:
        `<div class="pm-cell" style="background:${PAT_COLORS[cols3[c]]};color:#fff;font-size:20px;">${PAT_SHAPES[shapes3[r]]}</div>`);
    }
    return{cellHTML:grid.join(''),opts,answerIdx,hint:'Same shape per row, same color per column'};
  } else {
    return genMatrixQ();
  }
}

function playPattern(body,setScore,end,wrap,startClock){
  const record=S('nz_pattern_best')||0;
  // Start screen
  const screen=$(`<div class="pat-start-screen"></div>`);
  screen.innerHTML=`
    <div class="pat-start-hero">
      <div style="font-size:64px;margin-bottom:8px;">💡</div>
      <h2 style="margin:0 0 6px;font-size:22px;">Pattern IQ</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5;">
        Color · Number · Matrix · Letter · Shape patterns<br>
        <strong>6 types</strong> of questions · Endless with 3 lives
      </p>
      ${record?`<div class="pat-best-chip">🏆 Best Score: ${record}</div>`:''}
    </div>
    <div class="pat-rules">
      <div class="pat-rule"><span>⚡</span><span>Answer in 3s = Speed Bonus +1</span></div>
      <div class="pat-rule"><span>🔥</span><span>Streak × 1.5 multiplier at 3+</span></div>
      <div class="pat-rule"><span>💡</span><span>Wrong = hint revealed, -1 life</span></div>
      <div class="pat-rule"><span>🎯</span><span>Harder rounds = more points</span></div>
    </div>
    <button class="btn-primary" id="patStart" style="width:100%;margin-top:18px;padding:16px;">Start Game ▶</button>
  `;
  body.appendChild(screen);

  const host=$(`<div class="pat-host"></div>`);body.appendChild(host);
  let q=0,score=0,bonus=0,arcTimer=null,qStartTs=0,lives=3,streak=0,bestStreak=0,combo=1;
  let lastExplanation='';

  function patHearts(){
    return `<div class="pat-hud">
      <div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>
      <div class="pat-hud-right">
        <span class="pat-score-badge">${score} pts</span>
        ${streak>=2?`<span class="pat-streak-badge">🔥${streak}</span>`:''}
      </div>
    </div>`;
  }

  function showArc(secs,onDone){
    _cti(arcTimer);
    const circ=2*Math.PI*30;
    let remaining=secs*10;
    arcTimer=_si(()=>{
      remaining--;
      const fg=host.querySelector('#arcFg');
      const num=host.querySelector('#arcNum');
      if(!fg||!num){_cti(arcTimer);return;}
      const pct=remaining/(secs*10);
      fg.style.strokeDashoffset=circ*(1-pct);
      fg.setAttribute('stroke',remaining<10?'#EF4444':remaining<20?'#F59E0B':'#7C3AED');
      num.textContent=Math.ceil(remaining/10);
      if(remaining<=0){_cti(arcTimer);onDone();}
    },100);
  }

  function getTimerSecs(){
    // Timer gets shorter as score increases
    if(score<5)return 7;
    if(score<12)return 6;
    if(score<20)return 5;
    return 4;
  }

  function getDifficultyLabel(){
    if(score<5)return{label:'🟢 Easy',color:'#22C55E'};
    if(score<12)return{label:'🟡 Medium',color:'#EAB308'};
    if(score<20)return{label:'🔴 Hard',color:'#EF4444'};
    return{label:'💀 Expert',color:'#7C3AED'};
  }

  function next(){
    if(lives<=0){
      const total=score+bonus;
      const newPB=score>record;
      if(newPB)setS('nz_pattern_best',score);
      setS('nz_pattern_games',(S('nz_pattern_games')||0)+1);
      if(newPB)confetti(60);
      const acc=q?Math.round(score/q*100):0;
      end({
        title:newPB?'New Best! 🏆':'Pattern Master! 💡',
        emoji:'💡',
        sub:`${score} correct · ${q} attempted${newPB?' · 🏆':''}`,
        value:total,points:Math.max(2,total*1.8),starThresh:[8,18,30],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Correct Answers</span><span class="val">${score}</span></div>
          <div class="row"><span>Total Attempted</span><span class="val">${q}</span></div>
          <div class="row"><span>Speed Bonuses</span><span class="val">+${bonus} ⚡</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${acc}%</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
      return;
    }
    _cti(arcTimer);

    // Prevent same type 2× in a row
    if(!window._patLastTypes)window._patLastTypes=[];
    const _allTypes=[0,1,2,3,4,5];
    const _avail=_allTypes.filter(t=>!window._patLastTypes.slice(-1).includes(t));
    const type=_avail[Math.floor(Math.random()*_avail.length)];
    window._patLastTypes.push(type);
    if(window._patLastTypes.length>6)window._patLastTypes.shift();

    const diff=getDifficultyLabel();
    const timerSecs=getTimerSecs();
    let answerIdx=0,html='',hint='';

    if(type===0){
      // COLOR SEQUENCE — longer, more interesting
      const res=genColorSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#7C3AED,#F472B6);">🎨 COLOR SEQUENCE</div>
        <div class="pat-instruction">Jo pattern hai, uska agla color kya hoga?</div>
        <div class="pat-seq pat-seq-lg">${res.seq.map(c=>`<div class="pat-item pat-item-lg" style="background:${PAT_COLORS[c]};box-shadow:0 4px 16px ${PAT_COLORS[c]}55;">${res.shape}</div>`).join('')}<div class="pat-item pat-item-lg pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((c,i)=>`<button class="pat-opt pat-opt-color" data-i="${i}" style="background:${PAT_COLORS[c]};box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${res.shape}<span style="font-size:10px;display:block;margin-top:2px;">${PAT_COLOR_NAMES[c]}</span></button>`).join('')}</div>`;
    } else if(type===1){
      // NUMBER SEQUENCE
      const res=genNumSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#4F8EF7,#7C3AED);">🔢 NUMBER SEQUENCE</div>
        <div class="pat-instruction">Is number sequence mein agla number kya hai?</div>
        <div class="pat-seq">${res.seq.map(n=>`<div class="pat-item pat-num" style="background:linear-gradient(135deg,#7C3AED,#4F8EF7);">${n}</div>`).join('')}<div class="pat-item pat-num pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((v,i)=>`<button class="pat-opt pat-opt-num" data-i="${i}">${v}</button>`).join('')}</div>`;
    } else if(type===2){
      // MATRIX — smarter, random missing position
      const res=genMatrixQ();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F472B6,#F97316);">🔲 MATRIX PATTERN</div>
        <div class="pat-instruction">"?" wali jagah kaunsa symbol hona chahiye?</div>
        <div class="pat-matrix-wrap"><div class="pat-matrix">${res.cellHTML}</div></div>
        <div class="pat-opts">${res.opts.map((k,i)=>{const[s,c]=k.split('_').map(Number);return`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;font-size:22px;box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${PAT_SHAPES[s]}</button>`;}).join('')}</div>`;
    } else if(type===3){
      // LETTER SEQUENCE
      const res=genLetterSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F472B6,#EC4899);">🔤 LETTER SEQUENCE</div>
        <div class="pat-instruction">Is letter sequence mein agla letter kya hai?</div>
        <div class="pat-seq">${res.seq.map(l=>`<div class="pat-item pat-letter">${l}</div>`).join('')}<div class="pat-item pat-letter pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((l,i)=>`<button class="pat-opt pat-opt-letter" data-i="${i}">${l}</button>`).join('')}</div>`;
    } else if(type===4){
      // SPECIAL SEQUENCE (Fibonacci, Squares, Primes)
      const res=genNumSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#34D399,#059669);">🧮 SPECIAL SEQUENCE</div>
        <div class="pat-instruction">Mathematical pattern dekho — agla number?</div>
        <div class="pat-seq">${res.seq.map(n=>`<div class="pat-item pat-special">${n}</div>`).join('')}<div class="pat-item pat-special pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((v,i)=>`<button class="pat-opt pat-opt-special" data-i="${i}">${v}</button>`).join('')}</div>`;
    } else {
      // SHAPE RULE MATRIX
      const res=genShapeRuleQ();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F97316,#FBBF24);">🔷 SHAPE MATRIX</div>
        <div class="pat-instruction">Har row aur column ka rule follow karo — "?" kya hai?</div>
        <div class="pat-matrix-wrap"><div class="pat-matrix">${res.cellHTML}</div></div>
        <div class="pat-opts">${res.opts.map((k,i)=>{const[s,c]=k.split('_').map(Number);return`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;font-size:22px;box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${PAT_SHAPES[s]}</button>`;}).join('')}</div>`;
    }

    const arcHtml=`<div class="arc-wrap">
      <svg id="arcSvg" width="66" height="66" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(124,58,237,0.15)" stroke-width="5"/>
        <circle id="arcFg" cx="35" cy="35" r="30" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="0"/>
      </svg>
      <div class="arc-num" id="arcNum">${timerSecs}</div>
    </div>`;

    host.innerHTML=`
      ${patHearts()}
      <div class="pat-diff-row">
        <span class="pat-diff-chip" style="color:${diff.color}">${diff.label}</span>
        ${arcHtml}
        <span style="font-size:12px;color:var(--text2);">Q${q+1}</span>
      </div>
      ${html}
    `;

    qStartTs=Date.now();
    showArc(timerSecs,()=>{
      // Timeout — show hint and lose life
      playSound('wrong');
      const hintEl=document.createElement('div');
      hintEl.className='pat-hint-box';
      hintEl.innerHTML=`⏱ Time's up! · <span>💡 Hint: ${hint}</span>`;
      host.appendChild(hintEl);
      lives--;streak=0;combo=1;
      toast('⏱ Too slow! -1 life');
      q++;_st(next,1500);
    });

    host.querySelectorAll('.pat-opt').forEach(btn=>{
      btn.onclick=()=>{
        _cti(arcTimer);
        host.querySelectorAll('.pat-opt').forEach(b=>b.disabled=true);
        const chosen=+btn.dataset.i;
        const elapsed=Date.now()-qStartTs;
        if(chosen===answerIdx){
          playSound('correct');
          btn.classList.add('correct-ans');
          streak++;if(streak>bestStreak)bestStreak=streak;
          if(streak===3){combo=1.5;showCombo('🔥 STREAK x1.5');}
          if(streak===6){combo=2;showCombo('⚡ ON FIRE x2!');}
          const pts=Math.round((elapsed<3000?2:1)*combo);
          score+=pts;setScore(score);
          const fast=elapsed<3000;
          if(fast){bonus++;showCombo('⚡ SPEED +1');}
          // Show score popup
          const popup=document.createElement('div');
          popup.className='pat-pts-popup';
          popup.textContent=`+${pts}${fast?' ⚡':''}`;
          host.appendChild(popup);
          setTimeout(()=>popup.remove(),700);
          q++;_st(next,500);
        } else {
          playSound('wrong');
          btn.classList.add('wrong-ans');
          // Highlight correct answer
          host.querySelectorAll('.pat-opt')[answerIdx].classList.add('correct-ans');
          // Show hint
          const hintEl=document.createElement('div');
          hintEl.className='pat-hint-box pat-hint-wrong';
          hintEl.innerHTML=`❌ Wrong! · <span>💡 Hint: ${hint}</span>`;
          host.appendChild(hintEl);
          lives--;streak=0;combo=1;
          toast('❌ Wrong! -1 life');
          q++;_st(next,1200);
        }
      };
    });
  }

  screen.querySelector('#patStart').onclick=()=>{
    screen.remove();
    startClock&&startClock();
    window._patLastTypes=[];
    next();
  };
}

/* ===================== WORD FLASH (endless) ===================== */
const WF_T1=[
  ['CALM','CLAM','COAL','CALF'],['FORM','FROM','FORT','FOAM'],
  ['SALT','SLAT','SLOT','SILT'],['WORD','WARD','WARM','CORD'],
  ['MILE','LIME','MINE','MICE'],['TIDE','TIED','DIET','EDIT'],
  ['STAR','RATS','SCAR','STIR'],['LOOP','POOL','POLO','LOOT'],
  ['BEAR','BARE','BEAD','BEAN'],['PALE','PEAL','PLEA','PALM'],
  ['DEAL','LEAD','DEAR','DENT'],['NOTE','TONE','NONE','NODE'],
  ['GAME','MAGE','GATE','GAZE'],['RICE','RACE','RIPE','RIDE'],
  ['SAND','SEND','BAND','SANE'],['WIND','WING','WINE','WIDE'],
];
const WF_T2=[
  ['SWIFT','SHIFT','SNIFF','SWIRL'],['QUIET','QUITE','QUOTE','QUILT'],
  ['ANGEL','ANGLE','AGILE','ANKLE'],['BREAD','BEARD','BOARD','BRAND'],
  ['DAIRY','DIARY','DERBY','DIRTY'],['SACRED','SCARED','SEARED','SCORED'],
  ['MARBLE','RAMBLE','MARVEL','MANTLE'],['SILVER','SLIVER','SLIDER','SILKEN'],
  ['TRIAL','TRAIL','TRILL','TIDAL'],['BLAME','BLADE','BLARE','BLAZE'],
  ['STEAM','STEAK','STEAL','STEEL'],['GLARE','LARGE','GLAZE','GRACE'],
  ['CRATE','CARET','CATER','TRACE'],['SPARE','SPEAR','PARSE','SPADE'],
  ['POSE','PROSE','POISE','PURSE'],['NIGHT','RIGHT','NIGHTLY','MIGHT'],
];
const WF_T3=[
  ['THROUGH','TROUGH','THOROUGH','THOUGHT'],['PRECEDE','PROCEED','PRESIDE','PRECISE'],
  ['DESSERT','DESERTS','DISSENT','DISSECT'],['CONVERSE','CONSERVE','CONVERGE','CONVEYED'],
  ['ADAPTER','ADOPTER','ADAPTED','ADOPTED'],['LATERAL','LITERAL','LITERARY','LITERATE'],
  ['EMINENT','IMMINENT','EMIGRANT','ELEGANT'],['CRYSTAL','CRUCIAL','CYNICAL','CLINICAL'],
  ['PERSIST','PERSUADE','PERSPIRE','PERSONAL'],['DECLINE','DECLARE','DECIMAL','DECLAIM'],
  ['ILLUSION','ALLUSION','ELUSION','EVASION'],['STATIONARY','STATIONERY','STATIONS','SITUATION'],
  ['ACCEPT','EXCEPT','EXPECT','ACCESS'],['AFFECT','EFFECT','AFFLICT','EFFORT'],
  ['PRINCIPAL','PRINCIPLE','PRINCESS','PRINTING'],['COMPLEMENT','COMPLIMENT','COMPONENT','COMPLETE'],
];
function playWordFlash(body,setScore,end,wrap,startClock){
  let q=0,score=0,streak=0,bestStreak=0,fastest=null,correctCount=0,lives=3;
  const record=S('nz_wf_best')||0;
  // shuffled, recycling pools
  const pools={1:[...WF_T1].sort(()=>Math.random()-.5),2:[...WF_T2].sort(()=>Math.random()-.5),3:[...WF_T3].sort(()=>Math.random()-.5)};
  const used={1:0,2:0,3:0};
  function takeGroup(tier){const p=pools[tier];const g=p[used[tier]%p.length];used[tier]++;if(used[tier]%p.length===0)p.sort(()=>Math.random()-.5);return g;}
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;"><strong>Word Flash ♾️</strong><br>Word ek flash mein dikhega — distractors bilkul similar honge! Endless: jab tak 3 lives hain khelte raho.<br><span style="font-size:11px;color:var(--primary);">Q8+ DECOY MODE: 2 words · ⚡ &lt;500ms = bonus · ❌ galat = -1 life</span>${record?`<div style="margin-top:6px;font-size:12px;font-weight:700;color:var(--mint);">🏆 Best: ${record} pts</div>`:''}<br>
  <button style="margin-top:10px;padding:12px 28px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="wfStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);
  function heartsHtml(){return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;}
  function gameOver(){
    const acc=q?Math.round(correctCount/q*100):0;
    const newPB=score>record;
    if(newPB)setS('nz_wf_best',score);
    setS('nz_wf_games',(S('nz_wf_games')||0)+1);
    if(newPB)confetti(50);
    end({title:newPB?'New Best! 🏆':'Word Flash 📝',emoji:'📝',sub:`${score} pts · ${q} rounds · ${acc}%`,value:score,points:Math.max(2,score*0.7),starThresh:[20,40,70],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${score} pts</span></div>
        <div class="row"><span>Rounds Survived</span><span class="val">${q}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${acc}% (${correctCount}/${q})</span></div>
        <div class="row"><span>Fastest Response</span><span class="val">${fastest!==null?fastest+'ms':'—'}</span></div>
        <div class="row"><span>Longest Streak</span><span class="val">${bestStreak} 🔥</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div>
      </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`});
  }
  function next(){
    if(lives<=0){gameOver();return;}
    // difficulty scales endlessly with round
    const tier=q<5?1:q<11?2:3;
    const flashMs=Math.max(380,900-q*40);
    const decoy=q>=7;
    const group=takeGroup(tier);
    let words=[group[0]],askSide=0,group2=null;
    if(decoy){
      group2=takeGroup(tier);
      words=[group[0],group2[0]];
      askSide=Math.random()<0.5?0:1;
    }
    const askGroup=decoy&&askSide===1?group2:group;
    const askWord=askGroup[0];
    host.innerHTML=`
      ${heartsHtml()}
      <div class="wf-stage">
        <div class="wf-bar"><div class="wf-bar-fill" id="wfBar"></div></div>
        <div class="wf-words">${words.map(w=>`<div class="wf-word" style="font-size:${decoy?'26px':'48px'};">${w}</div>`).join('')}</div>
        ${decoy?'<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:10px;letter-spacing:.12em;font-weight:700;">DECOY MODE — DONO YAAD RAKHO!</div>':''}
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text2);margin-top:8px;">Round ${q+1} · ${flashMs}ms flash${streak>=3?' · 🔥 x1.5':''}</div>`;
    const bar=host.querySelector('#wfBar');
    requestAnimationFrame(()=>{requestAnimationFrame(()=>{if(bar){bar.style.transition=`width ${flashMs}ms linear`;bar.style.width='0%';}});});
    _st(()=>{
      const stage=host.querySelector('.wf-stage');
      if(stage){stage.style.transition='opacity .2s';stage.style.opacity='0';}
      _st(()=>{
        const opts=[...askGroup].sort(()=>Math.random()-.5);
        const askTs=Date.now();
        host.innerHTML=`
          ${heartsHtml()}
          <div class="wf-stage" style="padding:22px 16px;">
            <div class="wf-word" style="font-size:44px;">?</div>
            ${decoy?`<div style="font-size:12px;color:#A78BFA;font-weight:700;margin-top:6px;">${askSide===0?'⬅ LEFT':'RIGHT ➡'} wala word kaunsa tha?</div>`:''}
          </div>
          <div class="word-opts" id="wOpts" style="margin-top:14px;"></div>
          <div style="text-align:center;font-size:12px;color:var(--text2);margin-top:8px;">Round ${q+1}${streak>=3?' · 🔥 STREAK x1.5':''}</div>`;
        const optsEl=host.querySelector('#wOpts');
        opts.forEach(w=>{
          const b=$(`<button class="word-opt" data-w="${w}">${w}</button>`);
          b.onclick=()=>{
            optsEl.querySelectorAll('.word-opt').forEach(bb=>bb.disabled=true);
            const ms=Date.now()-askTs;
            if(b.dataset.w===askWord){
              playSound('correct');correctCount++;
              const fast=ms<500;
              if(fastest===null||ms<fastest)fastest=ms;
              let pts=fast?3:2;
              streak++;if(streak>bestStreak)bestStreak=streak;
              if(streak===3)showCombo('+STREAK BONUS x1.5');
              if(streak>=3)pts=Math.round(pts*1.5);
              if(fast)showCombo('⚡ SPEED DEMON!');
              score+=pts;setScore(score);
              b.classList.add('wf-correct');
              q++;_st(next,600);
            } else {
              playSound('wrong');streak=0;haptic([30,50,30]);
              b.classList.add('wf-wrong');
              optsEl.querySelectorAll('.word-opt').forEach(bb=>{if(bb.dataset.w===askWord)bb.classList.add('wf-correct');});
              lives--;toast('❌ -1 Life');
              q++;_st(next,800);
            }
          };
          optsEl.appendChild(b);
        });
      },200);
    },flashMs);
  }
  instrEl.querySelector('#wfStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
}

/* ===================== WORD CHAIN 2.0 (endless) ===================== */
const WC_WORDS=['Apple','Chair','River','Cloud','Music','Tiger','Bread','Stone','Light','Phone','Dream','Water','House','Paper','Green','Earth','Smile','Train','Dance','Maple','Ocean','Clock','Flame','Brain','Sugar','Grass','Pilot','Queen','Frost','Arrow','Lemon','Storm','Movie','Brush','Radio','Pearl','Eagle','Comet','Prize','Unity','Honey','Cabin','Glove','Torch','Wheat','Coral','Piano','Robin','Maze','Vault','Bloom','Crane','Drift','Ember','Fable','Glide','Harbor','Ivory','Jolly','Kite','Lunar','Meadow','Nectar','Onyx','Plume','Quartz','Ridge','Spark','Tide','Vivid','Whale','Zephyr','Amber','Birch','Cedar','Dune','Falcon','Gravel','Hamlet','Igloo','Jungle','Knot','Lantern','Mirror','Noble','Orbit','Pebble','Quill','Raven','Sunset','Tunnel','Umbra','Viking','Walnut','Xenon','Yarrow','Zenith','Acorn','Blossom','Cactus','Fossil','Garnet','Heron','Jasper','Lapis','Mango','Nebula','Prism','Ripple','Sandal','Tundra','Velvet','Willow','Beacon','Cipher','Dagger','Elixir','Forage','Grotto','Impact','Jigsaw','Kernel','Luster','Mantle','Oasis','Paddle','Quarry','Rustle','Shrine','Talon','Vessel','Wander','Apex','Bronze','Canopy','Debris','Epoch','Flint','Glacier','Hollow','Ingot','Jewel','Locket','Mortar','Nomad','Ochre','Relic','Solace','Trophy','Vigil','Wraith','Blaze','Cobalt','Drake','Forge','Glyph','Helix','Joust','Lynx','Mirth','Nadir','Olive','Pixel','Resin','Scout','Ultra','Vapor','Weave','Exile','Abyss','Brink','Crisp','Delve','Fetch','Guise','Haste','Lyric','Mural','Niche','Optic','Prose','Realm','Stave','Trove','Unify','Verge','Wrath','Crest','Bluff','Shrine','Flame','Frost','Storm','Stone','Pearl','Cedar','Comet'];
function playNeuralChain(body,setScore,end,wrap,startClock){
  const FLASH_COLORS=['#7C3AED','#4F8EF7','#34D399'];
  const record=LS.get('nz_wordchain_record',0);
  let round=0,lives=3,totalScore=0,longest=0,mistakes=0;
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">
    <strong>Word Chain ♾️</strong><br>
    Words ek-ek karke flash honge — order yaad rakho, phir sahi order mein tap karo!<br>
    <span style="font-size:11px;color:var(--primary);">3 lives ❤️ · Endless — chain badhta jaayega · 5+ = 👻 distractor · 6+ = ⚡ SPEED</span>
    ${record>0?`<div style="margin-top:6px;font-size:12px;font-weight:700;color:var(--mint);">🏆 Personal Record: ${record}-word chain</div>`:''}
    <button style="margin-top:12px;padding:12px 28px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="wcStart">▶ Start</button>
  </div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);
  body.appendChild(host);
  function hudHtml(extra){
    const len=3+round;
    return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}" id="wcH${i}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>
    <div class="mm-roundrow"><span>Chain <strong>${len}</strong></span><span>Best <strong>${Math.max(record,longest)}</strong></span></div>
    ${extra||''}`;
  }
  function startRound(){
    const len=3+round;
    const speed=len>=6;
    const flashMs=speed?Math.max(420,600-(len-6)*30):800;
    const pool=[...WC_WORDS].sort(()=>Math.random()-.5);
    const chain=pool.slice(0,len);
    const distractor=len>=5?pool[len]:null;
    let idx=0;
    function flashWord(){
      const color=FLASH_COLORS[idx%3];
      host.innerHTML=hudHtml(`<div style="text-align:center;font-size:12px;color:var(--text2);margin-bottom:8px;">Chain ${len} — Word ${idx+1}/${len}${speed?' · ⚡ SPEED MODE':''}</div>`)+
        `<div class="wc-flash" style="background:${color};">${chain[idx]}</div>`;
      idx++;
      if(idx<len)_st(flashWord,flashMs);
      else _st(()=>showRecall(),flashMs);
    }
    function showRecall(){
      let opts=[...chain];
      if(distractor)opts.push(distractor);
      opts.sort(()=>Math.random()-.5);
      let tapped=0;
      host.innerHTML=hudHtml()+`
        <div style="text-align:center;font-size:13px;color:var(--text2);margin-bottom:8px;">Sahi order mein tap karo!${distractor?' <span style="color:#F97316;font-weight:700;">(1 distractor hai 👻)</span>':''}</div>
        <div style="min-height:44px;background:var(--card);border-radius:14px;padding:10px;margin-bottom:14px;box-shadow:var(--shadow);font-size:13px;font-weight:600;color:var(--primary);text-align:center;" id="wcSlots">
          ${chain.map((_,i)=>`<span id="wcSlot${i}" style="opacity:.3;">____</span>`).join(' → ')}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;" id="wcBtns">
          ${opts.map(w=>`<button class="wc-btn" data-w="${w}" style="padding:12px 18px;min-height:44px;background:var(--card);border-radius:12px;font-weight:600;font-size:14px;box-shadow:var(--shadow);border:2px solid var(--border);">${w}</button>`).join('')}
        </div>`;
      host.querySelectorAll('.wc-btn').forEach(btn=>{
        btn.onclick=()=>{
          if(btn.disabled)return;
          const w=btn.dataset.w;
          if(w===chain[tapped]){
            playSound('correct');
            btn.disabled=true;btn.style.opacity='.35';
            const slot=host.querySelector('#wcSlot'+tapped);
            if(slot){slot.textContent=w;slot.style.opacity='1';slot.style.color='#34D399';}
            tapped++;
            if(tapped>=len)roundComplete(len);
          } else {
            mistakes++;
            playSound('wrong');haptic([30,50,30]);
            btn.style.background='#F87171';btn.style.color='#fff';
            host.querySelectorAll('.wc-btn').forEach(b=>b.disabled=true);
            loseLife();
          }
        };
      });
    }
    flashWord();
  }
  function roundComplete(len){
    totalScore+=len;if(len>longest)longest=len;
    setScore(totalScore);
    showCombo('CHAIN COMPLETE! 🔗');
    playSound('complete');
    host.innerHTML=hudHtml()+`
      <div style="text-align:center;padding:24px 0;">
        <div style="display:inline-block;background:var(--grad);color:#fff;padding:14px 26px;border-radius:50px;font-weight:800;font-size:18px;box-shadow:var(--shadow-lg);animation:popIn .4s ease;">🔗 ${len}-WORD CHAIN · +${len}pts</div>
      </div>`;
    round++;
    _st(()=>startRound(),1300);
  }
  function loseLife(){
    lives--;
    showCombo('CHAIN BROKEN! 💔');
    const h=host.querySelector('#wcH'+lives);
    if(h){h.textContent='💔';h.classList.add('crack','lost');}
    if(lives<=0){_st(()=>finish(),1200);return;}
    _st(()=>startRound(),1400);
  }
  function finish(){
    const perfect=mistakes===0;
    let chainPts=totalScore;
    if(perfect)chainPts*=2;
    const livesBonus=lives*5;
    const final=chainPts+livesBonus;
    setScore(final);
    const newRec=longest>record;
    if(newRec)LS.set('nz_wordchain_record',longest);
    if(newRec)confetti(50);
    end({
      title:newRec?'New Record! 🏆':(lives>0?'Chain Master! 🔗':'Chain Over! 💔'),
      emoji:'🔗',
      sub:`Longest chain: ${longest} words${perfect?' · ✨ PERFECT x2':''}`,
      value:final,points:final*0.7,starThresh:[20,40,60],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Longest Chain</span><span class="val">${longest} words</span></div>
        <div class="row"><span>Chain Points${perfect?' (x2 perfect)':''}</span><span class="val">${chainPts}</span></div>
        <div class="row"><span>Lives Bonus</span><span class="val">+${livesBonus} (${lives} ❤️)</span></div>
        <div class="row"><span>Total Score</span><span class="val">${final}</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(longest,record)}${newRec?' 🏆':''}</span></div>
      </div>${newRec?'<div class="rec">New Personal Record! 🎉</div>':''}`
    });
  }
  instrEl.querySelector('#wcStart').onclick=()=>{instrEl.remove();startClock&&startClock();startRound();};
}

/* ===================== QUICK MATH ===================== */
/* Quick Math — endless survival. Modes + adaptive difficulty + combo + sudden death. */
const QM_MODES={
  easy:{label:'Easy',emoji:'🟢',sub:'Add / subtract',time:4000,ops:['+','-'],zen:false},
  medium:{label:'Medium',emoji:'🟡',sub:'× and ÷ included',time:3000,ops:['+','-','×','÷'],zen:false},
  hard:{label:'Hard',emoji:'🔴',sub:'2-step problems',time:2500,ops:['2step'],zen:false},
  algebra:{label:'Algebra',emoji:'⚡',sub:'Solve for x',time:2000,ops:['alg'],zen:false},
  zen:{label:'Zen',emoji:'🧘',sub:'No timer, no lives',time:0,ops:['+','-','×','÷'],zen:true},
};
function qmDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Answer 20 questions correctly',target:20},
    {label:'Reach a 10 answer streak',target:10,streak:true},
    {label:'Answer 30 questions correctly',target:30},
    {label:'Score 25+ in one run',target:25},
    {label:'Reach a 12 answer streak',target:12,streak:true},
  ];
  return defs[dayN%defs.length];
}
function qmDailyDone(){return S('nz_qm_daily_date')===todayKey()&&!!S('nz_qm_daily_done');}
function qmRank(score){
  if(score>=40)return{em:'👑',txt:'Math Legend'};
  if(score>=30)return{em:'⚡',txt:'Lightning Brain'};
  if(score>=20)return{em:'🧠',txt:'Math Wizard'};
  if(score>=10)return{em:'💪',txt:'Getting Sharper'};
  return{em:'🌱',txt:'Keep Practicing'};
}
/* Adaptive number scaling based on question index (1-based). */
function qmScale(qn){
  if(qn<=10)return{a:9,b:9,big:12};
  if(qn<=20)return{a:50,b:12,big:60};
  if(qn<=30)return{a:150,b:15,big:140};
  return{a:400,b:25,big:300};
}
function playMath(body,setScore,end,wrap,startClock){
  let mode='easy';
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const best=S('nz_qm_best_score')||0;
    const games=S('nz_qm_games')||0;
    const bestStreak=S('nz_qm_best_streak')||0;
    const accH=S('nz_qm_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=qmDailyChallenge();
    const dcDone=qmDailyDone();
    const screen=$(`<div class="qm-start"></div>`);
    screen.innerHTML=`
      <div class="qm-stats">
        <div class="qm-stat"><div class="v">${best}</div><div class="l">Best Score</div></div>
        <div class="qm-stat"><div class="v">${games}</div><div class="l">Games</div></div>
        <div class="qm-stat"><div class="v">${bestStreak}</div><div class="l">Best Streak</div></div>
        <div class="qm-stat"><div class="v">${avgAcc}%</div><div class="l">Accuracy</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="qm-mode-title">Choose a Mode</div>
      <div class="qm-modes" id="qmModes"></div>
      <button class="btn-primary" id="qmGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#qmModes');
    ['easy','medium','hard','algebra','zen'].forEach(k=>{
      const m=QM_MODES[k];
      const card=$(`<button class="qm-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-grid">${m.zen?'No timer':(m.time/1000)+'s / question'}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.qm-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#qmGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function genQuestion(qn){
    const m=QM_MODES[mode];
    const sc=qmScale(qn);
    const rnd=(n)=>Math.floor(Math.random()*n)+1;
    if(m.ops[0]==='alg'){
      const a=rnd(qn<=10?5:qn<=20?9:12)+1,x=rnd(qn<=20?9:15),b=rnd(qn<=10?9:20);
      return{display:`${a}x + ${b} = ${a*x+b},  x = ?`,correct:x};
    }
    if(m.ops[0]==='2step'){
      const a=rnd(Math.min(13,sc.b)),b=rnd(Math.min(13,sc.b)),c=rnd(sc.b);
      const add=Math.random()>0.5;
      const correct=add?a*b+c:a*b-c;
      return{display:`${a} × ${b} ${add?'+':'−'} ${c}`,correct};
    }
    const op=m.ops[Math.floor(Math.random()*m.ops.length)];
    if(op==='÷'){
      const d=rnd(Math.min(12,sc.b))+1,q2=rnd(Math.min(12,sc.b));
      return{display:`${d*q2} ÷ ${d}`,correct:q2};
    }
    if(op==='×'){
      const a=rnd(Math.min(sc.big,qn<=10?6:qn<=20?12:20)),b=rnd(Math.min(15,sc.b));
      return{display:`${a} × ${b}`,correct:a*b};
    }
    if(op==='-'){
      const a=rnd(sc.a)+rnd(sc.a),b=rnd(sc.a);
      const hi=Math.max(a,b),lo=Math.min(a,b);
      return{display:`${hi} − ${lo}`,correct:hi-lo};
    }
    const a=rnd(sc.a),b=rnd(sc.a);
    return{display:`${a} + ${b}`,correct:a+b};
  }

  function startGame(){
    const m=QM_MODES[mode];
    const zen=m.zen;
    const best=S('nz_qm_best_score')||0;
    let q=0,score=0,lives=zen?Infinity:3,streak=0,bestStreak=0,correctCount=0;
    let comboMult=1,sdMode=false,sdCount=0,sdSurvived=0,barTimer=null;
    body.innerHTML='';
    const host=$(`<div class="qm-play" style="position:relative;"></div>`);
    body.appendChild(host);

    function heartsHtml(){
      if(zen)return `<span class="qm-zen-tag">🧘 Zen — practice freely</span>`;
      return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;
    }

    function gameOver(){
      _cti(barTimer);wrap.classList.remove('fire-glow');
      const accuracy=q?Math.round(correctCount/q*100):0;
      const prevBest=S('nz_qm_best_score')||0;
      const newPB=score>prevBest;
      if(newPB)setS('nz_qm_best_score',score);
      setS('nz_qm_games',(S('nz_qm_games')||0)+1);
      if(bestStreak>(S('nz_qm_best_streak')||0))setS('nz_qm_best_streak',bestStreak);
      const accH=S('nz_qm_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_qm_accuracy',accH);
      // Daily challenge
      const dc=qmDailyChallenge();
      if(!qmDailyDone()){
        const pass=dc.streak?bestStreak>=dc.target:(correctCount>=dc.target||score>=dc.target);
        if(pass){setS('nz_qm_daily_date',todayKey());setS('nz_qm_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const sdBonus=sdSurvived>=5?40:0;
      const rank=qmRank(score);
      setScore(score);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Score ${score}${newPB?' · 🏆 New Best!':''}${sdBonus?' · ⚡ +'+sdBonus+' SD bonus':''}`,
        value:score,points:Math.max(2,score+Math.round(sdBonus/3)),starThresh:[10,20,35],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Questions Answered</span><span class="val">${q}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}% (${correctCount}/${q})</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,prevBest)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${Math.max(2,score+Math.round(sdBonus/3))}</span></div>
          ${sdBonus?'<div class="row"><span>⚡ Sudden Death Bonus</span><span class="val">+'+sdBonus+'</span></div>':''}
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    function loseLife(){
      if(zen)return;
      if(sdMode){lives=0;}else{lives--;}
      haptic([30,50,30]);
      host.classList.add('shake-anim');_st(()=>host.classList.remove('shake-anim'),450);
      streak=0;comboMult=1;wrap.classList.remove('fire-glow');
    }

    function next(){
      if(!zen&&lives<=0){_st(gameOver,650);return;}
      _cti(barTimer);
      q++;
      const qn=q;
      const {display,correct}=genQuestion(qn);
      // distractors
      const range=Math.max(Math.ceil(Math.abs(correct)*0.2),3);
      const used=new Set([correct]);const distract=[];let tries=0;
      while(distract.length<3&&tries<100){tries++;const d=correct+Math.floor(Math.random()*range*2+1)-range;if(d!==correct&&!used.has(d)){used.add(d);distract.push(d);}}
      while(distract.length<3)distract.push(correct+(distract.length+1)*2);
      const opts=[correct,...distract].sort(()=>Math.random()-.5);
      const timeMs=m.time;
      const comboLabel=comboMult===3?'🔥 x3':comboMult===2?'⚡ x2':'';
      host.innerHTML=`
        ${zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="mBar" style="width:100%"></div></div>'}
        ${heartsHtml()}
        <div class="qm-info">
          <span>Q: ${q}</span>
          <span>Best: ${Math.max(best,score)}</span>
          ${sdMode?'<span class="qm-sd">💀 SUDDEN DEATH</span>':comboLabel?`<span class="qm-combo">${comboLabel}</span>`:`<span>🔥 ${streak}</span>`}
        </div>
        <div class="qm-question">${display}</div>
        <div class="math-opts">${opts.map(v=>`<button class="math-opt" data-v="${v}">${v}</button>`).join('')}</div>`;
      if(!zen&&timeMs){
        let elapsed=0;
        barTimer=_si(()=>{
          elapsed+=100;
          const pct=Math.max(0,100-elapsed/timeMs*100);
          const bar=wrap.querySelector('#mBar');
          if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
          if(elapsed>=timeMs){_cti(barTimer);resolve(null,correct,opts);}
        },100);
      }
      host.querySelectorAll('.math-opt').forEach(btn=>{
        btn.onclick=()=>{_cti(barTimer);resolve(+btn.dataset.v,correct,opts,btn);};
      });
    }

    function resolve(chosen,correct,opts,btn){
      host.querySelectorAll('.math-opt').forEach(b=>b.disabled=true);
      const right=chosen===correct;
      if(right){
        playSound('correct');haptic(10);
        if(btn)btn.classList.add('correct-ans');
        correctCount++;streak++;if(streak>bestStreak)bestStreak=streak;
        const pts=comboMult;
        score+=pts;setScore(score);
        // combo tiers
        if(streak===3){comboMult=2;showCombo('COMBO x2');}
        if(streak===5){comboMult=3;wrap.classList.add('fire-glow');showCombo('ON FIRE 🔥');}
        // sudden death unlock
        if(streak===10&&!sdMode){sdMode=true;sdCount=0;toast('⚡ SUDDEN DEATH! One mistake = game over!');}
        if(sdMode){sdCount++;sdSurvived=sdCount;if(sdCount>=5){sdMode=false;sdCount=0;toast('✅ Survived Sudden Death! Back to normal');}}
        _st(next,zen?320:480);
      } else {
        playSound('wrong');
        if(btn)btn.classList.add('wrong-ans');
        host.querySelectorAll('.math-opt').forEach(b=>{if(+b.dataset.v===correct)b.classList.add('correct-ans');});
        loseLife();
        if(!zen&&lives<=0){_st(gameOver,800);return;}
        _st(next,zen?500:800);
      }
    }

    next();
  }
}

/* ===================== STROOP X ===================== */
function playStroopX(body,setScore,end,wrap,startClock){
  const COLORS=[{name:'Red',hex:'#EF4444'},{name:'Blue',hex:'#3B82F6'},{name:'Green',hex:'#22C55E'},{name:'Yellow',hex:'#EAB308'},{name:'Purple',hex:'#A855F7'}];
  const SHAPES=[{name:'Circle',sym:'●'},{name:'Square',sym:'■'},{name:'Triangle',sym:'▲'},{name:'Star',sym:'★'}];
  const record=S('nz_stroop_best')||0;
  let round=0,score=0,combo=0,maxCombo=0,lives=3;
  function livesHtml(){return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;}
  function gameOver(){
    const newPB=score>record;
    if(newPB)setS('nz_stroop_best',score);
    setS('nz_stroop_games',(S('nz_stroop_games')||0)+1);
    if(newPB)confetti(50);
    end({title:newPB?'New Best! 🏆':'Out of Lives! 🎨',emoji:'🎨',sub:`Score: ${score} pts · ${round} rounds`,value:score,points:Math.max(2,score*1.3),starThresh:[40,80,130],
      statsHtml:`<div class="end-stats"><div class="row"><span>Score</span><span class="val">${score}</span></div><div class="row"><span>Rounds Survived</span><span class="val">${round}</span></div><div class="row"><span>Max Combo</span><span class="val">${maxCombo}</span></div><div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div></div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`});
  }
  function loseLife(){
    lives--;
    host.classList.add('shake-anim');
    _st(()=>host.classList.remove('shake-anim'),450);
    if(lives<=0){
      _st(gameOver,900);
      return true;
    }
    return false;
  }
  const host=$(`<div style="text-align:center;padding:12px 0;"></div>`);
  body.appendChild(host);
  const btn=$(`<button class="start-btn">Tap to Start — Endless ❤️${record?' · 🏆 '+record:''}</button>`);
  body.appendChild(btn);
  btn.onclick=()=>{btn.remove();startClock&&startClock();nextRound();};
  function startBar(limit,onTimeout){
    let elapsed=0;
    const barT=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/limit*100);
      const bar=wrap.querySelector('#sBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=limit){_cti(barT);onTimeout();}
    },100);
    return barT;
  }
  function nextRound(){
    if(lives<=0){return;}
    const phase=round<10?1:round<16?2:3;
    const ts=Date.now();
    let barT=null;
    if(phase===1){
      // Phase 1: Classic color stroop (rounds 1-10)
      const word=COLORS[Math.floor(Math.random()*COLORS.length)];
      const ink=COLORS[Math.floor(Math.random()*COLORS.length)];
      const choices=[...COLORS].sort(()=>Math.random()-.5).slice(0,4);
      if(!choices.find(c=>c.name===ink.name))choices[0]=ink;
      choices.sort(()=>Math.random()-.5);
      host.innerHTML=`
        <div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>
        ${livesHtml()}
        <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">Round ${round+1} · Phase 1 — INK ka rang tap karo!</div>
        ${combo>=3?`<div style="font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:4px;">🔥 Combo ×1.5</div>`:''}
        <div style="font-size:52px;font-weight:900;color:${ink.hex};margin:14px 0;">${word.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:280px;margin:0 auto;">
          ${choices.map(c=>`<button class="math-opt stroop-opt" style="background:${c.hex};color:#fff;font-weight:700;border:none;" data-name="${c.name}">${c.name}</button>`).join('')}
        </div>`;
      barT=startBar(3000,()=>{
        combo=0;round++;
        host.innerHTML+=`<div style="font-size:12px;color:#EF4444;margin-top:8px;">⏱ Too slow! Ink: <strong style="color:${ink.hex}">${ink.name}</strong></div>`;
        _st(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          _cti(barT);const ms=Date.now()-ts;
          if(b.dataset.name===ink.name){
            playSound('correct');const pts=ms<1000?3:ms<2000?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.outline='3px solid #fff';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts}${combo>=3?' 🔥':''}</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Ink: <strong style="color:${ink.hex}">${ink.name}</strong></div>`;
            if(loseLife())return;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;_st(nextRound,700);
        };
      });
    } else if(phase===2){
      // Phase 2: Shape stroop (rounds 11-15) — symbol shown, name is different; tap SYMBOL shape
      const wordShape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
      let dispShape=wordShape;while(dispShape===wordShape)dispShape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
      const inkColor=COLORS[Math.floor(Math.random()*COLORS.length)];
      const choices=[...SHAPES].sort(()=>Math.random()-.5);
      host.innerHTML=`
        <div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>
        ${livesHtml()}
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">Round ${round+1} · Phase 2 — Jo SHAPE dikhti hai, usse tap karo!</div>
        <div style="font-size:64px;font-weight:900;color:${inkColor.hex};margin:10px 0;">${dispShape.sym}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">(Word: "${wordShape.name}" — IGNORE karo)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:280px;margin:0 auto;">
          ${choices.map(s=>`<button class="math-opt stroop-opt" style="font-size:20px;font-weight:700;border:2px solid var(--border);" data-name="${s.name}">${s.sym} ${s.name}</button>`).join('')}
        </div>`;
      barT=startBar(2500,()=>{
        combo=0;round++;
        host.innerHTML+=`<div style="font-size:12px;color:#EF4444;margin-top:8px;">⏱ It was ${dispShape.sym} ${dispShape.name}!</div>`;
        _st(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          _cti(barT);const ms=Date.now()-ts;
          if(b.dataset.name===dispShape.name){
            playSound('correct');const pts=ms<1000?3:ms<1500?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.background='#22C55E';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts} Correct Shape!</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Was: ${dispShape.sym} ${dispShape.name}</div>`;
            if(loseLife())return;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;_st(nextRound,700);
        };
      });
    } else {
      // Phase 3: Mixed (rounds 16-30) — 3 choices, asks COLOR or SHAPE randomly
      const askColor=Math.random()>0.5;
      const inkColor=COLORS[Math.floor(Math.random()*COLORS.length)];
      const dispShape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
      const decoyWord=askColor?SHAPES[Math.floor(Math.random()*SHAPES.length)].name:COLORS[Math.floor(Math.random()*COLORS.length)].name;
      const target=askColor?inkColor.name:dispShape.name;
      let choices3;
      if(askColor){
        choices3=[...COLORS].sort(()=>Math.random()-.5).slice(0,3);
        if(!choices3.find(c=>c.name===inkColor.name))choices3[0]=inkColor;
        choices3.sort(()=>Math.random()-.5);
      } else {
        choices3=[...SHAPES].sort(()=>Math.random()-.5).slice(0,3);
        if(!choices3.find(s=>s.name===dispShape.name))choices3[0]=dispShape;
        choices3.sort(()=>Math.random()-.5);
      }
      host.innerHTML=`
        <div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>
        ${livesHtml()}
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">Round ${round+1} · Phase 3</div>
        <div style="font-size:13px;font-weight:700;color:${askColor?'#A78BFA':'#34D399'};margin-bottom:6px;">${askColor?'🎨 INK COLOR kya hai?':'🔷 SHAPE kya dikhti hai?'}</div>
        <div style="font-size:58px;font-weight:900;color:${inkColor.hex};margin:6px 0;">${dispShape.sym}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">(Text: "${decoyWord}")</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;max-width:290px;margin:0 auto;">
          ${askColor
            ?choices3.map(c=>`<button class="math-opt stroop-opt" style="background:${c.hex};color:#fff;font-size:12px;padding:8px 4px;font-weight:700;border:none;" data-name="${c.name}">${c.name}</button>`).join('')
            :choices3.map(s=>`<button class="math-opt stroop-opt" style="font-size:22px;font-weight:700;border:2px solid var(--border);" data-name="${s.name}">${s.sym}</button>`).join('')
          }
        </div>`;
      barT=startBar(2000,()=>{
        combo=0;round++;
        host.innerHTML+=`<div style="font-size:12px;color:#EF4444;margin-top:8px;">⏱ Answer: ${target}</div>`;
        _st(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          _cti(barT);const ms=Date.now()-ts;
          if(b.dataset.name===target){
            playSound('correct');const pts=ms<800?3:ms<1500?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.outline='3px solid #22C55E';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts}${combo>=3?' 🔥':''}</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Answer: ${target}</div>`;
            if(loseLife())return;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;_st(nextRound,700);
        };
      });
    }
  }
}

/* ===================== IQ TEST v3 (completely rebuilt — 15 Qs, 60 pool, fair IQ) ===================== */
const IQ_POOL=[
  /* ---- NUMERICAL (14 questions) ---- */
  {q:'🔢 Series: 2, 4, 8, 16, __ = ?',opts:['24','32','20','28'],ans:1,cat:'numerical',diff:'easy',exp:'×2 har baar: 16×2 = 32'},
  {q:'🔢 Series: 1, 4, 9, 16, 25, __ = ?',opts:['30','36','35','49'],ans:1,cat:'numerical',diff:'easy',exp:'Perfect squares: 6² = 36'},
  {q:'🔢 Series: 3, 6, 11, 18, 27, __ = ?',opts:['36','38','40','35'],ans:1,cat:'numerical',diff:'medium',exp:'Differences +3,+5,+7,+9,+11 → 27+11 = 38'},
  {q:'🔢 Fibonacci: 1, 1, 2, 3, 5, 8, 13, __ = ?',opts:['18','21','20','19'],ans:1,cat:'numerical',diff:'easy',exp:'8+13 = 21 (sum of previous two)'},
  {q:'🔢 Series: 1, 2, 6, 24, 120, __ = ?',opts:['600','720','480','240'],ans:1,cat:'numerical',diff:'hard',exp:'Factorials! 120×6 = 720'},
  {q:'🔢 Series: 100, 50, 25, 12.5, __ = ?',opts:['5','6.25','8','10'],ans:1,cat:'numerical',diff:'medium',exp:'÷2 har baar: 12.5÷2 = 6.25'},
  {q:'🔢 25% of 480 = ?',opts:['96','120','100','112'],ans:1,cat:'numerical',diff:'easy',exp:'480÷4 = 120'},
  {q:'🔢 Ek train 75 km/h se 3 ghante chalti hai. Total doori?',opts:['200km','225km','250km','300km'],ans:1,cat:'numerical',diff:'easy',exp:'75×3 = 225 km'},
  {q:'🔢 Ek kaam 12 aadmi 10 din mein karte hain. 15 aadmi kitne din mein?',opts:['6','7','8','9'],ans:2,cat:'numerical',diff:'hard',exp:'12×10 = 120 man-days; 120÷15 = 8 din'},
  {q:'🔢 Kaunse number ka cube 125 hai?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'5³ = 5×5×5 = 125'},
  {q:'🔢 Ek circular track ka circumference 440m. Diameter kitna? (π=22/7)',opts:['100m','120m','140m','160m'],ans:2,cat:'numerical',diff:'hard',exp:'C=πd → d=440×7/22 = 140m'},
  {q:'🔢 3x + 5 = 20. x = ?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'3x=15 → x=5'},
  {q:'🔢 Series: 5, 10, 20, 40, __ = ?',opts:['60','70','80','90'],ans:2,cat:'numerical',diff:'easy',exp:'×2 each: 40×2 = 80'},
  {q:'🔢 Agar 15% discount hai ₹800 pe, to price?',opts:['₹660','₹680','₹700','₹640'],ans:1,cat:'numerical',diff:'medium',exp:'800×0.15=120; 800-120=₹680'},

  /* ---- LOGIC (12 questions) ---- */
  {q:'🧠 Neha, Priya se 3 saal badi hai. 5 saal baad Priya 20 saal hogi. Abhi Neha ki umar?',opts:['15','16','18','20'],ans:2,cat:'logic',diff:'medium',exp:'Priya abhi=15; Neha=15+3=18'},
  {q:'🧠 3 cats 3 mice 3 minutes mein pakadti hain. 9 mice 9 minutes mein — kitni cats chahiye?',opts:['9','3','6','1'],ans:1,cat:'logic',diff:'medium',exp:'1 cat=1 mouse/3min, so 3 cats kaafi hain'},
  {q:'🧠 Sab roses flowers hain. Kuch flowers jaldi fade ho jaate hain. Isliye:',opts:['Sab roses fade honge','Koi rose fade nahi hoga','Kuch roses fade ho sakti hain','Roses flowers nahi hain'],ans:2,cat:'logic',diff:'hard',exp:'Valid inference: kuch roses fade ho sakti hain'},
  {q:'🧠 Aaj Monday hai. 100 din baad kaunsa day hoga?',opts:['Tuesday','Wednesday','Thursday','Friday'],ans:1,cat:'logic',diff:'medium',exp:'100 = 14×7 + 2; Mon+2 = Wednesday'},
  {q:'🧠 Ek ghadi din mein 4 min fast ho jaati hai. Agar 6:00 AM pe sahi thi, to kaun se real time pe 6:08 AM dikhayegi?',opts:['6:05 AM','6:06 AM','6:07 AM','6:08 AM'],ans:1,cat:'logic',diff:'hard',exp:'4min/1440min×real mins; real time=6:06 AM approx'},
  {q:'🧠 5 logon ki row mein Ram 2nd aur right se 4th hai. Row mein kitne log hain?',opts:['5','6','7','8'],ans:0,cat:'logic',diff:'medium',exp:'Left se 2nd + Right se 4th - 1 = 2+4-1 = 5'},
  {q:'🧠 Agar "PENCIL" ko GDQFLP likhte hain, to "PAPER" ka code?',opts:['SDQHU','SDSHQ','SDSHV','SDQHV'],ans:0,cat:'logic',diff:'hard',exp:'+3 each letter: P+3=S, A+3=D, P+3=S, E+3=H, R+3=U = SDSHU'},
  {q:'🧠 Ek shop mein 40% discount hai. Original price ₹1500. Discounted price?',opts:['₹850','₹900','₹950','₹1050'],ans:1,cat:'logic',diff:'medium',exp:'1500×0.40=600; 1500-600=₹900'},
  {q:'🧠 Ek number ko 5 se multiply karo, phir 8 ghataao, to 42. Number?',opts:['8','9','10','11'],ans:2,cat:'logic',diff:'easy',exp:'5n-8=42 → 5n=50 → n=10'},
  {q:'🧠 24 June ka age se 7 days pehle wala day?',opts:['16 June','17 June','18 June','19 June'],ans:1,cat:'logic',diff:'easy',exp:'24-7=17 June'},
  {q:'🧠 A, B se tez hai. C, A se tez hai. Sabse tez kaun?',opts:['A','B','C','Sab equal'],ans:2,cat:'logic',diff:'easy',exp:'C > A > B; C sabse tez hai'},
  {q:'🧠 2 pipes ek tank bharte hain. Pipe A 6h mein, Pipe B 4h mein. Dono saath mein?',opts:['2h','2.4h','3h','3.6h'],ans:1,cat:'logic',diff:'hard',exp:'1/6+1/4=5/12; 12/5=2.4 hours'},

  /* ---- VERBAL (10 questions) ---- */
  {q:'📚 BOOK : READING :: FORK : ?',opts:['Kitchen','Eating','Spoon','Metal'],ans:1,cat:'verbal',diff:'easy',exp:'Book reading ke liye hai, fork eating ke liye'},
  {q:'📚 HOT : COLD :: DARK : ?',opts:['Night','Black','Light','Moon'],ans:2,cat:'verbal',diff:'easy',exp:'Opposites: hot↔cold, dark↔light'},
  {q:'📚 Odd one out: Apple, Mango, Carrot, Banana',opts:['Apple','Mango','Carrot','Banana'],ans:2,cat:'verbal',diff:'easy',exp:'Carrot ek sabzi hai, baaki fruits'},
  {q:'📚 Odd one out: Violin, Guitar, Flute, Sitar',opts:['Violin','Guitar','Flute','Sitar'],ans:2,cat:'verbal',diff:'medium',exp:'Flute wind instrument hai; baki string instruments'},
  {q:'📚 "Ephemeral" ka matlab?',opts:['Permanent','Very brief','Heavy','Brilliant'],ans:1,cat:'verbal',diff:'hard',exp:'Ephemeral = lasting a very short time (kuch ghante/din)'},
  {q:'📚 "Benevolent" ka matlab?',opts:['Angry','Mean','Kind/Generous','Lazy'],ans:2,cat:'verbal',diff:'medium',exp:'Benevolent = well-meaning, generous, kind'},
  {q:'📚 Agar CIPHER ko reverse karo to?',opts:['REHPIC','REPHIC','RHEPIC','REPIHC'],ans:0,cat:'verbal',diff:'medium',exp:'C-I-P-H-E-R reversed = R-E-H-P-I-C'},
  {q:'📚 PEN : INK :: LAMP : ?',opts:['Switch','Bulb','Light','Electricity'],ans:3,cat:'verbal',diff:'medium',exp:'Pen ink se chalta hai, lamp electricity se'},
  {q:'📚 DOCTOR : HOSPITAL :: TEACHER : ?',opts:['Student','Book','School','Class'],ans:2,cat:'verbal',diff:'easy',exp:'Doctor hospital mein kaam karta, teacher school mein'},
  {q:'📚 "Laconic" ka matlab?',opts:['Talkative','Very brief','Funny','Serious'],ans:1,cat:'verbal',diff:'hard',exp:'Laconic = using very few words, concise'},

  /* ---- PATTERN (12 questions) ---- */
  {q:'🔡 Letter series: A, C, E, G, __ = ?',opts:['H','I','J','K'],ans:1,cat:'pattern',diff:'easy',exp:'+2 skip har baar: G ke baad I'},
  {q:'🔡 Letter series: Z, X, V, T, __ = ?',opts:['P','Q','R','S'],ans:2,cat:'pattern',diff:'medium',exp:'-2 har baar: T ke baad R'},
  {q:'🔡 Series: AZ, BY, CX, __ = ?',opts:['DV','DW','EW','DX'],ans:1,cat:'pattern',diff:'medium',exp:'Aage A→D; Peeche Z→W → DW'},
  {q:'🔡 Pattern: 1A, 2B, 3C, 4D, __ = ?',opts:['5E','5F','6E','4E'],ans:0,cat:'pattern',diff:'easy',exp:'Number +1, letter next → 5E'},
  {q:'🔡 Series: J, F, M, A, M, J, J, __ (months)',opts:['A','S','O','N'],ans:0,cat:'pattern',diff:'medium',exp:'Jan,Feb,Mar,Apr,May,Jun,Jul → August = A'},
  {q:'🔡 Number+letter: 2B, 4D, 6F, 8H, __ = ?',opts:['9I','10I','10J','12J'],ans:2,cat:'pattern',diff:'medium',exp:'+2 number, +2 letter: 8+2=10, H+2=J → 10J'},
  {q:'🔡 Series: 1, 1, 2, 3, 5, 8, 13, 21, __ = ?',opts:['30','34','32','28'],ans:1,cat:'pattern',diff:'medium',exp:'Fibonacci: 13+21 = 34'},
  {q:'🔡 Letter-number: A1, C3, E5, G7, __ = ?',opts:['H8','I8','I9','J10'],ans:2,cat:'pattern',diff:'medium',exp:'+2 letter, +2 number: G+2=I, 7+2=9 → I9'},
  {q:'🔡 Series: ▲□▲▲□□▲▲▲□□□ __ = ?',opts:['▲▲▲▲','□□□□','▲□□□','□▲▲▲'],ans:0,cat:'pattern',diff:'hard',exp:'1,2,3,4 pattern: 4 triangles come next'},
  {q:'🔡 Series: 2, 3, 5, 7, 11, 13, __ = ?',opts:['15','17','14','16'],ans:1,cat:'pattern',diff:'medium',exp:'Prime numbers series: next prime after 13 = 17'},
  {q:'🔡 Series: Monday, Wednesday, Friday, __ = ?',opts:['Saturday','Sunday','Tuesday','Thursday'],ans:1,cat:'pattern',diff:'easy',exp:'Skip 1 day: +2 each time → Sunday'},
  {q:'🔡 Code: if 3→9, 4→16, 5→25, then 7→?',opts:['42','47','49','56'],ans:2,cat:'pattern',diff:'easy',exp:'n² pattern: 7² = 49'},

  /* ---- SPATIAL (12 questions) ---- */
  {q:'📐 Ek square ka perimeter 48cm hai. Area kitna?',opts:['96cm²','128cm²','144cm²','196cm²'],ans:2,cat:'spatial',diff:'medium',exp:'Side=48÷4=12; Area=12²=144cm²'},
  {q:'📐 Ek triangle ke 2 angles 60° aur 75° hain. Teesra angle?',opts:['35°','40°','45°','50°'],ans:2,cat:'spatial',diff:'easy',exp:'180-60-75 = 45°'},
  {q:'📐 Ek cube ke kitne faces hote hain?',opts:['4','6','8','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 6 faces (top, bottom, front, back, left, right)'},
  {q:'📐 Ek cube ke kitne vertices (corners)?',opts:['6','8','10','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 8 corners (vertices)'},
  {q:'📐 Ek rectangle 12×5 ka diagonal kitna?',opts:['11','12','13','14'],ans:2,cat:'spatial',diff:'medium',exp:'√(12²+5²) = √(144+25) = √169 = 13'},
  {q:'📐 Ghadi mein 6:00 baje hour aur minute hand ke beech angle?',opts:['90°','120°','150°','180°'],ans:3,cat:'spatial',diff:'easy',exp:'6:00 pe dono ek doosre ke opposite = 180°'},
  {q:'📐 Ek cylinder ki height 10cm, radius 7cm. Volume? (π=22/7)',opts:['1540cm³','1520cm³','1460cm³','1610cm³'],ans:0,cat:'spatial',diff:'hard',exp:'πr²h = 22/7×49×10 = 1540cm³'},
  {q:'📐 "MAPS" ka mirror image kya hoga?',opts:['SPAM','SPAM','SMAP','MAPS'],ans:1,cat:'spatial',diff:'medium',exp:'Mirror image = reverse: M-A-P-S → S-P-A-M'},
  {q:'📐 Ek kagaz ko 3 baar fold karo. Kitni layers?',opts:['6','8','9','12'],ans:1,cat:'spatial',diff:'medium',exp:'2³ = 8 layers'},
  {q:'📐 Ghadi mein 3:00 baje hour aur minute hand ke beech angle?',opts:['60°','75°','90°','120°'],ans:2,cat:'spatial',diff:'easy',exp:'3:00 pe = 3×30° = 90°'},
  {q:'📐 Ek hexagon ke kitne sides?',opts:['5','6','7','8'],ans:1,cat:'spatial',diff:'easy',exp:'Hexagon = 6 sides (hexa = 6)'},
  {q:'📐 Ek regular octagon ke interior angles ka sum?',opts:['900°','1080°','1260°','720°'],ans:1,cat:'spatial',diff:'hard',exp:'(n-2)×180 = 6×180 = 1080°'},
];
const IQ_CATS={
  logic:{label:'🧠 Logic',color:'#7C3AED'},
  numerical:{label:'🔢 Numerical',color:'#4F8EF7'},
  verbal:{label:'📚 Verbal',color:'#34D399'},
  spatial:{label:'📐 Spatial',color:'#F97316'},
  pattern:{label:'🔡 Pattern',color:'#F472B6'}
};
const IQ_DIFF_W={easy:1,medium:1.8,hard:3.0};
const IQ_TIMER={easy:30000,medium:22000,hard:16000};
const IQ_N=15; // 15 questions per test, from pool of 60

function iqClassify(iq){
  if(iq>=145)return{label:'🌟 Genius',pct:99,color:'#F97316'};
  if(iq>=130)return{label:'⚡ Very Superior',pct:98,color:'#7C3AED'};
  if(iq>=120)return{label:'🏆 Superior',pct:91,color:'#4F8EF7'};
  if(iq>=110)return{label:'🧠 Above Average',pct:75,color:'#34D399'};
  if(iq>=90)return{label:'💪 Average',pct:50,color:'#22C55E'};
  if(iq>=80)return{label:'📈 Below Average',pct:25,color:'#EAB308'};
  return{label:'🌱 Keep Practicing',pct:10,color:'#94A3B8'};
}

function playIQTest(body,setScore,end,wrap,startClock){
  // Shuffle pool and pick balanced 15 Qs (3 easy, 7 medium, 5 hard across categories)
  function buildTestSet(){
    const byDiff={easy:[],medium:[],hard:[]};
    IQ_POOL.forEach(q=>{const d=q.diff||'medium';if(byDiff[d])byDiff[d].push(q);});
    byDiff.easy.sort(()=>Math.random()-.5);
    byDiff.medium.sort(()=>Math.random()-.5);
    byDiff.hard.sort(()=>Math.random()-.5);
    return [...byDiff.easy.slice(0,3),...byDiff.medium.slice(0,7),...byDiff.hard.slice(0,5)].sort(()=>Math.random()-.5);
  }
  const QS=buildTestSet();
  let qi=0,correct=0,weightSum=0,weightGot=0,speedSum=0,speedCount=0,fastest=null;
  const catStats={};
  Object.keys(IQ_CATS).forEach(c=>catStats[c]={got:0,total:0});

  const bestIQ=S('nz_iq_best')||0;

  // ---- Intro screen ----
  const introEl=$(`<div class="iq-intro"></div>`);
  introEl.innerHTML=`
    <div class="iq-intro-hero">
      <div style="font-size:60px;margin-bottom:8px;">🧩</div>
      <h2 style="margin:0 0 8px;">IQ Test</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5;">
        ${IQ_N} questions · Logic · Numerical · Verbal · Spatial · Pattern
      </p>
      ${bestIQ?`<div class="iq-best-chip">🏆 Your Best IQ: ${bestIQ}</div>`:''}
    </div>
    <div class="iq-intro-rules">
      <div class="iq-rule"><span>⏱</span><span>Timer per question (faster = better score)</span></div>
      <div class="iq-rule"><span>🎯</span><span>Hard questions = 3× more IQ points</span></div>
      <div class="iq-rule"><span>💡</span><span>Explanation shown after every answer</span></div>
      <div class="iq-rule"><span>📊</span><span>Category breakdown at the end</span></div>
    </div>
    <div class="iq-cat-preview">
      ${Object.entries(IQ_CATS).map(([,v])=>`<span class="iq-cat-chip-sm" style="background:${v.color}22;color:${v.color};border:1px solid ${v.color}44;">${v.label}</span>`).join('')}
    </div>
    <button class="btn-primary" id="iqStart" style="width:100%;margin-top:20px;padding:16px;font-size:16px;">
      Start Test ▶
    </button>
  `;
  body.appendChild(introEl);

  const host=$(`<div class="iq-host"></div>`);
  body.appendChild(host);

  introEl.querySelector('#iqStart').onclick=()=>{
    introEl.style.animation='fadeOut .2s ease forwards';
    setTimeout(()=>{introEl.remove();startClock&&startClock();showQ();},200);
  };

  function finish(){
    const wAcc=weightSum?weightGot/weightSum:0;
    // Speed factor: how fast relative to timer
    const speedFactor=speedCount?Math.max(0,Math.min(1,1-(speedSum/speedCount))):0.5;
    // IQ formula: base 70, accuracy contributes 0-70 pts, speed contributes 0-20 pts
    let iq=Math.round(70+wAcc*70+speedFactor*20);
    iq=Math.max(60,Math.min(155,iq));
    const cls=iqClassify(iq);
    const prevBest=S('nz_iq_best')||0;
    const newPB=iq>prevBest;
    if(newPB)setS('nz_iq_best',iq);
    setS('nz_iq_games',(S('nz_iq_games')||0)+1);
    setScore(iq);
    if(newPB||iq>=120)confetti(70);

    const catRows=Object.keys(catStats).filter(c=>catStats[c].total>0).map(c=>{
      const st=catStats[c];
      const pctv=Math.round(st.got/st.total*100);
      const col=IQ_CATS[c].color;
      return`<div class="iq-cat-row">
        <span class="iq-cat-name" style="color:${col}">${IQ_CATS[c].label}</span>
        <span class="iq-cat-bar"><span class="iq-cat-fill" style="width:${pctv}%;background:${col}"></span></span>
        <span class="iq-cat-val">${st.got}/${st.total}</span>
      </div>`;
    }).join('');

    const gPct=Math.round((iq-60)/(155-60)*100);
    const circ=Math.round(2*Math.PI*52);
    const gauge=`<div class="iq-gauge">
      <svg width="150" height="150" viewBox="0 0 120 120" style="transform:rotate(-90deg);">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
        <circle id="iqArc" cx="60" cy="60" r="52" fill="none" stroke="url(#iqG)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/>
        <defs><linearGradient id="iqG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${cls.color}"/>
          <stop offset="1" stop-color="#34D399"/>
        </linearGradient></defs>
      </svg>
      <div class="iq-gauge-inner">
        <div class="iq-gauge-num" id="iqNum">0</div>
        <div class="iq-gauge-lbl">IQ</div>
      </div>
    </div>`;

    end({
      title:cls.label,emoji:'🧩',
      sub:`Top ${100-cls.pct}% · ${correct}/${IQ_N} correct${newPB?' · 🏆 New Best!':''}`,
      value:iq,points:Math.max(3,Math.round((iq-60)*0.35)),starThresh:[90,110,130],
      statsHtml:`
        ${gauge}
        <div class="end-stats">
          <div class="row"><span>Estimated IQ</span><span class="val" style="color:${cls.color};font-weight:800;">${iq}</span></div>
          <div class="row"><span>Classification</span><span class="val">${cls.label}</span></div>
          <div class="row"><span>Percentile</span><span class="val">Top ${100-cls.pct}%</span></div>
          <div class="row"><span>Correct</span><span class="val">${correct}/${IQ_N}</span></div>
          <div class="row"><span>Fastest Answer</span><span class="val">${fastest!=null?(fastest/1000).toFixed(1)+'s':'—'}</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(iq,prevBest)}${newPB?' 🏆':''}</span></div>
        </div>
        <div class="iq-cats">
          <div class="iq-cats-title">📊 Category Performance</div>
          ${catRows}
        </div>
        ${newPB?'<div class="rec">🎉 New Best IQ Score!</div>':''}
      `
    });

    _st(()=>{
      const arc=wrap.querySelector('#iqArc');
      const num=wrap.querySelector('#iqNum');
      if(arc){arc.style.transition='stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)';arc.style.strokeDashoffset=circ*(1-gPct/100);}
      if(num){
        const start=performance.now();
        const tick=t=>{const k=Math.min(1,(t-start)/1600);const e=1-Math.pow(1-k,3);num.textContent=Math.round(iq*e);if(k<1)requestAnimationFrame(tick);};
        requestAnimationFrame(tick);
      }
    },80);
  }

  function showQ(){
    if(qi>=QS.length){finish();return;}
    const {q,opts,ans,diff,exp,cat}=QS[qi];
    const w=IQ_DIFF_W[diff]||1;
    weightSum+=w;
    catStats[cat]=catStats[cat]||{got:0,total:0};
    catStats[cat].total++;

    const timeMs=IQ_TIMER[diff]||20000;
    const diffInfo=diff==='easy'?{label:'🟢 Easy',color:'#22C55E'}:diff==='medium'?{label:'🟡 Medium',color:'#EAB308'}:{label:'🔴 Hard',color:'#EF4444'};
    const catInfo=IQ_CATS[cat]||{label:cat,color:'#888'};

    let barT=null,elapsed=0,answered=false;
    const tsStart=Date.now();

    // Progress dots
    const progressDots=Array.from({length:IQ_N},(_,i)=>{
      if(i<qi)return'<span class="iq-dot iq-dot-done"></span>';
      if(i===qi)return'<span class="iq-dot iq-dot-active"></span>';
      return'<span class="iq-dot"></span>';
    }).join('');

    host.innerHTML=`
      <div class="iq-progress-bar-wrap">
        <div class="iq-progress-bar" style="width:${(qi/IQ_N)*100}%;"></div>
      </div>
      <div class="iq-q-header">
        <span class="iq-diff-tag" style="color:${diffInfo.color};border-color:${diffInfo.color}44;">${diffInfo.label}</span>
        <span class="iq-cat-chip" style="background:${catInfo.color}22;color:${catInfo.color};">${catInfo.label}</span>
        <span class="iq-q-num">Q${qi+1}/${IQ_N}</span>
      </div>
      <div class="iq-dots">${progressDots}</div>
      <div class="timer-bar" style="margin-bottom:14px;"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div>
      <div class="iq-question">${q}</div>
      <div class="iq-opts" id="iqOpts">
        ${opts.map((o,i)=>`<button class="iq-opt" data-i="${i}">
          <span class="iq-opt-letter">${String.fromCharCode(65+i)}</span>
          <span class="iq-opt-text">${o}</span>
        </button>`).join('')}
      </div>
    `;

    function showExp(correct,msg){
      const expEl=document.createElement('div');
      expEl.className=`iq-exp-box ${correct?'iq-exp-correct':'iq-exp-wrong'}`;
      expEl.innerHTML=`
        <div class="iq-exp-icon">${correct?'✅':'❌'}</div>
        <div>
          <div style="font-weight:700;font-size:13px;">${msg}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:3px;">💡 ${exp}</div>
        </div>
      `;
      host.appendChild(expEl);
    }

    barT=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=wrap.querySelector('#iqBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=timeMs&&!answered){
        _cti(barT);answered=true;
        speedSum+=1;speedCount++;
        host.querySelectorAll('.iq-opt').forEach((b,i)=>{
          if(i===ans)b.classList.add('correct-ans');
          b.disabled=true;
        });
        showExp(false,"⏱ Time's up!");
        playSound('wrong');
        qi++;_st(showQ,2000);
      }
    },100);

    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        _cti(barT);answered=true;
        const elapsedMs=Date.now()-tsStart;
        speedSum+=Math.min(1,elapsedMs/timeMs);
        speedCount++;
        if(fastest==null||elapsedMs<fastest)fastest=elapsedMs;
        const chosen=+b.dataset.i;
        host.querySelectorAll('.iq-opt').forEach(x=>x.disabled=true);
        if(chosen===ans){
          playSound('correct');haptic(15);
          correct++;weightGot+=w;catStats[cat].got++;setScore(correct);
          b.classList.add('correct-ans');
          showExp(true,'Correct!');
        } else {
          playSound('wrong');haptic([20,40,20]);
          b.classList.add('wrong-ans');
          host.querySelectorAll('.iq-opt').forEach((x,i)=>{if(i===ans)x.classList.add('correct-ans');});
          showExp(false,'Wrong!');
        }
        qi++;_st(showQ,2200);
      };
    });
  }
}

/* ===================== PROGRESS ===================== */
function renderProgress(){
  const p=$(`<div></div>`);
  const h=S('nz_score_history');
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
      <h3>🏆 Brain Score: ${S('nz_brain_score')}/10000</h3>
      <div style="font-size:12px;opacity:.85;">Keep training to reach 10000!</div>
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
  Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed'}).forEach(([label,key])=>{
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
    drawLineChart(p.querySelector('#lineChart'),h);
    const pct=Math.min(100,S('nz_brain_score')/100);
    p.querySelector('#pbarFill').style.width=pct+'%';
  },40);
  return p;
}
function drawLineChart(host,data){
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
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
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
  const p=$(`<div></div>`);
  p.innerHTML=`
    <div class="hdr"><div><div class="greet">Your account</div><h1>Profile</h1></div></div>
    <div class="prof-card">
      <div class="prof-top">
        <div class="prof-avatar">${name.charAt(0).toUpperCase()}</div>
        <div style="flex:1;"><div class="prof-name">${name}</div><div class="prof-email">NeuroZen Player</div></div>
        <div class="lvl-badge">Lv ${lvP.lv}<br><span style="font-size:9px;letter-spacing:.06em;">${lvP.name.toUpperCase()}</span></div>
      </div>
      <div class="prof-stats">
        <div class="prof-stat"><div class="v">${S('nz_brain_score')}</div><div class="l">Brain Score</div></div>
        <div class="prof-stat"><div class="v">${S('nz_streak')}</div><div class="l">Streak</div></div>
        <div class="prof-stat"><div class="v">${S('nz_games_played')}</div><div class="l">Games</div></div>
      </div>
    </div>
    <div class="sec-title"><h2>Settings</h2></div>
    <div id="settList"></div>
    <div class="sec-title"><h2>App Info</h2></div>
    <div class="card" style="padding:16px;"><div style="font-size:13px;color:var(--text2);line-height:1.8;">
      <strong style="color:var(--text);">NeuroZen v2.0</strong><br>
      8 brain-training games · Scientifically inspired · Progress tracking
    </div></div>
  `;
  const settList=p.querySelector('#settList');
  function mkSetting(ico,title,sub,right,onClick){
    const el=$(`<div class="setting"><div class="sic">${ico}</div><div style="flex:1;"><div class="sttl">${title}</div>${sub?`<div class="ssub">${sub}</div>`:''}</div><div class="sright">${right}</div></div>`);
    el.onclick=onClick;settList.appendChild(el);return el;
  }
  function mkToggle(key,ico,title,sub){
    const tgl=$(`<div class="tgl ${sett[key]?'on':''}" id="tgl_${key}"></div>`);
    const el=$(`<div class="setting"><div class="sic">${ico}</div><div style="flex:1;"><div class="sttl">${title}</div>${sub?`<div class="ssub">${sub}</div>`:''}</div></div>`);
    el.appendChild(tgl);settList.appendChild(el);
    el.onclick=()=>{
      const s=S('nz_settings');s[key]=!s[key];setS('nz_settings',s);
      tgl.classList.toggle('on',!!s[key]);
      toast(s[key]?`${title} enabled`:`${title} disabled`);
    };
  }
  const dmEl=$(`<div class="setting"><div class="sic">🌙</div><div style="flex:1;"><div class="sttl">Dark Mode</div></div><div class="tgl ${S('nz_dark_mode')?'on':''}" id="dmTgl"></div></div>`);
  dmEl.onclick=()=>{const v=!S('nz_dark_mode');setS('nz_dark_mode',v);applyDark();dmEl.querySelector('#dmTgl').classList.toggle('on',v);};
  settList.appendChild(dmEl);
  mkToggle('reminders','⏰','Daily Reminders','Practice at your peak time');
  mkToggle('sfx','🔊','Sound Effects','In-game audio feedback');
  mkSetting('🔔','Notifications','App alerts','›',()=>{
    const s=S('nz_settings');s.notifications=!s.notifications;setS('nz_settings',s);
    toast(s.notifications?'🔔 Notifications enabled':'🔕 Notifications disabled');
  });
  mkSetting('🔒','Privacy','Your data','›',()=>showModal('privacy'));
  mkSetting('❓','Help & Support','FAQ','›',()=>showModal('help'));
  mkSetting('🚪','Log Out','Reset all progress','',()=>showModal('logout')).classList.add('danger');
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

/* ===================== ONBOARDING ===================== */
function showOnboarding(){
  const onb=$(`<div class="onb" id="onbScreen"></div>`);
  document.body.appendChild(onb);
  let step=0,userName='',goal=3;
  const steps=[
    ()=>{onb.innerHTML=`<div class="onb-em">🧠</div><h1>Welcome to NeuroZen</h1><p>Train your brain with 10 science-inspired games. Build focus, memory, speed & more.</p>
      <div class="dots"><div class="dot active"></div><div class="dot"></div><div class="dot"></div></div>
      <button class="btn-primary next">Let's Start →</button>`;
      onb.querySelector('.next').onclick=()=>{step=1;steps[step]();};
    },
    ()=>{onb.innerHTML=`<div class="onb-em">👤</div><h1>What's your name?</h1><p>We'll personalize your experience.</p>
      <input type="text" id="nameIn" placeholder="Your name" maxlength="20" value="${userName}"/>
      <div class="dots"><div class="dot"></div><div class="dot active"></div><div class="dot"></div></div>
      <button class="btn-primary next" style="margin-top:20px;">Continue →</button>`;
      const inp=onb.querySelector('#nameIn');inp.focus();
      onb.querySelector('.next').onclick=()=>{
        const v=inp.value.trim();if(!v){inp.style.borderColor='#EF4444';return;}
        userName=v;step=2;steps[step]();
      };
    },
    ()=>{onb.innerHTML=`<div class="onb-em">🎯</div><h1>Set your daily goal</h1><p>How many games per day?</p>
      <div class="opts">
        <button class="opt ${goal===1?'sel':''}" data-v="1">1 game &nbsp; <span style="color:var(--text2);">~3 min</span></button>
        <button class="opt ${goal===3?'sel':''}" data-v="3">3 games &nbsp; <span style="color:var(--text2);">~10 min</span></button>
        <button class="opt ${goal===5?'sel':''}" data-v="5">5 games &nbsp; <span style="color:var(--text2);">~18 min</span></button>
      </div>
      <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot active"></div></div>
      <button class="btn-primary next">Start Training 🚀</button>`;
      onb.querySelectorAll('.opt').forEach(b=>{b.onclick=()=>{goal=+b.dataset.v;onb.querySelectorAll('.opt').forEach(o=>o.classList.toggle('sel',+o.dataset.v===goal));};});
      onb.querySelector('.next').onclick=()=>{
        // Set fresh defaults
        setS('nz_username',userName||'Player');
        setS('nz_brain_score',0);setS('nz_streak',0);setS('nz_games_played',0);
        setS('nz_today_goal',goal);setS('nz_score_history',[0,0,0,0,0,0,0]);
        setS('nz_achievements',[]);setS('nz_skill_scores',{memory:0,focus:0,logic:0,speed:0});
        setS('nz_skill_scores_prev',{memory:0,focus:0,logic:0,speed:0});
        setS('nz_best_scores',{});setS('nz_last_played',null);
        setS('nz_settings',{reminders:true,sfx:true,notifications:true});
        setS('nz_onboarded',true);setS('nz_schulte_level',0);setS('nz_today_games',0);
        onb.style.animation='fadeUp .35s reverse';
        setTimeout(()=>{onb.remove();render('home');toast('Welcome, '+userName+'! 🧠');},300);
      };
    },
  ];
  steps[0]();
}

/* ===================== REACTION LAB (endless survival) ===================== */
const RL_MODES={
  classic:{label:'Classic',emoji:'⚡',sub:'Tap circle fast',zen:false},
  gonogo:{label:'Go / No-Go',emoji:'🚦',sub:'Red tap · Blue don\'t',zen:false},
  target:{label:'Target',emoji:'🎯',sub:'Tap the larger one',zen:false},
  zen:{label:'Zen',emoji:'🧘',sub:'No lives, practice',zen:true},
};
function rlReactPoints(rt){
  if(rt<200)return{pts:5,em:'⚡',txt:'LIGHTNING!'};
  if(rt<300)return{pts:4,em:'🔥',txt:'FAST'};
  if(rt<450)return{pts:3,em:'👍',txt:'GOOD'};
  if(rt<600)return{pts:2,em:'😐',txt:'OK'};
  return{pts:1,em:'🐌',txt:'SLOW'};
}
function rlRank(avg){
  if(avg<200)return{em:'👑',txt:'Superhuman'};
  if(avg<250)return{em:'🔥',txt:'Elite Reflexes'};
  if(avg<350)return{em:'⚡',txt:'Sharp Reflexes'};
  if(avg<500)return{em:'👍',txt:'Decent Reflexes'};
  return{em:'🐌',txt:'Keep Training'};
}
function rlDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Average reaction under 300ms',type:'avg',target:300},
    {label:'Reach Round 15',type:'round',target:15},
    {label:'Land a tap under 200ms',type:'fastest',target:200},
    {label:'Average reaction under 350ms',type:'avg',target:350},
    {label:'Reach Round 20',type:'round',target:20},
  ];
  return defs[dayN%defs.length];
}
function rlDailyDone(){return S('nz_rl_daily_date')===todayKey()&&!!S('nz_rl_daily_done');}
const RL_DISAPPEAR=1000; // circle disappears after 1s if not tapped
function playReactionLab(body,setScore,end,wrap,startClock){
  let mode='classic';
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_rl_best_round')||0;
    const avgTime=S('nz_rl_avg_time')||0;
    const games=S('nz_rl_games')||0;
    const dc=rlDailyChallenge();
    const dcDone=rlDailyDone();
    const screen=$(`<div class="rl-start"></div>`);
    screen.innerHTML=`
      <div class="rl-stats">
        <div class="rl-stat"><div class="v">${bestRound}</div><div class="l">Best Round</div></div>
        <div class="rl-stat"><div class="v">${avgTime?avgTime+'ms':'—'}</div><div class="l">Avg Reaction</div></div>
        <div class="rl-stat"><div class="v">${games}</div><div class="l">Games</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="rl-mode-title">Choose a Mode</div>
      <div class="rl-modes" id="rlModes"></div>
      <button class="btn-primary" id="rlGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#rlModes');
    ['classic','gonogo','target','zen'].forEach(k=>{
      const m=RL_MODES[k];
      const card=$(`<button class="rl-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.rl-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#rlGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const m=RL_MODES[mode];
    const zen=m.zen;
    body.innerHTML='';
    const stage=$(`<div class="rl-play"></div>`);
    stage.innerHTML=`
      <div id="rlHud" class="rl-hud"></div>
      <div id="rlArena" class="rl-arena"></div>
      <div id="rlInfo" class="rl-info-line"></div>`;
    body.appendChild(stage);
    const arena=stage.querySelector('#rlArena');
    const hud=stage.querySelector('#rlHud');
    const info=stage.querySelector('#rlInfo');
    const times=[];
    let round=0,score=0,lives=zen?Infinity:3,fastest=null,delayT=null,holdT=null,busy=false,active=true;

    function heartsHtml(){
      if(zen)return `<span class="qm-zen-tag">🧘 Zen — no lives</span>`;
      return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;
    }
    function drawHud(){
      hud.innerHTML=`${heartsHtml()}
        <div class="rl-roundrow"><span>Round <strong>${round+1}</strong></span><span>Score <strong>${score}</strong></span></div>`;
    }
    function showFb(msg,color){
      const old=arena.querySelector('.rl-fb');if(old)old.remove();
      const el=$(`<div class="rl-fb" style="color:${color};">${msg}</div>`);
      arena.appendChild(el);
    }

    function roundType(rn){
      if(mode==='gonogo')return 'gonogo';
      if(mode==='target')return 'target';
      if(mode==='zen')return rn<10?'single':rn<20?'gonogo':rn<30?'target':'odd';
      if(rn<10)return 'single';
      if(rn<20)return 'gonogo';
      if(rn<30)return 'target';
      return 'odd';
    }

    function loseLife(){
      if(zen)return false;
      lives--;
      haptic([30,50,30]);
      arena.classList.add('shake-anim');_st(()=>arena.classList.remove('shake-anim'),450);
      return lives<=0;
    }

    function advance(t,msg,color,pts,dead){
      if(!active)return;
      clearTimeout(holdT);clearTimeout(delayT);busy=true;
      if(t>0&&t<RL_DISAPPEAR){times.push(t);if(fastest===null||t<fastest)fastest=t;}
      if(pts>0){score+=pts;setScore(score);}
      showFb(msg,color);
      if(dead){_st(gameOver,950);return;}
      round++;
      _st(()=>{busy=false;doRound();},850);
    }

    function doRound(){
      if(!active)return;
      drawHud();
      const rn=round;
      const type=roundType(rn);
      info.textContent=`Round ${rn+1} · ${type==='single'?'Tap the circle!':type==='gonogo'?'🔴 tap · 🔵 don\'t tap':type==='target'?'Tap the LARGER circle':'Tap the ODD-colored circle'}`;
      arena.innerHTML='<div class="rl-ready">+ + +</div>';
      const delay=rn<10?(800+Math.random()*1700):(500+Math.random()*1000);
      delayT=_st(()=>{
        if(!active||round!==rn)return;
        arena.innerHTML='';
        const aw=arena.clientWidth||300,ah=arena.clientHeight||220;
        const ts=Date.now();
        const place=(size)=>{
          const x=8+Math.floor(Math.random()*Math.max(1,aw-size-16));
          const y=8+Math.floor(Math.random()*Math.max(1,ah-size-16));
          return{x,y};
        };
        const circle=(size,color,onTap)=>{
          const {x,y}=place(size);
          const el=$(`<div class="rl-circle" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};"></div>`);
          el.onclick=()=>{if(busy)return;haptic(10);onTap(el);};
          arena.appendChild(el);
          return el;
        };
        const lockAll=()=>arena.querySelectorAll('.rl-circle').forEach(d=>d.style.pointerEvents='none');
        const onCorrectTap=()=>{
          const rt=Date.now()-ts;const r=rlReactPoints(rt);
          lockAll();advance(rt,`${r.em} ${r.txt} +${r.pts} · ${rt}ms`,'#22C55E',r.pts,false);
        };
        const onMiss=()=>{const dead=loseLife();advance(0,zen?'⏱ Missed':'⏱ Too slow! -1 life','#EF4444',0,dead);};
        const onWrongTap=(msg)=>{lockAll();const dead=loseLife();advance(0,zen?msg:msg+' -1 life','#EF4444',0,dead);};

        if(type==='single'){
          const col=['#7C3AED','#4F8EF7','#34D399','#F472B6','#F97316'][Math.floor(Math.random()*5)];
          circle(54,col,()=>{onCorrectTap();});
          holdT=_st(onMiss,RL_DISAPPEAR);
        } else if(type==='gonogo'){
          const isGo=Math.random()<0.6;
          const col=isGo?'#EF4444':'#3B82F6';
          circle(54,col,()=>{
            if(isGo){onCorrectTap();}
            else{onWrongTap('❌ Tapped blue!');}
          });
          if(isGo)holdT=_st(onMiss,RL_DISAPPEAR);
          else holdT=_st(()=>{lockAll();advance(0,'👍 +3 · Correctly ignored','#22C55E',3,false);},RL_DISAPPEAR);
        } else if(type==='target'){
          let big=46+Math.floor(Math.random()*22);
          let small=big-(18+Math.floor(Math.random()*12));
          const arr=[{size:big,correct:true},{size:small,correct:false}].sort(()=>Math.random()-.5);
          arr.forEach((c,i)=>{
            const col=['#7C3AED','#4F8EF7'][i];
            circle(c.size,col,()=>{c.correct?onCorrectTap():onWrongTap('❌ Smaller circle!');});
          });
          holdT=_st(onMiss,RL_DISAPPEAR);
        } else {
          const base=['#7C3AED','#4F8EF7','#34D399','#F97316'][Math.floor(Math.random()*4)];
          let odd=base;while(odd===base)odd=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6'][Math.floor(Math.random()*5)];
          const oddIdx=Math.floor(Math.random()*3);
          for(let i=0;i<3;i++){
            const col=i===oddIdx?odd:base;
            circle(48,col,()=>{i===oddIdx?onCorrectTap():onWrongTap('❌ Wrong color!');});
          }
          holdT=_st(onMiss,RL_DISAPPEAR);
        }
      },delay);
    }

    function gameOver(){
      active=false;clearTimeout(delayT);clearTimeout(holdT);
      const valid=times.filter(t=>t>0&&t<RL_DISAPPEAR);
      const avg=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):0;
      const finalRound=round;
      const prevBestRound=S('nz_rl_best_round')||0;
      const newPB=finalRound>prevBestRound;
      if(newPB)setS('nz_rl_best_round',finalRound);
      setS('nz_rl_games',(S('nz_rl_games')||0)+1);
      if(avg>0)setS('nz_rl_avg_time',avg);
      const prevFast=S('nz_rl_fastest')||0;
      if(fastest!==null&&(prevFast===0||fastest<prevFast))setS('nz_rl_fastest',fastest);
      const dc=rlDailyChallenge();
      if(!rlDailyDone()){
        let pass=false;
        if(dc.type==='avg')pass=avg>0&&avg<=dc.target;
        else if(dc.type==='round')pass=finalRound>=dc.target;
        else if(dc.type==='fastest')pass=fastest!==null&&fastest<=dc.target;
        if(pass){setS('nz_rl_daily_date',todayKey());setS('nz_rl_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const last=times.slice(-10);
      const n=10,cw=24,gap=4,ph=64,pw=n*(cw+gap)+gap;
      const maxMs=Math.max(...last,300);
      const bars=last.map((t,i)=>{
        const x=gap+i*(cw+gap);
        const bh=Math.max(8,Math.round(t/maxMs*ph));
        const fc=t<200?'#7C3AED':t<300?'#34D399':t<450?'#FBBF24':t<600?'#F59E0B':'#F97316';
        return`<rect x="${x}" y="${ph-bh}" width="${cw}" height="${bh}" rx="3" fill="${fc}"/><text x="${x+cw/2}" y="${ph+11}" text-anchor="middle" fill="var(--text2)" font-size="7">${t}</text>`;
      }).join('');
      const chartSvg=last.length?`<svg width="${pw}" height="${ph+14}" viewBox="0 0 ${pw} ${ph+14}" style="display:block;margin:0 auto;overflow:visible;">${bars}</svg>`:'<div style="font-size:11px;color:var(--text2);">No timed taps yet</div>';
      const rank=rlRank(avg||999);
      const xp=Math.max(2,Math.round(finalRound*2+score/3));
      setScore(score);
      if(newPB)confetti(50);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Round ${finalRound} · ${avg?avg+'ms avg':'—'}${newPB?' · 🏆 New Best!':''}`,
        value:finalRound,points:xp,starThresh:[10,20,30],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Best Round</span><span class="val">${Math.max(finalRound,prevBestRound)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>Avg Reaction Time</span><span class="val">${avg?avg+'ms':'—'}</span></div>
          <div class="row"><span>Fastest Tap</span><span class="val">${fastest!==null?fastest+'ms':'—'}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${xp}</span></div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:6px;">Last ${last.length} reaction times</div>
          ${chartSvg}
          <div style="text-align:center;font-size:12px;font-weight:700;color:var(--primary);margin-top:6px;">Average: ${avg?avg+'ms':'—'}</div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    wrap.addEventListener('remove_game',()=>{active=false;clearTimeout(delayT);clearTimeout(holdT);busy=true;});
    doRound();
  }
}

/* ===================== SPATIAL SPIN (endless survival) ===================== */
const SS_SHAPES={
  L:[[0,0],[1,0],[2,0],[2,1]],
  J:[[0,1],[1,1],[2,1],[2,0]],
  T:[[0,0],[0,1],[0,2],[1,1]],
  Z:[[0,0],[0,1],[1,1],[1,2]],
  S:[[0,1],[0,2],[1,0],[1,1]],
  Plus:[[0,1],[1,0],[1,1],[1,2],[2,1]],
  Cross:[[0,0],[0,2],[1,1],[2,0],[2,2]],
  Hook:[[0,0],[1,0],[2,0],[2,1],[2,2],[0,1]],
  Chair:[[0,0],[1,0],[2,0],[2,1],[1,1],[0,2],[1,2]],
  Skew:[[0,0],[0,1],[1,1],[1,2],[2,2]],
  Corner:[[0,0],[1,0],[2,0],[0,1],[0,2]],
  Step:[[0,0],[1,0],[1,1],[2,1],[2,2]],
  Bolt:[[0,2],[1,0],[1,1],[1,2],[2,0]],
  Snake:[[0,0],[0,1],[1,1],[2,1],[2,2]],
  Flag:[[0,0],[0,1],[0,2],[1,0],[2,0],[3,0]],
  Comb:[[0,0],[0,1],[0,2],[1,0],[2,0],[2,1],[2,2]],
};
const SS_MODES={
  easy:{label:'Easy',emoji:'🟢',sub:'Simple shapes',time:10000,zen:false,pool:['L','J','Corner','Flag']},
  medium:{label:'Medium',emoji:'🟡',sub:'T, Z & step shapes',time:8000,zen:false,pool:['T','Z','S','Step','Skew']},
  hard:{label:'Hard',emoji:'🔴',sub:'Complex shapes',time:6000,zen:false,pool:['Plus','Cross','Hook','Bolt','Snake']},
  speed:{label:'Speed',emoji:'🔄',sub:'All shapes, fast',time:4000,zen:false,pool:null},
  zen:{label:'Zen',emoji:'🧘',sub:'No timer',time:0,zen:true,pool:null},
};
function ssRank(round){
  if(round>=21)return{em:'👑',txt:'Spatial Master'};
  if(round>=16)return{em:'⚡',txt:'Rotation Expert'};
  if(round>=11)return{em:'🧠',txt:'Spatial Thinker'};
  if(round>=6)return{em:'💪',txt:'Getting Oriented'};
  return{em:'🌱',txt:'Spatial Beginner'};
}
function ssDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Get 10 correct rotations',target:10},
    {label:'Reach Round 15',target:15},
    {label:'Get 8 correct rotations',target:8},
    {label:'Reach Round 20',target:20},
    {label:'Get 12 correct rotations',target:12},
  ];
  return defs[dayN%defs.length];
}
function ssDailyDone(){return S('nz_ss_daily_date')===todayKey()&&!!S('nz_ss_daily_done');}
function playSpatialSpin(body,setScore,end,wrap,startClock){
  let mode='easy';
  function norm(cells){
    const minR=Math.min(...cells.map(([r])=>r));
    const minC=Math.min(...cells.map(([,c])=>c));
    return cells.map(([r,c])=>[r-minR,c-minC]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  }
  function rotateCW(cells){
    const maxR=Math.max(...cells.map(([r])=>r));
    return norm(cells.map(([r,c])=>[c,maxR-r]));
  }
  function mirror(cells){
    const maxC=Math.max(...cells.map(([,c])=>c));
    return norm(cells.map(([r,c])=>[r,maxC-c]));
  }
  function key(cells){return norm(cells).map(p=>p.join('_')).join('|');}
  function allRots(cells){
    const rots=[norm(cells)];
    for(let i=0;i<3;i++)rots.push(rotateCW(rots[rots.length-1]));
    return rots;
  }
  function drawShapeSvg(cells,cs,color){
    const nc=norm(cells);
    const maxR=Math.max(...nc.map(([r])=>r));
    const maxC=Math.max(...nc.map(([,c])=>c));
    const p=2,w=(maxC+1)*cs+p*2,h=(maxR+1)*cs+p*2;
    const rects=nc.map(([r,c])=>`<rect x="${c*cs+p}" y="${r*cs+p}" width="${cs-2}" height="${cs-2}" rx="3" fill="${color}"/>`).join('');
    return`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`;
  }
  function shapeForRound(rn){
    const m=SS_MODES[mode];
    if(m.pool)return m.pool[Math.floor(Math.random()*m.pool.length)];
    let pool;
    if(rn<5)pool=['L','J'];
    else if(rn<10)pool=['T'];
    else if(rn<15)pool=['Z','S'];
    else if(rn<20)pool=['Plus','Cross'];
    else pool=['Hook','Chair'];
    return pool[Math.floor(Math.random()*pool.length)];
  }

  renderStart();

  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_ss_best_round')||0;
    const games=S('nz_ss_games')||0;
    const accH=S('nz_ss_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=ssDailyChallenge();
    const dcDone=ssDailyDone();
    const screen=$(`<div class="ss-start"></div>`);
    screen.innerHTML=`
      <div class="ss-stats">
        <div class="ss-stat"><div class="v">${bestRound}</div><div class="l">Best Round</div></div>
        <div class="ss-stat"><div class="v">${avgAcc}%</div><div class="l">Accuracy</div></div>
        <div class="ss-stat"><div class="v">${games}</div><div class="l">Games</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="ss-mode-title">Choose a Mode</div>
      <div class="ss-modes" id="ssModes"></div>
      <button class="btn-primary" id="ssGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#ssModes');
    ['easy','medium','hard','speed','zen'].forEach(k=>{
      const m=SS_MODES[k];
      const card=$(`<button class="ss-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-grid">${m.zen?'No timer':(m.time/1000)+'s / question'}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.ss-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#ssGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const m=SS_MODES[mode];
    const zen=m.zen;
    body.innerHTML='';
    const host=$(`<div class="ss-play"></div>`);
    body.appendChild(host);
    let round=0,lives=zen?Infinity:3,correctCount=0,attempts=0,barT=null;

    function heartsHtml(){
      if(zen)return `<span class="qm-zen-tag">🧘 Zen — no timer / lives</span>`;
      return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;
    }

    function gameOver(){
      _cti(barT);
      const finalRound=round;
      const accuracy=attempts?Math.round(correctCount/attempts*100):0;
      const prevBest=S('nz_ss_best_round')||0;
      const newPB=finalRound>prevBest;
      if(newPB)setS('nz_ss_best_round',finalRound);
      setS('nz_ss_games',(S('nz_ss_games')||0)+1);
      const accH=S('nz_ss_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_ss_accuracy',accH);
      const dc=ssDailyChallenge();
      if(!ssDailyDone()){
        const pass=correctCount>=dc.target||finalRound>=dc.target;
        if(pass){setS('nz_ss_daily_date',todayKey());setS('nz_ss_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const rank=ssRank(finalRound);
      const xp=Math.max(2,Math.round(finalRound*2.7));
      setScore(finalRound);
      if(newPB)confetti(50);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Round ${finalRound}${newPB?' · 🏆 New Best!':''}`,
        value:finalRound,points:xp,starThresh:[6,12,20],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Round Reached</span><span class="val">${finalRound}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}% (${correctCount}/${attempts})</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${xp}</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(finalRound,prevBest)}${newPB?' 🏆':''}</span></div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    function loseLife(){
      if(zen)return false;
      lives--;haptic([30,50,30]);
      host.classList.add('shake-anim');_st(()=>host.classList.remove('shake-anim'),450);
      return lives<=0;
    }

    function nextQ(){
      _cti(barT);
      const rn=round;
      const type=shapeForRound(rn);
      const base=SS_SHAPES[type];
      const rots=allRots(base);
      const dispRot=Math.floor(Math.random()*4);
      const dispCells=rots[dispRot];
      const dispKey=key(dispCells);
      const candidateRots=rots.map((c,i)=>({c,i})).filter(o=>key(o.c)!==dispKey);
      const answer=candidateRots[Math.floor(Math.random()*candidateRots.length)];
      const trueKeys=new Set(rots.map(key));
      const mirRots=allRots(mirror(base)).filter(c=>!trueKeys.has(key(c)));
      const distractors=[];const usedKeys=new Set([key(answer.c)]);
      mirRots.sort(()=>Math.random()-.5).forEach(c=>{const k=key(c);if(distractors.length<3&&!usedKeys.has(k)){usedKeys.add(k);distractors.push(c);}});
      while(distractors.length<3){
        const otherType=Object.keys(SS_SHAPES)[Math.floor(Math.random()*Object.keys(SS_SHAPES).length)];
        const oc=allRots(SS_SHAPES[otherType])[Math.floor(Math.random()*4)];
        const k=key(oc);
        if(!usedKeys.has(k)&&!trueKeys.has(k)){usedKeys.add(k);distractors.push(oc);}
      }
      const optColors=['#7C3AED','#4F8EF7','#34D399','#F97316'];
      const opts=[{cells:answer.c,correct:true},...distractors.map(c=>({cells:c,correct:false}))].sort(()=>Math.random()-.5);
      const hint=rn<2;
      const dispSvg=drawShapeSvg(dispCells,26,'#7C3AED');
      const optButtons=opts.map((o,i)=>`<button class="ss-opt" data-i="${i}">${drawShapeSvg(o.cells,20,optColors[i])}</button>`).join('');
      host.innerHTML=`
        ${zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>'}
        ${heartsHtml()}
        <div class="ss-roundrow"><span>Round <strong>${rn+1}</strong></span><span>Correct <strong>${correctCount}</strong></span></div>
        <div class="ss-prompt">Which is this shape <strong>rotated</strong> (not mirrored)?</div>
        <div class="ss-disp-wrap"><div id="ssDisp" class="ss-disp">${dispSvg}</div></div>
        ${hint?'<div class="ss-hint">💡 Watch it rotate — pick the matching shape</div>':''}
        <div class="ss-opts" id="ssOpts">${optButtons}</div>
        <div id="ssFb" class="ss-fb"></div>`;
      if(hint){
        const dispEl=host.querySelector('#ssDisp');
        if(dispEl){
          _st(()=>{dispEl.style.transition='transform 1s ease-in-out';dispEl.style.transform='rotate(360deg)';
            _st(()=>{dispEl.style.transition='none';dispEl.style.transform='';},1050);},300);
        }
      }
      const optEls=host.querySelectorAll('.ss-opt');
      function resolve(picked){
        _cti(barT);
        attempts++;
        optEls.forEach(b=>b.disabled=true);
        const fb=host.querySelector('#ssFb');
        const correctIdx=opts.findIndex(o=>o.correct);
        if(picked!==null&&opts[picked].correct){
          playSound('correct');haptic(10);correctCount++;
          optEls[picked].classList.add('ss-correct');
          if(fb){fb.style.color='#22C55E';fb.textContent='✅ Correct!';}
          round++;
          _st(nextQ,zen?500:650);
        } else {
          playSound('wrong');
          if(picked!==null)optEls[picked].classList.add('ss-wrong');
          optEls[correctIdx].classList.add('ss-correct');
          if(fb){fb.style.color='#EF4444';fb.textContent=picked===null?'⏱ Time\'s up!':'❌ Wrong!';}
          const dead=loseLife();
          if(dead){_st(gameOver,950);return;}
          round++;
          _st(nextQ,zen?700:950);
        }
      }
      optEls.forEach((btn,i)=>{btn.onclick=()=>{if(btn.disabled)return;resolve(i);};});
      if(!zen&&m.time){
        let elapsed=0;
        barT=_si(()=>{
          elapsed+=100;
          const pct=Math.max(0,100-elapsed/m.time*100);
          const bar=host.querySelector('#ssBar');
          if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
          if(elapsed>=m.time){_cti(barT);resolve(null);}
        },100);
      }
    }

    wrap.addEventListener('remove_game',()=>{_cti(barT);});
    nextQ();
  }
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

/* ===================== INIT ===================== */
function init(){
  if(!S('nz_onboarded')){showOnboarding();}
  else{render('home');}
}
init();
