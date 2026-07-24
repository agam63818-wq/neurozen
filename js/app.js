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
  {lv:1,name:'Novice',xp:0},{lv:2,name:'Apprentice',xp:500},{lv:3,name:'Thinker',xp:1200},
  {lv:4,name:'Scholar',xp:2500},{lv:5,name:'Expert',xp:4500},{lv:6,name:'Genius',xp:7000},
  {lv:7,name:'Prodigy',xp:10000},{lv:8,name:'Mastermind',xp:14000},{lv:9,name:'Sage',xp:19000},
  {lv:10,name:'Legend',xp:25000},
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
  {id:'score_1000',emoji:'👑',title:'Master Mind',check:()=>S('nz_brain_score')>=1000},
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
  const mult=skillLvl<30?1.5:skillLvl<60?1.0:0.8;
  const pts=Math.round(rawPts*mult);
  const cur=S('nz_brain_score');
  const next=Math.max(0,Math.min(1000,cur+pts));
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
    const circ=2*Math.PI*100;const pct=Math.min(1,score/1000);
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
    const pts=awardScore(Math.max(5,opts.points||10),g.skill,id,opts.value);
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
      const pts=Math.max(5,focusScore);
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

/* ===================== MEMORY MATRIX (endless survival) ===================== */
const MM_MODES={
  easy:{label:'Easy',emoji:'🌱',sub:'3×3 → 5×5',start:3,max:12,ghost:false,zen:false},
  medium:{label:'Medium',emoji:'⚡',sub:'5×5 → 6×6',start:4,max:15,ghost:false,zen:false},
  hard:{label:'Hard',emoji:'🔥',sub:'6×6 → 7×7',start:5,max:18,ghost:false,zen:false},
  ghost:{label:'Ghost',emoji:'👻',sub:'Cells vanish faster',start:3,max:14,ghost:true,zen:false},
  zen:{label:'Zen',emoji:'🧘',sub:'No timer, relax',start:3,max:14,ghost:false,zen:true},
};
const MM_COLORS=[{n:'red',hex:'#EF4444'},{n:'blue',hex:'#3B82F6'},{n:'green',hex:'#22C55E'},{n:'yellow',hex:'#EAB308'}];
function mmGridSize(round){
  if(round<=5)return 3;if(round<=10)return 4;if(round<=15)return 5;if(round<=20)return 6;return 7;
}
function mmFlashMs(round){
  if(round<=5)return 2000;if(round<=10)return 1500;if(round<=15)return 1200;if(round<=20)return 900;return 700;
}
function mmRank(round){
  if(round<=5)return{em:'🌱',txt:'Keep Practicing'};
  if(round<=10)return{em:'💪',txt:'Getting Better'};
  if(round<=15)return{em:'🧠',txt:'Sharp Mind'};
  if(round<=20)return{em:'⚡',txt:'Memory Expert'};
  if(round<=25)return{em:'🏆',txt:'Memory Master'};
  return{em:'👑',txt:'Legendary Memory'};
}
function mmDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Reach Round 10',type:'round',target:10},
    {label:'Complete 5 rounds with no mistakes',type:'streak',target:5},
    {label:'Survive Ghost mode 8 rounds',type:'ghost',target:8},
    {label:'Reach Round 15',type:'round',target:15},
    {label:'Get a 7 correct streak',type:'streak',target:7},
  ];
  return defs[dayN%defs.length];
}
function mmDailyDone(){return S('nz_mm_daily_date')===todayKey()&&!!S('nz_mm_daily_done');}
function mmEdgeFlash(){
  let g=document.getElementById('mmEdgeGlow');
  if(!g){g=$(`<div id="mmEdgeGlow" class="mm-edge-glow"></div>`);document.body.appendChild(g);}
  g.classList.add('show');_st(()=>g.classList.remove('show'),150);
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
      <button class="btn-primary" id="mmGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#mmModes');
    ['easy','medium','hard','ghost','zen'].forEach(k=>{
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
    let round=1,lives=3,cells=m.start,streak=0,bestStreak=0,correctRounds=0,totalRounds=0,speedBonus=0;
    body.innerHTML='';
    const stage=$(`<div class="mm-stage${m.zen?' mm-zen':''}"></div>`);
    body.appendChild(stage);

    function heartsHtml(){
      return [0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('');
    }
    function hud(extra){
      const best=S('nz_mm_best_round')||0;
      return `<div class="wc-hearts">${heartsHtml()}</div>
        <div class="mm-roundrow"><span>Round <strong>${round}</strong></span><span>Best <strong>${Math.max(best,round-1)}</strong></span></div>
        ${extra||''}`;
    }

    function showPhaseToast(){
      if(m.zen)return;
      if(round===6)toast('⚡ Speed increases!');
      else if(round===11)toast('👻 Interference mode!');
      else if(round===16)toast('👁️ Ghost mode!');
      else if(round===21)toast('🎨 Color memory!');
    }

    function doRound(){
      const gsize=mmGridSize(round);
      const cellCount=gsize*gsize;
      const n=Math.min(cells,cellCount-1,m.max);
      const cellPx=Math.min(54,Math.floor(300/gsize));
      let flashMs=mmFlashMs(round)-speedBonus*100;
      if(flashMs<400)flashMs=400;
      if(m.zen)flashMs=mmFlashMs(round<=10?round:10);
      const colorMode=!m.zen&&round>=21;
      const interference=!m.zen&&round>=11&&round<=15;
      const ghostPhase=m.ghost||(!m.zen&&round>=16);
      showPhaseToast();
      // Fisher-Yates on indices
      const idxs=Array.from({length:cellCount},(_,i)=>i);
      for(let i=idxs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]];}
      const pattern=idxs.slice(0,n);
      // Color order assignment (for color mode)
      const colorOf={};
      if(colorMode)pattern.forEach((idx,i)=>{colorOf[idx]=MM_COLORS[i%MM_COLORS.length];});
      stage.innerHTML=hud(`
        <div class="mm-info" id="mmInfo">Memorize ${n} cell${n>1?'s':''}${colorMode?' (tap in color order: red→blue→green→yellow)':''}</div>
        <div class="mm-gridwrap"><div class="schulte-grid mm-grid" id="mmGrid" style="grid-template-columns:repeat(${gsize},${cellPx}px);max-width:none;"></div></div>`);
      const grid=stage.querySelector('#mmGrid');
      const cellEls=[];
      for(let i=0;i<cellCount;i++){
        const c=$(`<div class="mm-cell" style="width:${cellPx}px;height:${cellPx}px;"></div>`);
        c.dataset.i=i;grid.appendChild(c);cellEls.push(c);
      }
      // Show pattern
      function reveal(){
        pattern.forEach((idx,i)=>{
          const c=cellEls[idx];
          const col=colorMode?colorOf[idx].hex:null;
          if(ghostPhase&&!m.zen&&round>=16){
            // vanish one by one: stagger reveal + hide
            _st(()=>{c.classList.add('mm-flash');if(col){c.style.background=col;c.style.boxShadow='0 0 18px '+col;}},i*Math.max(120,flashMs/n/1.5));
            _st(()=>{c.classList.remove('mm-flash');c.style.background='';c.style.boxShadow='';},i*Math.max(120,flashMs/n/1.5)+flashMs/2);
          } else {
            c.classList.add('mm-flash');
            if(col){c.style.background=col;c.style.boxShadow='0 0 18px '+col;}
          }
        });
        const hideAt=(ghostPhase&&round>=16)?(flashMs+n*Math.max(120,flashMs/n/1.5)):flashMs;
        _st(()=>{
          cellEls.forEach(c=>{c.classList.remove('mm-flash');c.style.background='';c.style.boxShadow='';});
          if(interference)showFakes();else beginRecall();
        },hideAt);
      }
      function showFakes(){
        const avail=Array.from({length:cellCount},(_,i)=>i).filter(i=>!pattern.includes(i));
        for(let i=avail.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[avail[i],avail[j]]=[avail[j],avail[i]];}
        const fakes=avail.slice(0,2);
        fakes.forEach(i=>cellEls[i].classList.add('mm-fake'));
        _st(()=>{fakes.forEach(i=>cellEls[i].classList.remove('mm-fake'));beginRecall();},400);
      }
      function beginRecall(){
        const infoEl=stage.querySelector('#mmInfo');
        if(infoEl)infoEl.textContent=colorMode?'Tap in color order: red→blue→green→yellow':`Tap the ${n} cell${n>1?'s':''}!`;
        const picked=[];
        let roundFailed=false;
        const colorRank={red:0,blue:1,green:2,yellow:3};
        const orderedPattern=colorMode?[...pattern].sort((a,b)=>colorRank[colorOf[a].n]-colorRank[colorOf[b].n]):null;
        cellEls.forEach(c=>{
          c.onclick=()=>{
            if(roundFailed)return;
            const idx=+c.dataset.i;
            if(picked.includes(idx))return;
            let ok;
            if(colorMode){ok=idx===orderedPattern[picked.length];}
            else{ok=pattern.includes(idx);}
            if(ok){
              picked.push(idx);
              c.classList.add('mm-correct');
              if(colorMode){c.style.background=colorOf[idx].hex;c.style.color='#fff';}
              playSound('correct');
              if(picked.length>=n)roundComplete();
            } else {
              roundFailed=true;
              c.classList.add('mm-wrong');
              playSound('wrong');haptic([30,50,30]);mmEdgeFlash();
              loseLife();
            }
          };
        });
      }
      function roundComplete(){
        correctRounds++;totalRounds++;streak++;if(streak>bestStreak)bestStreak=streak;
        if(streak>0&&streak%3===0)speedBonus++;
        haptic(10);
        pattern.forEach((idx,i)=>_st(()=>{cellEls[idx].classList.add('mm-wave');_st(()=>cellEls[idx].classList.remove('mm-wave'),350);},i*60));
        toast(`✅ Round ${round} Complete!`);
        cells=Math.min(cells+1,m.max);
        round++;
        _st(doRound,800);
      }
      reveal();
    }

    function loseLife(){
      lives--;totalRounds++;
      const hearts=stage.querySelectorAll('.wc-heart');
      const h=hearts[lives];
      if(h){h.textContent='💔';h.classList.add('crack','lost');}
      toast('❌ -1 Life');
      if(lives<=0){_st(gameOver,1100);return;}
      _st(doRound,1100);
    }

    function gameOver(){
      const finalRound=round; // round in progress when last life was lost
      const accuracy=totalRounds?Math.round(correctRounds/totalRounds*100):0;
      const prevBest=S('nz_mm_best_round')||0;
      const newPB=finalRound>prevBest;
      if(finalRound>prevBest)setS('nz_mm_best_round',finalRound);
      setS('nz_mm_games',(S('nz_mm_games')||0)+1);
      const accH=S('nz_mm_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_mm_accuracy',accH);
      if(bestStreak>(S('nz_mm_best_streak')||0))setS('nz_mm_best_streak',bestStreak);
      const dc=mmDailyChallenge();
      if(!mmDailyDone()){
        let pass=false;
        if(dc.type==='round')pass=finalRound>=dc.target;
        else if(dc.type==='streak')pass=bestStreak>=dc.target;
        else if(dc.type==='ghost')pass=(mode==='ghost'&&finalRound>=dc.target);
        if(pass){setS('nz_mm_daily_date',todayKey());setS('nz_mm_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const rank=mmRank(finalRound);
      setScore(finalRound);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Reached Round ${finalRound}${newPB?' · 🏆 New Best!':''}`,
        value:finalRound,points:finalRound*8,starThresh:[8,15,22],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Round Reached</span><span class="val">${finalRound}</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(finalRound,prevBest)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}%</span></div>
          <div class="row"><span>Longest Streak</span><span class="val">${bestStreak}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${finalRound*8}</span></div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    doRound();
  }
}

/* ===================== PATTERN IQ ===================== */
const PAT_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24','#EF4444','#06B6D4'];
const PAT_SHAPES=['●','■','▲','◆','★','⬟','⬡','✦'];
let _lastNumSeqIdx=-1,_lastSpecialIdx=-1,_lastLetterIdx=-1;
function genNumSeq(){
  const types=[
    ()=>{const s=Math.floor(Math.random()*5)+1,a=Math.floor(Math.random()*10)+2;return{seq:[s,s+a,s+2*a,s+3*a],ans:s+4*a};},
    ()=>{const s=Math.floor(Math.random()*3)+2,a=Math.floor(Math.random()*3)+2;return{seq:[s,s*a,s*a*a,s*a*a*a],ans:s*a*a*a*a};},
    ()=>{const s1=Math.floor(Math.random()*5)+1,s2=Math.floor(Math.random()*5)+3;return{seq:[s1,s2,s1+s2,s1+2*s2],ans:2*s1+3*s2};},
    ()=>{const a=Math.floor(Math.random()*4)+2,b=Math.floor(Math.random()*3)+2;return{seq:[a,b,a+b,b*2],ans:a+b+b*2};},
    ()=>{const d=Math.floor(Math.random()*3)+2,s=Math.floor(Math.random()*10)+25;const a1=s-d,a2=a1-(d+1),a3=a2-(d+2);return{seq:[s,a1,a2,a3],ans:a3-(d+3)};},
    ()=>{const n=Math.floor(Math.random()*3)+1,f=k=>k*k-1;return{seq:[f(n),f(n+1),f(n+2),f(n+3)],ans:f(n+4)};},
    ()=>{const ds=x=>String(x).split('').reduce((a,b)=>a+ +b,0);const seq=[Math.floor(Math.random()*8)+6];for(let i=0;i<3;i++)seq.push(seq[seq.length-1]+ds(seq[seq.length-1]));return{seq,ans:seq[3]+ds(seq[3])};},
  ];
  let i=Math.floor(Math.random()*types.length);
  if(types.length>1&&i===_lastNumSeqIdx)i=(i+1)%types.length;
  _lastNumSeqIdx=i;
  return types[i]();
}
function genSpecialSeq(){
  const types=[
    ()=>{const a=Math.floor(Math.random()*3)+1,b=Math.floor(Math.random()*3)+2;const s=[a,b,a+b,a+2*b,2*a+3*b];return{seq:s.slice(0,4),ans:s[4],label:'Fibonacci-like'};},
    ()=>{const n=Math.floor(Math.random()*4)+1;return{seq:[n*n,(n+1)*(n+1),(n+2)*(n+2),(n+3)*(n+3)],ans:(n+4)*(n+4),label:'Squares'};},
    ()=>{const primes=[2,3,5,7,11,13,17,19,23];const start=Math.floor(Math.random()*5);return{seq:primes.slice(start,start+4),ans:primes[start+4],label:'Primes'};},
    ()=>{const a=Math.floor(Math.random()*5)+2,b=2;const s=Math.floor(Math.random()*3)+2;const seq=[s,s+a,(s+a)*b,(s+a)*b+a];return{seq,ans:seq[3]*b,label:'Alternating ×/'};},
    ()=>{const n=Math.floor(Math.random()*3)+1,tri=k=>k*(k+1)/2;return{seq:[tri(n),tri(n+1),tri(n+2),tri(n+3)],ans:tri(n+4),label:'Triangular'};},
    ()=>{const c=Math.floor(Math.random()*4),p=k=>Math.pow(2,k)+c,s=Math.floor(Math.random()*2)+1;return{seq:[p(s),p(s+1),p(s+2),p(s+3)],ans:p(s+4),label:'Powers of 2 +c'};},
  ];
  let i=Math.floor(Math.random()*types.length);
  if(i===_lastSpecialIdx)i=(i+1)%types.length;
  _lastSpecialIdx=i;
  return types[i]();
}
function genLetterSeq(){
  let type=Math.floor(Math.random()*3);
  if(type===_lastLetterIdx)type=(type+1)%3;
  _lastLetterIdx=type;
  if(type===0){
    const skip=Math.floor(Math.random()*3)+1;
    const start=Math.floor(Math.random()*8);
    const seq=Array.from({length:4},(_,i)=>String.fromCharCode(65+start+i*(skip+1)));
    const ans=String.fromCharCode(65+start+4*(skip+1));
    if(ans.charCodeAt(0)>90)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+Math.floor(Math.random()*26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans)};
  } else if(type===1){
    const startC=Math.floor(Math.random()*6)+16;
    const skip=Math.floor(Math.random()*2)+1;
    const seqR=Array.from({length:4},(_,i)=>String.fromCharCode(startC-i*skip));
    const ansR=String.fromCharCode(startC-4*skip);
    if(ansR.charCodeAt(0)<65)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+Math.floor(Math.random()*26));if(!dist.includes(c)&&c!==ansR)dist.push(c);}
    const opts=[ansR,...dist].sort(()=>Math.random()-.5);
    return{seq:seqR,opts,answerIdx:opts.indexOf(ansR)};
  } else {
    const d0=Math.floor(Math.random()*2)+2;
    const start=Math.floor(Math.random()*3);
    const p1=start+d0,p2=p1+d0+1,p3=p2+d0+2,ansP=p3+d0+3;
    if(ansP>25)return genLetterSeq();
    const seq=[start,p1,p2,p3].map(p=>String.fromCharCode(65+p));
    const ans=String.fromCharCode(65+ansP);
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+Math.floor(Math.random()*26));if(!dist.includes(c)&&c!==ans&&!seq.includes(c))dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans)};
  }
}
function genRomanSeq(){
  const toRoman=n=>{
    const vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r='';vals.forEach((v,i)=>{while(n>=v){r+=syms[i];n-=v;}});return r;
  };
  const step=Math.floor(Math.random()*4)+1;
  const start=Math.floor(Math.random()*8)+1;
  const nums=[start,start+step,start+2*step,start+3*step];
  const ans=start+4*step;
  const dist=new Set([ans]);
  while(dist.size<4){const d=ans+Math.floor(Math.random()*6)-3;if(d>0)dist.add(d);}
  const opts=[...dist].sort(()=>Math.random()-.5);
  return{seq:nums.map(toRoman),opts:opts.map(toRoman),answerIdx:opts.indexOf(ans)};
}
function playPattern(body,setScore,end,wrap,startClock){
  const record=S('nz_pattern_best')||0;
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">Pattern dhundo aur sahi answer chunno! Endless — 3 lives ❤️ jab tak khatam na ho.<br><span style="font-size:11px;color:var(--primary);">⚡ 2 seconds mein jawab = Speed Bonus +1 · ❌ galat/timeout = -1 life</span>${record?`<div style="margin-top:6px;font-size:12px;font-weight:700;color:var(--mint);">🏆 Best: ${record}</div>`:''}<br>
  <button style="margin-top:10px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="patStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);
  let q=0,score=0,bonus=0,arcTimer=null,qStartTs=0,lives=3,streak=0,bestStreak=0;
  const typeHistory=[];
  function pickType(){
    const all=[0,1,2,3,4,5,6,7,8,9];
    const recent=typeHistory.slice(-2);
    let avail=all.filter(t=>!recent.includes(t));
    if(avail.length===0)avail=all;
    const t=avail[Math.floor(Math.random()*avail.length)];
    typeHistory.push(t);
    while(typeHistory.length>5)typeHistory.shift();
    return t;
  }
  function patHearts(){return `<div class="wc-hearts" style="margin-bottom:6px;">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;}
  function patLoseLife(){
    lives--;streak=0;haptic([30,50,30]);toast('❌ -1 Life');
  }
  function showArc(secs,onDone){
    _cti(arcTimer);
    const circ=2*Math.PI*30;
    const arcEl=host.querySelector('#arcSvg');
    if(!arcEl)return;
    let remaining=secs*10;
    arcTimer=_si(()=>{
      remaining--;
      const fg=host.querySelector('#arcFg');
      const num=host.querySelector('#arcNum');
      if(!fg||!num){_cti(arcTimer);return;}
      const pct=remaining/(secs*10);
      fg.style.strokeDashoffset=circ*(1-pct);
      fg.setAttribute('stroke',remaining<15?'#EF4444':remaining<30?'#F59E0B':'#7C3AED');
      num.textContent=Math.ceil(remaining/10);
      if(remaining<=0){_cti(arcTimer);onDone();}
    },100);
  }
  function next(){
    if(lives<=0){
      const total=score+bonus;
      const newPB=score>record;
      if(newPB)setS('nz_pattern_best',score);
      setS('nz_pattern_games',(S('nz_pattern_games')||0)+1);
      if(newPB)confetti(50);
      const acc=q?Math.round(score/q*100):0;
      end({title:newPB?'New Best! 🏆':'Pattern Master! 💡',emoji:'💡',sub:`${score} correct · ${q} attempted${newPB?' · 🏆':''}`,value:total,points:Math.max(5,total*5),starThresh:[8,15,25],
        statsHtml:`<div class="end-stats"><div class="row"><span>Correct</span><span class="val">${score}</span></div><div class="row"><span>Attempted</span><span class="val">${q}</span></div><div class="row"><span>Speed Bonus</span><span class="val">+${bonus}</span></div><div class="row"><span>Accuracy</span><span class="val">${acc}%</span></div><div class="row"><span>Longest Streak</span><span class="val">${bestStreak} 🔥</span></div><div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div></div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`});
      return;
    }
    _cti(arcTimer);
    const type=pickType();
    let answerIdx=0,html='';
    if(type===0){
      const shape=PAT_SHAPES[Math.floor(Math.random()*PAT_SHAPES.length)];
      const cidx1=Math.floor(Math.random()*PAT_COLORS.length);
      let cidx2=cidx1;while(cidx2===cidx1)cidx2=Math.floor(Math.random()*PAT_COLORS.length);
      const seq=[cidx1,cidx2,cidx1];const ans=cidx2;
      const allCols=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans);
      const opts=[ans,...allCols.sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
      answerIdx=opts.indexOf(ans);
      html=`<div class="q-type-badge">COLOR</div>
        <div class="pat-seq">${seq.map(c=>`<div class="pat-item" style="background:${PAT_COLORS[c]}">${shape}</div>`).join('')}<div class="pat-item q">?</div></div>
        <div class="pat-opts">${opts.map((c,i)=>`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;">${shape}</button>`).join('')}</div>`;
    } else if(type===1){
      const {seq,ans}=genNumSeq();
      const distractors=new Set([ans]);
      while(distractors.size<4){const d=ans+Math.floor(Math.random()*20)-10;if(d>0)distractors.add(d);}
      const opts=[...distractors].sort(()=>Math.random()-.5);
      answerIdx=opts.indexOf(ans);
      html=`<div class="q-type-badge">NUMBER</div>
        <div class="pat-seq">${seq.map(n=>`<div class="pat-item" style="background:#7C3AED;font-size:22px;">${n}</div>`).join('')}<div class="pat-item q" style="font-size:22px;">?</div></div>
        <div class="pat-opts">${opts.map((v,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:24px;font-weight:800;">${v}</button>`).join('')}</div>`;
    } else if(type===2){
      const rowShapes=[0,1,2].map(()=>Math.floor(Math.random()*PAT_SHAPES.length));
      const rowCols=[0,1,2].map(()=>Math.floor(Math.random()*PAT_COLORS.length));
      const grid=[];
      for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:rowShapes[r],c:rowCols[c]});
      const missingS=rowShapes[2],missingC=rowCols[2];
      const correct=`${missingS}_${missingC}`;
      const wrongOpts=[];
      while(wrongOpts.length<3){
        const ws=(missingS+(Math.floor(Math.random()*4)+1))%PAT_SHAPES.length;
        const wc=(missingC+(Math.floor(Math.random()*4)+1))%PAT_COLORS.length;
        const k=`${ws}_${wc}`;
        if(!wrongOpts.includes(k)&&k!==correct)wrongOpts.push(k);
      }
      const opts=[correct,...wrongOpts].sort(()=>Math.random()-.5);
      answerIdx=opts.indexOf(correct);
      const cellHTML=grid.map((cell,i)=>i===8?`<div class="pm-cell missing">?</div>`:`<div class="pm-cell" style="background:${PAT_COLORS[cell.c]};color:#fff;">${PAT_SHAPES[cell.s]}</div>`).join('');
      html=`<div class="q-type-badge">MATRIX</div>
        <div class="pat-matrix">${cellHTML}</div>
        <div class="pat-opts">${opts.map((k,i)=>{const[s,c]=k.split('_').map(Number);return`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;">${PAT_SHAPES[s]}</button>`;}).join('')}</div>`;
    } else if(type===3){
      const res=genLetterSeq();
      answerIdx=res.answerIdx;
      html=`<div class="q-type-badge">LETTER</div>
        <div class="pat-seq">${res.seq.map(l=>`<div class="pat-item" style="background:#F472B6;font-size:22px;font-weight:900;">${l}</div>`).join('')}<div class="pat-item q" style="font-size:22px;">?</div></div>
        <div class="pat-opts">${res.opts.map((l,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:24px;font-weight:900;">${l}</button>`).join('')}</div>`;
    } else if(type===4){
      const res=genSpecialSeq();
      const dist=new Set([res.ans]);
      while(dist.size<4){const d=res.ans+Math.floor(Math.random()*20)-10;if(d>0)dist.add(d);}
      const opts=[...dist].sort(()=>Math.random()-.5);
      answerIdx=opts.indexOf(res.ans);
      html=`<div class="q-type-badge">SEQUENCE</div>
        <div style="font-size:10px;color:var(--text2);text-align:center;margin-bottom:4px;">${res.label}</div>
        <div class="pat-seq">${res.seq.map(n=>`<div class="pat-item" style="background:#34D399;font-size:20px;">${n}</div>`).join('')}<div class="pat-item q" style="font-size:20px;">?</div></div>
        <div class="pat-opts">${opts.map((v,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:22px;font-weight:800;">${v}</button>`).join('')}</div>`;
    } else if(type===5){
      const res=genRomanSeq();
      answerIdx=res.answerIdx;
      html=`<div class="q-type-badge">ROMAN</div>
        <div class="pat-seq">${res.seq.map(r=>`<div class="pat-item" style="background:#F97316;font-size:16px;font-weight:900;">${r}</div>`).join('')}<div class="pat-item q" style="font-size:16px;">?</div></div>
        <div class="pat-opts">${res.opts.map((r,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:15px;font-weight:900;">${r}</button>`).join('')}</div>`;
    } else if(type===6){
      // Odd One Out: 3 share a property (color/shape/count), 1 differs
      const oddIdx=Math.floor(Math.random()*4);
      const baseSi=Math.floor(Math.random()*PAT_SHAPES.length);
      const baseCi=Math.floor(Math.random()*PAT_COLORS.length);
      const baseN=Math.floor(Math.random()*2)+1;
      const items=[0,1,2,3].map(()=>({si:baseSi,ci:baseCi,n:baseN}));
      const mode=Math.floor(Math.random()*3);
      if(mode===0){let oc=baseCi;while(oc===baseCi)oc=Math.floor(Math.random()*PAT_COLORS.length);items[oddIdx]={...items[oddIdx],ci:oc};}
      else if(mode===1){let os=baseSi;while(os===baseSi)os=Math.floor(Math.random()*PAT_SHAPES.length);items[oddIdx]={...items[oddIdx],si:os};}
      else {let on=baseN;while(on===baseN)on=Math.floor(Math.random()*3)+1;items[oddIdx]={...items[oddIdx],n:on};}
      answerIdx=oddIdx;
      html=`<div class="q-type-badge">ODD ONE OUT</div>
        <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:10px;">Jo alag hai usse tap karo</div>
        <div class="pat-opts">${items.map((it,i)=>`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[it.ci]};color:#fff;font-size:22px;letter-spacing:3px;">${PAT_SHAPES[it.si].repeat(it.n)}</button>`).join('')}</div>`;
    } else if(type===7){
      // Analogy: 2 known pairs + 1 to complete (rule: sides+1 OR color swap)
      const ladder=['▲','■','⬟','⬡'];
      const rule=Math.floor(Math.random()*2);
      let pairs,opts;
      if(rule===0){
        const color='#7C3AED';
        const starts=[0,1,2].sort(()=>Math.random()-.5);
        pairs=starts.map(s=>[{g:ladder[s],c:color},{g:ladder[s+1],c:color}]);
        const ansG=ladder[starts[2]+1];
        pairs[2]=[{g:ladder[starts[2]],c:color},null];
        const cand=ladder.filter(g=>g!==ansG);
        opts=[ansG,...cand.sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5).map(g=>({g,c:color}));
        answerIdx=opts.findIndex(o=>o.g===ansG);
      } else {
        const c1=Math.floor(Math.random()*PAT_COLORS.length);
        let c2=c1;while(c2===c1)c2=Math.floor(Math.random()*PAT_COLORS.length);
        const gl=[...ladder].sort(()=>Math.random()-.5).slice(0,3);
        pairs=gl.map(g=>[{g,c:PAT_COLORS[c1]},{g,c:PAT_COLORS[c2]}]);
        pairs[2]=[{g:gl[2],c:PAT_COLORS[c1]},null];
        const cset=new Set([c2]);while(cset.size<4)cset.add(Math.floor(Math.random()*PAT_COLORS.length));
        opts=[...cset].sort(()=>Math.random()-.5).map(ci=>({g:gl[2],c:PAT_COLORS[ci]}));
        answerIdx=opts.findIndex(o=>o.c===PAT_COLORS[c2]);
      }
      const cell=(o)=>o?`<span class="pat-an-cell" style="background:${o.c};">${o.g}</span>`:`<span class="pat-an-cell q">?</span>`;
      html=`<div class="q-type-badge">ANALOGY</div>
        <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:8px;">Rule samjho, '?' bharo</div>
        <div class="pat-analogy">${pairs.map(pr=>`<div class="pat-an-row">${cell(pr[0])}<span class="pat-an-arrow">→</span>${cell(pr[1])}</div>`).join('')}</div>
        <div class="pat-opts">${opts.map((o,i)=>`<button class="pat-opt" data-i="${i}" style="background:${o.c};color:#fff;">${o.g}</button>`).join('')}</div>`;
    } else if(type===8){
      // Grid Rotation: each row is the previous row rotated 90° (CW arrows)
      const arrows=['↑','→','↓','←'];
      const base=Math.floor(Math.random()*4);
      const grid=[];
      for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push((base+r+c)%4);
      const correct=arrows[grid[8]];
      const opts=[0,1,2,3].sort(()=>Math.random()-.5).map(i=>arrows[i]);
      answerIdx=opts.indexOf(correct);
      const cellHTML=grid.map((v,i)=>i===8?`<div class="pm-cell missing">?</div>`:`<div class="pm-cell" style="background:#4F8EF7;color:#fff;font-size:26px;">${arrows[v]}</div>`).join('');
      html=`<div class="q-type-badge">GRID ROTATION</div>
        <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:8px;">Har row pichhli row se 90° ghoomti hai</div>
        <div class="pat-matrix">${cellHTML}</div>
        <div class="pat-opts">${opts.map((a,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:30px;font-weight:800;">${a}</button>`).join('')}</div>`;
    } else {
      // Mixed Symbol-Number: number increases by step AND shape cycles in fixed order
      const step=Math.floor(Math.random()*3)+2;
      const start=Math.floor(Math.random()*4)+1;
      const cyc=[...Array(PAT_SHAPES.length).keys()].sort(()=>Math.random()-.5).slice(0,3);
      const terms=[0,1,2].map(i=>({num:start+i*step,si:cyc[i%cyc.length]}));
      const nextNum=start+3*step;
      const correct=cyc[3%cyc.length];
      const optSet=new Set([correct]);while(optSet.size<4)optSet.add(Math.floor(Math.random()*PAT_SHAPES.length));
      const opts=[...optSet].sort(()=>Math.random()-.5);
      answerIdx=opts.indexOf(correct);
      html=`<div class="q-type-badge">MIXED</div>
        <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:6px;">Number +${step}, shape cycle — agla shape?</div>
        <div class="pat-seq">${terms.map(t=>`<div class="pat-item" style="background:#06B6D4;font-size:18px;font-weight:800;">${t.num}${PAT_SHAPES[t.si]}</div>`).join('')}<div class="pat-item q" style="font-size:18px;">${nextNum}?</div></div>
        <div class="pat-opts">${opts.map((si,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:28px;">${PAT_SHAPES[si]}</button>`).join('')}</div>`;
    }
    const arcHtml=`<div class="arc-wrap">
      <svg id="arcSvg" width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="30" fill="none" stroke="var(--border)" stroke-width="5"/>
        <circle id="arcFg" cx="35" cy="35" r="30" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="0"/>
      </svg>
      <div class="arc-num" id="arcNum">4</div>
    </div>`;
    host.innerHTML=patHearts()+arcHtml+html+`<div style="text-align:center;margin-top:8px;color:var(--text2);font-size:12px;">Round ${q+1} · ❤️ ${lives}${streak>=2?' · 🔥 '+streak:''}</div>`;
    qStartTs=Date.now();
    showArc(4,()=>{playSound('wrong');patLoseLife();q++;_st(next,700);});
    host.querySelectorAll('.pat-opt').forEach(btn=>{
      btn.onclick=()=>{
        _cti(arcTimer);
        const chosen=+btn.dataset.i;
        const elapsed=Date.now()-qStartTs;
        if(chosen===answerIdx){
          playSound('correct');score++;setScore(score);streak++;if(streak>bestStreak)bestStreak=streak;
          btn.classList.add('correct-ans');
          if(elapsed<2000){
            bonus++;
            const bEl=document.createElement('div');
            bEl.style.cssText='text-align:center;font-size:12px;font-weight:700;color:#F59E0B;margin-top:4px;';
            bEl.textContent='⚡ Speed Bonus! +1';
            host.appendChild(bEl);
          }
        } else {
          playSound('wrong');
          btn.classList.add('wrong-ans');
          host.querySelectorAll('.pat-opt')[answerIdx].classList.add('correct-ans');
          patLoseLife();
        }
        setTimeout(()=>{q++;next();},600);
      };
    });
  }
  instrEl.querySelector('#patStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
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
  ['LANE','LEAN','LAND','LACE'],['MEAT','MEAL','MEAN','TEAM'],
  ['SEAT','SEAL','SEAM','EAST'],['POST','SPOT','STOP','POTS'],
  ['CARE','CARD','CART','CANE'],['HEAT','HATE','HEAL','HEAP'],
  ['LIVE','EVIL','VILE','LIME'],['DUSK','DESK','DISK','DUST'],
  ['FAIL','FAIR','FALL','FILL'],['BOLT','BOOT','BOAT','BOLD'],
  ['RAIN','RUIN','RAID','MAIN'],['SOUP','SOUR','SOUL','SPUR'],
  ['MOON','MOOD','MOOR','NOON'],['GOLD','GOAL','GOLF','COLD'],
  ['PINE','PINT','PILE','PANE'],
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
  ['STONE','TONES','NOTES','STORE'],['BRAKE','BREAK','BAKER','BRACE'],
  ['HEART','EARTH','HEARD','HEARS'],['PLANE','PLANT','PLATE','PLACE'],
  ['SMILE','SLIME','MILES','SMITE'],['CHARM','MARCH','CHART','CHARS'],
  ['DREAM','DRAMA','DREAD','CREAM'],['FROWN','CROWN','BROWN','FROND'],
  ['GRAPE','GRADE','GRACE','GRAVE'],['SPILL','SPELL','SPILT','STILL'],
  ['TRACK','TRICK','TRUCK','CRACK'],['BLOOM','BLOOD','BROOM','BROOD'],
  ['SHEEP','SHEET','SHEER','SHEEN'],['CLOUD','CLOUT','ALOUD','CLOWN'],
  ['STARE','RATES','TEARS','STARK'],
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
  ['CAPITAL','CAPITOL','CAPITALS','CAPABLE'],['WEATHER','WHETHER','WREATHE','WEATHERS'],
  ['QUIETLY','QUICKLY','QUAINTLY','QUALITY'],['THEATER','THEATRE','THEREAT','HEATERS'],
  ['BEARING','BEATING','BEADING','READING'],['CAUTION','CAPTION','AUCTION','CAUSTIC'],
  ['MEASURE','MEASURED','PLEASURE','TREASURE'],['DIAMOND','DIAGRAM','DIAGRAMS','DIAMONDS'],
  ['STRANGE','STRANGER','STRANGLE','STRANDED'],['JOURNEY','JOURNAL','JOURNEYS','JOURNALS'],
];
function playWordFlash(body,setScore,end,wrap,startClock){
  let q=0,score=0,streak=0,bestStreak=0,fastest=null,correctCount=0,lives=3;
  const record=S('nz_wf_best')||0;
  // shuffled, recycling pools
  const pools={1:[...WF_T1].sort(()=>Math.random()-.5),2:[...WF_T2].sort(()=>Math.random()-.5),3:[...WF_T3].sort(()=>Math.random()-.5)};
  const used={1:0,2:0,3:0};
  const recentWords=[]; // last 8 correct answers shown across ALL tiers
  function recordWord(w){recentWords.push(w);while(recentWords.length>8)recentWords.shift();}
  function takeGroup(tier){
    const p=pools[tier];
    let g=p[used[tier]%p.length],tries=0;
    while(recentWords.includes(g[0])&&tries<p.length){
      used[tier]++;
      if(used[tier]%p.length===0)p.sort(()=>Math.random()-.5);
      g=p[used[tier]%p.length];tries++;
    }
    used[tier]++;
    if(used[tier]%p.length===0)p.sort(()=>Math.random()-.5);
    recordWord(g[0]);
    return g;
  }
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
    end({title:newPB?'New Best! 🏆':'Word Flash 📝',emoji:'📝',sub:`${score} pts · ${q} rounds · ${acc}%`,value:score,points:Math.max(5,score*2),starThresh:[20,40,70],
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
    const scramble=q>=11; // Round 12+ : visual scramble flair
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
        <div class="wf-words${scramble?' wf-scramble':''}">${words.map(w=>`<div class="wf-word" style="font-size:${decoy?'26px':'48px'};">${w}</div>`).join('')}</div>
        ${scramble?'<div style="font-size:10px;color:#FBBF24;margin-top:10px;letter-spacing:.12em;font-weight:700;">🔀 SCRAMBLE MODE</div>':''}
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
const WC_WORDS=['Apple','Chair','River','Cloud','Music','Tiger','Bread','Stone','Light','Phone','Dream','Water','House','Paper','Green','Earth','Smile','Train','Dance','Maple','Ocean','Clock','Flame','Brain','Sugar','Grass','Pilot','Queen','Frost','Arrow','Lemon','Storm','Movie','Brush','Radio','Pearl','Eagle','Comet','Prize','Unity','Honey','Cabin','Glove','Torch','Wheat','Coral','Piano','Robin','Maze','Vault','Bloom','Crane','Drift','Ember','Fable','Glide','Harbor','Ivory','Jolly','Kite','Lunar','Meadow','Nectar','Onyx','Plume','Quartz','Ridge','Spark','Tide','Vivid','Whale','Zephyr','Amber','Birch','Cedar','Dune'];
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
      value:final,points:final*2,starThresh:[20,40,60],
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
  easy:{label:'Easy',emoji:'🟢',sub:'Add / subtract',time:6000,ops:['+','-'],zen:false},
  medium:{label:'Medium',emoji:'🟡',sub:'× and ÷ included',time:5000,ops:['+','-','×','÷'],zen:false},
  hard:{label:'Hard',emoji:'🔴',sub:'2-step problems',time:6000,ops:['2step'],zen:false},
  algebra:{label:'Algebra',emoji:'⚡',sub:'Solve for x',time:4500,ops:['alg'],zen:false},
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
  if(qn<=10)return{a:15,b:8,big:10};
  if(qn<=20)return{a:30,b:10,big:20};
  if(qn<=30)return{a:50,b:12,big:35};
  return{a:80,b:15,big:50};
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
      const a=rnd(qn<=10?5:qn<=20?8:10)+1,x=rnd(qn<=20?7:12),b=rnd(qn<=10?8:15);
      return{display:`${a}x + ${b} = ${a*x+b},  x = ?`,correct:x};
    }
    if(m.ops[0]==='2step'){
      const a=rnd(Math.min(10,sc.b)),b=rnd(Math.min(10,sc.b)),c=rnd(sc.b);
      const add=Math.random()>0.5;
      const correct=add?a*b+c:a*b-c;
      return{display:`${a} × ${b} ${add?'+':'−'} ${c}`,correct};
    }
    const op=m.ops[Math.floor(Math.random()*m.ops.length)];
    if(op==='÷'){
      const d=rnd(Math.min(10,sc.b))+1,q2=rnd(Math.min(10,sc.b));
      return{display:`${d*q2} ÷ ${d}`,correct:q2};
    }
    if(op==='×'){
      const a=rnd(Math.min(sc.big,qn<=10?5:qn<=20?10:15)),b=rnd(Math.min(12,sc.b));
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
        value:score,points:Math.max(5,score*3+sdBonus),starThresh:[10,20,35],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Questions Answered</span><span class="val">${q}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}% (${correctCount}/${q})</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,prevBest)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${Math.max(5,score*3+sdBonus)}</span></div>
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
    end({title:newPB?'New Best! 🏆':'Out of Lives! 🎨',emoji:'🎨',sub:`Score: ${score} pts · ${round} rounds`,value:score,points:Math.max(5,score*4),starThresh:[40,80,130],
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

/* ===================== IQ TEST (redesigned) ===================== */
const IQ_POOL=[
  {q:'Sequence: 2, 4, 8, 16, __. Agla number?',opts:['24','32','20','28'],ans:1,cat:'numerical',diff:'easy',exp:'Geometric ×2: 16×2 = 32.'},
  {q:'Sequence: 2, 6, 12, 20, 30, __',opts:['40','42','44','38'],ans:1,cat:'numerical',diff:'medium',exp:'Differences 4,6,8,10,12 → 30+12 = 42.'},
  {q:'Fibonacci: 1, 1, 2, 3, 5, 8, __',opts:['11','13','12','14'],ans:1,cat:'numerical',diff:'easy',exp:'Pichle 2 ka sum: 5+8 = 13.'},
  {q:'450 ka 10% kitna hai?',opts:['40','45','50','55'],ans:1,cat:'numerical',diff:'easy',exp:'450÷10 = 45.'},
  {q:'100 − 17 − 23 − 15 = ?',opts:['45','50','55','42'],ans:0,cat:'numerical',diff:'easy',exp:'83→60→45.'},
  {q:'Kaunsa number 4 aur 6 dono se divisible hai?',opts:['10','14','12','16'],ans:2,cat:'numerical',diff:'easy',exp:'LCM(4,6)=12.'},
  {q:'Sequence: 1, 4, 9, 16, 25, __',opts:['30','36','35','49'],ans:1,cat:'numerical',diff:'medium',exp:'Squares: 6² = 36.'},
  {q:'Sequence: 3, 6, 11, 18, 27, __',opts:['36','38','40','35'],ans:1,cat:'numerical',diff:'medium',exp:'Differences 3,5,7,9,11 → 27+11 = 38.'},
  {q:'Sequence: 1, 2, 6, 24, 120, __',opts:['600','720','480','240'],ans:1,cat:'numerical',diff:'hard',exp:'Factorials ×n: 120×6 = 720.'},
  {q:'25% of 240 = ?',opts:['48','60','50','72'],ans:1,cat:'numerical',diff:'easy',exp:'240÷4 = 60.'},
  {q:'Average of 10, 20, 30, 40 = ?',opts:['20','25','30','22'],ans:1,cat:'numerical',diff:'easy',exp:'100÷4 = 25.'},
  {q:'Ek train 60km/h se 2 ghante chalti hai. Doori?',opts:['60km','100km','120km','180km'],ans:2,cat:'numerical',diff:'easy',exp:'60×2 = 120km.'},
  {q:'Koi 90km 1.5 ghante mein. Speed?',opts:['45km/h','60km/h','90km/h','30km/h'],ans:1,cat:'numerical',diff:'medium',exp:'90÷1.5 = 60.'},
  {q:'3 hafte mein kitne din?',opts:['18','21','24','28'],ans:1,cat:'numerical',diff:'easy',exp:'3×7 = 21.'},
  {q:'6×4=24, 5×3=15, to 7×5=?',opts:['30','35','40','45'],ans:1,cat:'numerical',diff:'easy',exp:'7×5 = 35.'},
  {q:'5 logon ki line mein Rahul 3rd hai. Uske baad kitne log?',opts:['1','2','3','4'],ans:1,cat:'logic',diff:'easy',exp:'5−3 = 2.'},
  {q:'Neha, Priya se 3 saal badi. 5 saal baad Priya 20. Abhi Neha?',opts:['18','23','22','20'],ans:0,cat:'logic',diff:'medium',exp:'Priya=15, Neha=18.'},
  {q:'3 cats 3 mice ko 3 min mein pakadti hain. 100 mice ke liye kitni cats?',opts:['100','33','3','10'],ans:2,cat:'logic',diff:'medium',exp:'1 cat=1 mouse/3min, to 3 cats kaafi.'},
  {q:'A ki umar B se double. Dono ka sum 36. B ki umar?',opts:['9','10','12','14'],ans:2,cat:'logic',diff:'medium',exp:'3B=36 → B=12.'},
  {q:'Aaj Wednesday hai. 10 din baad kaunsa din?',opts:['Monday','Friday','Saturday','Sunday'],ans:2,cat:'logic',diff:'medium',exp:'Wed+7=Wed, +3=Saturday.'},
  {q:'Algebra: 3x − 7 = 14. x = ?',opts:['5','6','7','8'],ans:2,cat:'logic',diff:'hard',exp:'3x=21 → x=7.'},
  {q:'Sab roses flowers hain. Kuch flowers fade jaate hain. To?',opts:['Sab roses fade','Kuch roses fade ho sakte','Koi rose fade nahi','Roses flowers nahi'],ans:1,cat:'logic',diff:'hard',exp:'Sirf kuch roses fade ho sakte hain — valid.'},
  {q:'Ek ghadi roz 5 min slow hoti hai. 12 ghante mein kitni slow?',opts:['2.5 min','5 min','1 min','10 min'],ans:0,cat:'logic',diff:'hard',exp:'5min/24h → 12h mein 2.5 min.'},
  {q:'Agar MANGO ka code 50 hai (A=1..). APPLE ka code?',opts:['50','51','52','53'],ans:0,cat:'verbal',diff:'medium',exp:'1+16+16+12+5 = 50.'},
  {q:'Odd one out: Cat, Dog, Rose, Lion',opts:['Cat','Dog','Rose','Lion'],ans:2,cat:'verbal',diff:'easy',exp:'Rose plant hai.'},
  {q:'BOOK : READING :: FORK : ?',opts:['Kitchen','Eating','Spoon','Metal'],ans:1,cat:'verbal',diff:'easy',exp:'Book reading ke liye, fork eating ke liye.'},
  {q:'Ephemeral ka matlab?',opts:['Permanent','Short-lived','Heavy','Bright'],ans:1,cat:'verbal',diff:'hard',exp:'Ephemeral = bahut short-lived.'},
  {q:'Odd one out: Apple, Mango, Carrot, Banana',opts:['Apple','Mango','Carrot','Banana'],ans:2,cat:'verbal',diff:'easy',exp:'Carrot vegetable hai.'},
  {q:'HOT : COLD :: UP : ?',opts:['Sky','Down','High','Top'],ans:1,cat:'verbal',diff:'easy',exp:'Opposites: up↔down.'},
  {q:'Agar CIPHER reverse karo to?',opts:['REHPIC','REPHIC','RHEPIC','REHPCI'],ans:0,cat:'verbal',diff:'medium',exp:'C-I-P-H-E-R → R-E-H-P-I-C.'},
  {q:'Benevolent ka matlab?',opts:['Cruel','Kind','Lazy','Angry'],ans:1,cat:'verbal',diff:'medium',exp:'Benevolent = kind/generous.'},
  {q:'Letter sequence: A, C, E, G, __',opts:['H','I','J','K'],ans:1,cat:'pattern',diff:'easy',exp:'+2 har baar → I.'},
  {q:'Letter sequence: Z, X, V, T, __',opts:['P','Q','R','S'],ans:2,cat:'pattern',diff:'medium',exp:'−2 har baar → R.'},
  {q:'Series: AZ, BY, CX, __',opts:['DV','DW','EW','DX'],ans:1,cat:'pattern',diff:'medium',exp:'Aage A,B,C,D; peeche Z,Y,X,W → DW.'},
  {q:'Series: J, F, M, A, M, __ (mahine)',opts:['J','A','S','O'],ans:0,cat:'pattern',diff:'medium',exp:'Jan..May,June → J.'},
  {q:'Pattern: 1A, 2B, 3C, 4D, __',opts:['5E','5F','6E','4E'],ans:0,cat:'pattern',diff:'easy',exp:'Number+1, letter next → 5E.'},
  {q:'Series: 2, A, 4, B, 6, C, 8, __',opts:['D','E','9','10'],ans:0,cat:'pattern',diff:'medium',exp:'Even numbers + A,B,C,D → D.'},
  {q:'Ghadi mein 3:15 hain. Hour aur minute hand ke beech angle?',opts:['0°','7.5°','15°','30°'],ans:1,cat:'spatial',diff:'hard',exp:'Hour=97.5°, Minute=90° → 7.5°.'},
  {q:'Ek square ka perimeter 40cm. Area?',opts:['80cm²','100cm²','160cm²','40cm²'],ans:1,cat:'spatial',diff:'medium',exp:'Side 10 → 100cm².'},
  {q:'Mirror image mein REPLIT?',opts:['TILPER','TILEPR','TIRPLE','TIPREL'],ans:0,cat:'spatial',diff:'medium',exp:'Reverse → TILPER.'},
  {q:'Ek triangle ke angles 60° aur 70°. Teesra?',opts:['40°','50°','60°','70°'],ans:1,cat:'spatial',diff:'easy',exp:'180−60−70 = 50°.'},
  {q:'Ek cube ki kitni faces?',opts:['4','8','6','12'],ans:2,cat:'spatial',diff:'easy',exp:'Cube = 6 faces.'},
  {q:'Ek cube ke kitne edges hote hain?',opts:['8','10','12','6'],ans:2,cat:'spatial',diff:'medium',exp:'Cube = 12 edges.'},
  {q:'Circle ko 4 baar half-fold karo to kitne layers?',opts:['8','16','4','12'],ans:1,cat:'spatial',diff:'hard',exp:'2⁴ = 16 layers.'},
  {q:'Rectangle 8×6. Diagonal kitni?',opts:['10','12','14','9'],ans:0,cat:'spatial',diff:'medium',exp:'√(64+36)=√100=10.'},
];
const IQ_CATS={logic:{label:'Logic',color:'#7C3AED'},numerical:{label:'Numerical',color:'#4F8EF7'},verbal:{label:'Verbal',color:'#34D399'},spatial:{label:'Spatial',color:'#F97316'},pattern:{label:'Pattern',color:'#F472B6'}};
const IQ_DIFF_W={easy:1,medium:1.5,hard:2.2};
const IQ_TIMER={easy:25000,medium:20000,hard:14000};
const IQ_N=10;
function iqClassify(iq){
  if(iq>=140)return{label:'Genius',pct:99};
  if(iq>=130)return{label:'Very Superior',pct:98};
  if(iq>=120)return{label:'Superior',pct:91};
  if(iq>=110)return{label:'Above Average',pct:75};
  if(iq>=90)return{label:'Average',pct:50};
  if(iq>=80)return{label:'Below Average',pct:25};
  return{label:'Keep Practicing',pct:9};
}
function playIQTest(body,setScore,end,wrap,startClock){
  const pool=[...IQ_POOL];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const QS=pool.slice(0,IQ_N);
  let qi=0,correct=0,weightSum=0,weightGot=0,speedSum=0,speedCount=0,fastest=null;
  const catStats={};
  Object.keys(IQ_CATS).forEach(c=>catStats[c]={got:0,total:0});
  const host=$(`<div style="padding:0 4px;"></div>`);
  body.appendChild(host);
  const bestIQ=S('nz_iq_best')||0;
  const intro=$(`<div class="instr" style="margin-bottom:14px;"><strong>🧩 IQ Test</strong><br>${IQ_N} random reasoning questions — Logic, Numerical, Verbal, Spatial & Pattern.<br><span style="font-size:11px;color:var(--primary);">Faster + harder correct answers = higher IQ.</span>${bestIQ?`<div style="margin-top:6px;font-size:12px;font-weight:700;color:var(--mint);">🏆 Best IQ: ${bestIQ}</div>`:''}<br><button class="start-btn" id="iqStart" style="margin-top:10px;">Start Test ▶</button></div>`);
  body.appendChild(intro);
  intro.querySelector('#iqStart').onclick=()=>{intro.remove();startClock&&startClock();showQ();};
  function finish(){
    const wAcc=weightSum?weightGot/weightSum:0;
    const speedFactor=speedCount?Math.max(0,Math.min(1,1-(speedSum/speedCount))):0.5;
    let iq=Math.round(60+wAcc*80+(speedFactor-0.5)*16);
    iq=Math.max(55,Math.min(160,iq));
    const cls=iqClassify(iq);
    const prevBest=S('nz_iq_best')||0;
    const newPB=iq>prevBest;
    if(newPB)setS('nz_iq_best',iq);
    setS('nz_iq_games',(S('nz_iq_games')||0)+1);
    setScore(iq);
    if(newPB)confetti(60);
    const catRows=Object.keys(catStats).filter(c=>catStats[c].total>0).map(c=>{
      const st=catStats[c];const pctv=Math.round(st.got/st.total*100);
      return `<div class="iq-cat-row"><span class="iq-cat-name" style="color:${IQ_CATS[c].color}">${IQ_CATS[c].label}</span><span class="iq-cat-bar"><span class="iq-cat-fill" style="width:${pctv}%;background:${IQ_CATS[c].color}"></span></span><span class="iq-cat-val">${st.got}/${st.total}</span></div>`;
    }).join('');
    const gPct=Math.round((iq-55)/(160-55)*100);
    const circ=Math.round(2*Math.PI*52);
    const gauge=`<div class="iq-gauge"><svg width="150" height="150" viewBox="0 0 120 120" style="transform:rotate(-90deg);"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/><circle id="iqArc" cx="60" cy="60" r="52" fill="none" stroke="url(#iqG)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/><defs><linearGradient id="iqG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3AED"/><stop offset="1" stop-color="#34D399"/></linearGradient></defs></svg><div class="iq-gauge-inner"><div class="iq-gauge-num" id="iqNum">0</div><div class="iq-gauge-lbl">IQ</div></div></div>`;
    end({
      title:cls.label,emoji:'🧩',
      sub:`Top ${100-cls.pct}% · ${correct}/${IQ_N} correct${newPB?' · 🏆 New Best!':''}`,
      value:iq,points:Math.max(10,Math.round((iq-55)*0.9)),starThresh:[90,110,130],
      statsHtml:`${gauge}<div class="end-stats"><div class="row"><span>Estimated IQ</span><span class="val">${iq}</span></div><div class="row"><span>Classification</span><span class="val">${cls.label}</span></div><div class="row"><span>Percentile</span><span class="val">Top ${100-cls.pct}%</span></div><div class="row"><span>Correct</span><span class="val">${correct}/${IQ_N}</span></div><div class="row"><span>Fastest Answer</span><span class="val">${fastest!=null?(fastest/1000).toFixed(1)+'s':'—'}</span></div><div class="row"><span>Personal Best</span><span class="val">${Math.max(iq,prevBest)}${newPB?' 🏆':''}</span></div></div><div class="iq-cats"><div class="iq-cats-title">Category Breakdown</div>${catRows}</div>${newPB?'<div class="rec">New Best IQ! 🎉</div>':''}`
    });
    _st(()=>{
      const arc=wrap.querySelector('#iqArc');const num=wrap.querySelector('#iqNum');
      if(arc){arc.style.transition='stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)';arc.style.strokeDashoffset=circ*(1-gPct/100);}
      if(num){const start=performance.now();const tick=t=>{const k=Math.min(1,(t-start)/1400);const e=1-Math.pow(1-k,3);num.textContent=Math.round(iq*e);if(k<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
    },60);
  }
  function showQ(){
    if(qi>=QS.length){finish();return;}
    const {q,opts,ans,diff,exp,cat}=QS[qi];
    const w=IQ_DIFF_W[diff]||1;
    weightSum+=w;catStats[cat].total++;
    const timeMs=IQ_TIMER[diff]||20000;
    const lvl=diff==='easy'?{label:'🟢 Easy',color:'#22C55E'}:diff==='medium'?{label:'🟡 Medium',color:'#EAB308'}:{label:'🔴 Hard',color:'#EF4444'};
    const catInfo=IQ_CATS[cat];
    let barT=null,elapsed=0,answered=false;
    const tsStart=Date.now();
    host.innerHTML=`<div class="timer-bar"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:12px;font-weight:700;color:${lvl.color}">${lvl.label}</span><span class="iq-cat-chip" style="background:${catInfo.color}">${catInfo.label}</span><span style="font-size:12px;font-weight:700;color:var(--text2)">Q${qi+1}/${IQ_N}</span></div><div style="font-size:15px;font-weight:600;margin-bottom:14px;line-height:1.5;">${q}</div><div style="display:flex;flex-direction:column;gap:8px;" id="iqOpts">${opts.map((o,i)=>`<button class="math-opt iq-opt" style="text-align:left;padding:12px 14px;font-size:13px;min-height:44px;" data-i="${i}">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div>`;
    function showExp(msg,color){
      const el=document.createElement('div');
      el.style.cssText='margin-top:10px;padding:8px 12px;background:var(--card);border-radius:10px;font-size:12px;line-height:1.5;border-left:3px solid '+color+';';
      el.innerHTML=`<span style="color:${color};font-weight:700;">${msg}</span><br><span style="color:var(--text2);">💡 ${exp}</span>`;
      host.appendChild(el);
    }
    barT=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=wrap.querySelector('#iqBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=timeMs&&!answered){
        _cti(barT);answered=true;
        speedSum+=1;speedCount++;
        host.querySelectorAll('.iq-opt').forEach((b,i)=>{if(i===ans)b.classList.add('correct-ans');b.disabled=true;});
        showExp("⏱ Time's up!",'#EF4444');
        qi++;_st(showQ,1700);
      }
    },100);
    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        _cti(barT);answered=true;
        const elapsedMs=Date.now()-tsStart;
        speedSum+=Math.min(1,elapsedMs/timeMs);speedCount++;
        if(fastest==null||elapsedMs<fastest)fastest=elapsedMs;
        const chosen=+b.dataset.i;
        if(chosen===ans){
          playSound('correct');correct++;weightGot+=w;catStats[cat].got++;setScore(correct);
          b.classList.add('correct-ans');showExp('✅ Correct!','#22C55E');
        } else {
          playSound('wrong');b.classList.add('wrong-ans');
          host.querySelectorAll('.iq-opt').forEach((x,i)=>{if(i===ans)x.classList.add('correct-ans');});
          showExp('❌ Wrong!','#EF4444');
        }
        host.querySelectorAll('.iq-opt').forEach(x=>x.disabled=true);
        qi++;_st(showQ,1700);
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
      <h3>🏆 Brain Score: ${S('nz_brain_score')}/1000</h3>
      <div style="font-size:12px;opacity:.85;">Keep training to reach 1000!</div>
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
    const pct=Math.min(100,S('nz_brain_score')/10);
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
  {name:'Rain',emoji:'🌧',desc:'Rainfall + thunder'},
  {name:'Ocean',emoji:'🌊',desc:'Waves + seagulls'},
  {name:'Forest',emoji:'🌲',desc:'Wind + birdsong'},
  {name:'White Noise',emoji:'💨',desc:'Breathing rhythm'},
  {name:'Deep Focus',emoji:'🎯',desc:'40Hz binaural beats'},
  {name:'432 Hz',emoji:'🎵',desc:'Natural healing tone'},
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
    // Rain: pink noise + raindrop spikes + low thunder
    const src=ac.createBufferSource();src.buffer=makeNoiseBuffer(ac,'pink');src.loop=true;
    const flt=ac.createBiquadFilter();flt.type='lowpass';flt.frequency.value=3800;flt.Q.value=0.5;
    src.connect(flt);flt.connect(master);src.start();addN(src);
    addT(setInterval(()=>{
      if(relaxAudio.playing!==0)return;
      try{
        const d=ac.createBufferSource();d.buffer=makeNoiseBuffer(ac,'white');
        const df=ac.createBiquadFilter();df.type='bandpass';df.frequency.value=800+Math.random()*4000;df.Q.value=8;
        const dg=ac.createGain();const t=ac.currentTime;
        dg.gain.setValueAtTime(0,t);dg.gain.linearRampToValueAtTime(0.04+Math.random()*0.09,t+0.008);
        dg.gain.exponentialRampToValueAtTime(0.0001,t+0.05+Math.random()*0.09);
        d.onended=()=>{try{d.disconnect();}catch(e){}};
        d.connect(df);df.connect(dg);dg.connect(master);d.start(t);d.stop(t+0.18);
      }catch(e){}
    },120));
    function thunder(){
      addT(setTimeout(()=>{
        if(relaxAudio.playing!==0)return;
        try{
          const r=ac.createOscillator();r.type='sawtooth';r.frequency.value=35+Math.random()*45;
          const rg=ac.createGain();const t=ac.currentTime;
          rg.gain.setValueAtTime(0,t);rg.gain.linearRampToValueAtTime(0.18,t+0.6);
          rg.gain.setValueAtTime(0.18,t+1.8);rg.gain.linearRampToValueAtTime(0,t+3.2);
          r.connect(rg);rg.connect(master);r.start(t);r.stop(t+3.5);
        }catch(e){}
        thunder();
      },30000+Math.random()*40000));
    }
    thunder();
  }else if(idx===1){
    // Ocean: brown noise + 0.08Hz LFO sweeping lowpass 200-800Hz + crashes + seagulls
    const src=ac.createBufferSource();src.buffer=makeNoiseBuffer(ac,'brown');src.loop=true;
    const flt=ac.createBiquadFilter();flt.type='lowpass';flt.frequency.value=500;
    const lfo=ac.createOscillator();const lg=ac.createGain();
    lfo.type='sine';lfo.frequency.value=0.08;lg.gain.value=300;
    lfo.connect(lg);lg.connect(flt.frequency);
    const ng=ac.createGain();ng.gain.value=0.7;
    src.connect(flt);flt.connect(ng);ng.connect(master);
    src.start();lfo.start();addN(src);addN(lfo);
    function crash(){
      addT(setTimeout(()=>{
        if(relaxAudio.playing!==1)return;
        try{
          const c=ac.createBufferSource();c.buffer=makeNoiseBuffer(ac,'white');
          const cf=ac.createBiquadFilter();cf.type='lowpass';cf.frequency.value=1400;
          const cg=ac.createGain();const t=ac.currentTime;
          cg.gain.setValueAtTime(0,t);cg.gain.linearRampToValueAtTime(0.35,t+0.4);cg.gain.exponentialRampToValueAtTime(0.0001,t+2.8);
          c.onended=()=>{try{c.disconnect();}catch(e){}};
          c.connect(cf);cf.connect(cg);cg.connect(master);c.start(t);c.stop(t+3.2);
        }catch(e){}
        crash();
      },5000+Math.random()*6000));
    }
    crash();
    function seagull(){
      addT(setTimeout(()=>{
        if(relaxAudio.playing!==1)return;
        if(Math.random()<0.35){
          try{
            const o=ac.createOscillator();const sg=ac.createGain();
            const t=ac.currentTime;const f=700+Math.random()*700;
            o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.4,t+0.3);o.frequency.linearRampToValueAtTime(f*0.75,t+0.8);
            sg.gain.setValueAtTime(0,t);sg.gain.linearRampToValueAtTime(0.06,t+0.12);sg.gain.linearRampToValueAtTime(0,t+1);
            o.connect(sg);sg.connect(master);o.start(t);o.stop(t+1.1);
          }catch(e){}
        }
        seagull();
      },18000+Math.random()*55000));
    }
    seagull();
  }else if(idx===2){
    // Forest: bandpass wind noise + slow swell LFO + 5 bird generators + cricket bursts
    const src=ac.createBufferSource();src.buffer=makeNoiseBuffer(ac,'white');src.loop=true;
    const flt=ac.createBiquadFilter();flt.type='bandpass';flt.frequency.value=650;flt.Q.value=0.35;
    const wg=ac.createGain();wg.gain.value=0.38;
    src.connect(flt);flt.connect(wg);wg.connect(master);src.start();addN(src);
    const wlfo=ac.createOscillator();const wlg=ac.createGain();
    wlfo.type='sine';wlfo.frequency.value=0.12;wlg.gain.value=0.14;
    wlfo.connect(wlg);wlg.connect(wg.gain);wlfo.start();addN(wlfo);
    for(let bi=0;bi<5;bi++){
      const bFn=()=>{
        if(relaxAudio.playing!==2)return;
        birdChirp(ac,master);
        addT(setTimeout(bFn,3000+Math.random()*7000));
      };
      addT(setTimeout(bFn,Math.random()*6000));
    }
    addT(setInterval(()=>{
      if(relaxAudio.playing!==2)return;
      if(Math.random()<0.55){
        try{
          const o=ac.createOscillator();const cg=ac.createGain();
          o.type='square';o.frequency.value=3200+Math.random()*1800;
          const t=ac.currentTime;
          cg.gain.setValueAtTime(0,t);cg.gain.linearRampToValueAtTime(0.018,t+0.008);
          cg.gain.setValueAtTime(0.018,t+0.04);cg.gain.linearRampToValueAtTime(0,t+0.06);
          o.connect(cg);cg.connect(master);o.start(t);o.stop(t+0.07);
        }catch(e){}
      }
    },300));
  }else if(idx===3){
    // White noise with 0.05Hz breathing LFO on gain
    const src=ac.createBufferSource();src.buffer=makeNoiseBuffer(ac,'white');src.loop=true;
    const flt=ac.createBiquadFilter();flt.type='lowpass';flt.frequency.value=14000;
    const ng=ac.createGain();ng.gain.value=0.48;
    src.connect(flt);flt.connect(ng);ng.connect(master);src.start();addN(src);
    const lfo=ac.createOscillator();const lg=ac.createGain();
    lfo.type='sine';lfo.frequency.value=0.05;lg.gain.value=0.14;
    lfo.connect(lg);lg.connect(ng.gain);lfo.start();addN(lfo);
  }else if(idx===4){
    // Deep Focus: 200Hz left ear + 240Hz right ear binaural + quiet pink noise
    try{
      const oL=ac.createOscillator();const pL=ac.createStereoPanner();const gL=ac.createGain();
      oL.type='sine';oL.frequency.value=200;pL.pan.value=-1;gL.gain.value=0.28;
      oL.connect(gL);gL.connect(pL);pL.connect(master);oL.start();addN(oL);
      const oR=ac.createOscillator();const pR=ac.createStereoPanner();const gR=ac.createGain();
      oR.type='sine';oR.frequency.value=240;pR.pan.value=1;gR.gain.value=0.28;
      oR.connect(gR);gR.connect(pR);pR.connect(master);oR.start();addN(oR);
    }catch(e){
      const o=ac.createOscillator();const g=ac.createGain();
      o.type='sine';o.frequency.value=220;g.gain.value=0.18;
      o.connect(g);g.connect(master);o.start();addN(o);
    }
    const ns=ac.createBufferSource();ns.buffer=makeNoiseBuffer(ac,'pink');ns.loop=true;
    const nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=2800;
    const nsg=ac.createGain();nsg.gain.value=0.1;
    ns.connect(nf);nf.connect(nsg);nsg.connect(master);ns.start();addN(ns);
  }else if(idx===5){
    // 432Hz Healing: primary tone + harmonic + sub + shimmer + soft pink noise, all under a breathing master LFO
    // 1. Primary 432Hz sine, gain 0.15, with slow vibrato (LFO 0.3Hz, depth ±2Hz)
    const o1=ac.createOscillator();const g1=ac.createGain();
    o1.type='sine';o1.frequency.value=432;g1.gain.value=0.15;
    o1.connect(g1);g1.connect(master);o1.start();addN(o1);
    const vib=ac.createOscillator();const vibG=ac.createGain();
    vib.type='sine';vib.frequency.value=0.3;vibG.gain.value=2;
    vib.connect(vibG);vibG.connect(o1.frequency);vib.start();addN(vib);addN(vibG);
    // 2. Harmonic layer 864Hz, gain 0.06
    const o2=ac.createOscillator();const g2=ac.createGain();
    o2.type='sine';o2.frequency.value=864;g2.gain.value=0.06;
    o2.connect(g2);g2.connect(master);o2.start();addN(o2);
    // 3. Sub harmonic 216Hz, gain 0.08
    const o3=ac.createOscillator();const g3=ac.createGain();
    o3.type='sine';o3.frequency.value=216;g3.gain.value=0.08;
    o3.connect(g3);g3.connect(master);o3.start();addN(o3);
    // 4. Gentle shimmer 648Hz (3/2 harmonic), gain 0.04, own slow LFO 0.2Hz
    const o4=ac.createOscillator();const g4=ac.createGain();
    o4.type='sine';o4.frequency.value=648;g4.gain.value=0.04;
    o4.connect(g4);g4.connect(master);o4.start();addN(o4);
    const shim=ac.createOscillator();const shimG=ac.createGain();
    shim.type='sine';shim.frequency.value=0.2;shimG.gain.value=0.025;
    shim.connect(shimG);shimG.connect(g4.gain);shim.start();addN(shim);addN(shimG);
    // 5. Soft pink noise underlayer, gain 0.03, lowpass 300Hz
    const ns=ac.createBufferSource();ns.buffer=makeNoiseBuffer(ac,'pink');ns.loop=true;
    const nf=ac.createBiquadFilter();nf.type='lowpass';nf.frequency.value=300;
    const nsg=ac.createGain();nsg.gain.value=0.03;
    ns.connect(nf);nf.connect(nsg);nsg.connect(master);ns.start();addN(ns);
    // 6. Master breathing LFO: 0.04Hz, oscillates master gain between 0.7 and 1.0
    const breath=ac.createOscillator();const breathG=ac.createGain();
    breath.type='sine';breath.frequency.value=0.04;breathG.gain.value=0.15;
    breath.connect(breathG);breathG.connect(master.gain);breath.start();addN(breath);addN(breathG);
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
      <div style="font-size:10px;color:var(--text2);">${s.desc}</div>
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
      const xp=Math.max(5,finalRound*6+score);
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
  Staircase:[[3,0],[2,1],[1,2],[0,3]],
  Arrow:[[0,2],[1,1],[1,3],[2,0],[2,4]],
  'U-shape':[[0,0],[0,2],[1,0],[1,1],[1,2]],
  'W-shape':[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],
};
const SS_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6'];
const SS_MODES={
  easy:{label:'Easy',emoji:'🟢',sub:'Simple L-shapes',time:10000,zen:false,pool:['L','J']},
  medium:{label:'Medium',emoji:'🟡',sub:'T and Z shapes',time:8000,zen:false,pool:['T','Z','S']},
  hard:{label:'Hard',emoji:'🔴',sub:'Plus / cross shapes',time:6000,zen:false,pool:['Plus','Cross']},
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
  let lastColor=null;
  const shapeHist=[]; // last 2 shape types used this game (anti-repeat)
  function shapeForRound(rn){
    const m=SS_MODES[mode];
    let pool;
    if(m.pool)pool=m.pool;
    else if(rn<5)pool=['L','J'];
    else if(rn<10)pool=['T','Staircase'];
    else if(rn<15)pool=['Z','S','U-shape'];
    else if(rn<20)pool=['Plus','Cross','Arrow'];
    else pool=['Hook','Chair','W-shape'];
    const prev=shapeHist[shapeHist.length-1];
    let cand=pool;
    if(pool.length>1&&prev)cand=pool.filter(s=>s!==prev);
    if(cand.length===0)cand=pool;
    const pick=cand[Math.floor(Math.random()*cand.length)];
    shapeHist.push(pick);while(shapeHist.length>2)shapeHist.shift();
    return pick;
  }
  function pickShapeColor(){
    let c=SS_COLORS[Math.floor(Math.random()*SS_COLORS.length)];
    if(SS_COLORS.length>1&&c===lastColor)c=SS_COLORS[(SS_COLORS.indexOf(c)+1)%SS_COLORS.length];
    lastColor=c;
    return c;
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
    shapeHist.length=0;lastColor=null;
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
      const xp=Math.max(5,finalRound*8);
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
      // fully rotationally-symmetric shapes (e.g. Plus/Cross) have no distinct rotation;
      // fall back to the displayed orientation so the round stays solvable instead of crashing.
      const answer=candidateRots.length?candidateRots[Math.floor(Math.random()*candidateRots.length)]:{c:dispCells,i:dispRot};
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
      const dispSvg=drawShapeSvg(dispCells,26,pickShapeColor());
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
