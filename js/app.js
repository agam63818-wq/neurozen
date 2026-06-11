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
  nz_schulte_level:0,nz_today_games:0
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
  return pts;
}

/* ===================== NAV / RENDER ===================== */
let currentTab='home';
const tabs=['home','games','progress','relax','profile'];
function render(tab,dir){
  if(!dir)dir=tabs.indexOf(tab)>tabs.indexOf(currentTab)?'fwd':'back';
  currentTab=tab;
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
      const isNew=!best;
      const todayFeatured=GAMES[new Date().getDay()%GAMES.length].id===g.id;
      const c=$(`<div class="gcard" style="background:${g.bg}">
        ${isNew?'<div class="new-badge">NEW</div>':''}
        ${todayFeatured?'<div class="featured-badge">★ TODAY</div>':''}
        <div class="gico" style="background:${g.iconBg}">${g.icon}</div>
        <div class="gn">${g.name}</div>
        <div class="gbest">${best?'Best: '+best:'Play to set record!'}</div>
        <div class="grow"><span class="gtag">${g.cat}</span></div>
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
  let state={score:0,timer:null,startTs:Date.now()};
  function hdr(){
    return `<div class="gs-hdr">
      <button class="gs-back">←</button>
      <div class="gs-title">${g.name}</div>
      <span class="gs-tag">${g.cat}</span>
    </div>
    <div class="gs-stats">
      <div class="gs-stat"><div class="v" id="gsTime">0.0s</div><div class="l">Time</div></div>
      <div class="gs-stat"><div class="v" id="gsScore">0</div><div class="l">Score</div></div>
    </div>`;
  }
  function closeGame(){
    clearInterval(state.timer);
    wrap.style.animation='slideUp .25s reverse';
    setTimeout(()=>{wrap.remove();},230);
  }
  function startClock(){
    state.timer=setInterval(()=>{
      const el=wrap.querySelector('#gsTime');
      if(el)el.textContent=((Date.now()-state.startTs)/1000).toFixed(1)+'s';
    },100);
  }
  function setScore(s){state.score=s;const el=wrap.querySelector('#gsScore');if(el)el.textContent=s;}
  function endGame(opts){
    clearInterval(state.timer);
    const secs=((Date.now()-state.startTs)/1000).toFixed(1);
    const best=S('nz_best_scores');
    const isRec=opts.bestVal!==undefined?(!best[id]||opts.bestVal>best[id]):(!best[id]||opts.value>best[id]);
    const recVal=opts.bestVal!==undefined?opts.bestVal:opts.value;
    if(isRec){best[id]=recVal;setS('nz_best_scores',best);}
    const pts=awardScore(Math.max(5,opts.points||10),g.skill,id,opts.value);
    playSound('complete');
    const starThresh=opts.starThresh||[5,10,15];
    const stars=opts.value>=starThresh[2]?3:opts.value>=starThresh[1]?2:opts.value>=starThresh[0]?1:0;
    if(stars===3)confetti(50);
    wrap.innerHTML=`${hdr()}
      <div class="end">
        <div class="em">${opts.emoji||'🎉'}</div>
        <h2>${opts.title||'Well done!'}</h2>
        <div style="color:var(--text2);font-size:13px;margin-bottom:8px;">${opts.sub||''}</div>
        <div class="stars">
          <span class="star ${stars>=1?'lit':''}">⭐</span>
          <span class="star ${stars>=2?'lit':''}">⭐</span>
          <span class="star ${stars>=3?'lit':''}">⭐</span>
        </div>
        <div class="gain">+${pts} Brain Score</div>
        ${isRec?'<div class="rec">✨ New Personal Record!</div>':''}
        ${opts.statsHtml||''}
        <div class="btns">
          <button class="btn-primary" id="again">Play Again</button>
          <button class="btn-share">📋 Share Score</button>
          <button class="btn-ghost" id="back">Back to Games</button>
        </div>
      </div>`;
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
  wrap.querySelector('.gs-back').onclick=closeGame;
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

/* ===================== SCHULTE TABLE ===================== */
const SCHULTE_CONFIGS=[
  {size:3,target:20,mult:1.0,label:'3×3'},
  {size:4,target:45,mult:1.5,label:'4×4'},
  {size:5,target:80,mult:2.0,label:'5×5'},
  {size:6,target:120,mult:2.5,label:'6×6'},
  {size:7,target:160,mult:3.0,label:'7×7'},
  {size:8,target:200,mult:3.5,label:'8×8'},
  {size:9,target:250,mult:4.0,label:'9×9'},
];
function playSchulte(body,setScore,end,wrap,startClock){
  const lvl=Math.min(6,S('nz_schulte_level')||0);
  const cfg=SCHULTE_CONFIGS[lvl];
  const ghostMode=lvl>=3;
  const total=cfg.size*cfg.size;
  const nums=Array.from({length:total},(_,i)=>i+1).sort(()=>Math.random()-.5);
  // Personal best leaderboard
  const bestTimes=S('nz_schulte_best_times')||{};
  const topTimes=(bestTimes[cfg.size]||[]).slice(0,3);
  const lbHtml=topTimes.length
    ?`<div style="margin-top:8px;font-size:11px;color:var(--text2);">🏆 Best (${cfg.label}): ${topTimes.map((t,i)=>['🥇','🥈','🥉'][i]+' '+t+'s').join(' · ')}</div>`:''
  ;
  const instrEl=$(`<div class="instr">Tap <strong>1 → ${total}</strong> in order as fast as you can.<br><em>${cfg.label} — Level ${lvl+1}/7${ghostMode?' · <strong style="color:#A78BFA;">👻 Ghost Mode</strong>: numbers vanish in 2s!':''}</em>${lbHtml}<br><button style="margin-top:12px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;font-size:14px;" id="schulteStart">▶ Start</button></div>`);
  body.appendChild(instrEl);
  instrEl.querySelector('#schulteStart').onclick=()=>{instrEl.style.display='none';startClock&&startClock();};
  const timerBar=$(`<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>`);
  body.appendChild(timerBar);
  const fs=cfg.size<=4?'22px':cfg.size<=6?'16px':cfg.size<=7?'13px':'11px';
  const grid=$(`<div class="schulte-grid" style="grid-template-columns:repeat(${cfg.size},1fr);font-size:${fs};"></div>`);
  body.appendChild(grid);
  const status=$(`<div style="text-align:center;font-size:13px;color:var(--text2);margin-top:10px;" id="sStatus">Find: <strong>1</strong></div>`);
  body.appendChild(status);
  let next=1,startTs=null,barTimer=null,ghostDone=false;
  const cells=[];
  nums.forEach(n=>{
    const c=$(`<div class="sc-cell">${n}</div>`);
    c.onclick=()=>{
      if(!startTs){
        startTs=Date.now();startBar();
        if(ghostMode){
          setTimeout(()=>{
            if(!ghostDone){
              ghostDone=true;
              cells.forEach(cell=>{if(!cell.classList.contains('done'))cell.style.color='transparent';});
            }
          },2000);
        }
      }
      if(n===next){
        playSound('correct');
        c.classList.add('done');
        c.style.color='';
        setScore(next);next++;
        status.innerHTML=next<=total?`Find: <strong>${next}</strong>`:'';
        if(next>total){
          clearInterval(barTimer);
          const secs=(Date.now()-startTs)/1000;
          const secsR=Math.round(secs*10)/10;
          // Save to leaderboard
          const bt=S('nz_schulte_best_times')||{};
          const arr=(bt[cfg.size]||[]);
          arr.push(secsR);arr.sort((a,b)=>a-b);
          bt[cfg.size]=arr.slice(0,3);
          setS('nz_schulte_best_times',bt);
          const rawPts=Math.ceil(1000/secs)*cfg.mult;
          setS('nz_schulte_level',Math.min(6,lvl+1));
          const nlvl=Math.min(6,lvl+1);
          end({
            title:'Grid Clear! 🏆',emoji:'🏆',
            sub:`${secsR}s · ${cfg.label}${ghostMode?' 👻':''}`,
            value:Math.round(rawPts),points:Math.round(rawPts),
            starThresh:[Math.round(rawPts*0.5),Math.round(rawPts*0.8),rawPts],
            statsHtml:`<div class="end-stats"><div class="row"><span>Time</span><span class="val">${secsR}s</span></div><div class="row"><span>Grid</span><span class="val">${cfg.label}${ghostMode?' 👻':''}</span></div><div class="row"><span>Next Level</span><span class="val">${SCHULTE_CONFIGS[nlvl].label}</span></div>${arr.length>0?`<div class="row"><span>🥇 Personal Best</span><span class="val">${arr[0]}s</span></div>`:''}</div>`
          });
        }
      } else {
        playSound('wrong');
        c.classList.add('wrong');
        setTimeout(()=>c.classList.remove('wrong'),350);
      }
    };
    cells.push(c);
    grid.appendChild(c);
  });
  function startBar(){
    const maxMs=cfg.target*1000;
    barTimer=setInterval(()=>{
      const elapsed=Date.now()-startTs;
      const pct=Math.max(0,100-(elapsed/maxMs*100));
      const bar=wrap.querySelector('#sBar');
      if(bar){
        bar.style.width=pct+'%';
        const rem=(maxMs-elapsed)/1000;
        bar.className='timer-fill '+(rem<10?'timer-red':rem<30?'timer-yellow':'timer-green');
      }
    },100);
  }
}

/* ===================== MEMORY MATRIX ===================== */
function playMemory(body,setScore,end,wrap,startClock){
  const ROUNDS=[
    {g:3,c:3},{g:4,c:4},{g:4,c:5},{g:5,c:6},{g:5,c:8},
    {g:6,c:9},{g:6,c:11},{g:7,c:12}
  ];
  const maxScore=ROUNDS.reduce((a,r)=>a+r.c,0);
  let round=0,total=0;
  const instrBox=$(`<div class="instr" style="margin-bottom:16px;">Highlighted cells yaad karo, phir tap karo!<br><span style="font-size:11px;color:var(--primary);">Round 5+ mein 👻 interference mode on hoga!</span><br>
    <button style="margin-top:12px;padding:10px 28px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;font-size:14px;" id="memStart">▶ Start</button>
  </div>`);
  body.appendChild(instrBox);
  instrBox.querySelector('#memStart').onclick=()=>{instrBox.remove();startClock&&startClock();doRound();};
  function doRound(){
    const cfg=ROUNDS[round];
    const cellCount=cfg.g*cfg.g;
    const cellSize=Math.min(52,Math.floor(280/cfg.g));
    const interference=round>=4;
    while(body.lastChild)body.removeChild(body.lastChild);
    const info=document.createElement('div');
    info.style.cssText='text-align:center;font-size:13px;color:var(--text2);font-weight:600;margin-bottom:10px;';
    info.textContent=`Round ${round+1}/8 — ${cfg.c} cells yaad karo${interference?' 👻':''}`;
    info.id='memInfo';
    body.appendChild(info);
    const gridWrap=document.createElement('div');
    gridWrap.style.cssText='position:relative;display:flex;justify-content:center;';
    const grid=document.createElement('div');
    grid.id='memGrid';
    grid.style.cssText=`display:grid;grid-template-columns:repeat(${cfg.g},${cellSize}px);gap:6px;`;
    const cells=[];
    for(let i=0;i<cellCount;i++){
      const c=document.createElement('div');
      c.style.cssText=`width:${cellSize}px;height:${cellSize}px;background:var(--card);border-radius:10px;box-shadow:var(--shadow);transition:all .2s;cursor:pointer;`;
      c.dataset.i=i;
      grid.appendChild(c);
      cells.push(c);
    }
    gridWrap.appendChild(grid);
    body.appendChild(gridWrap);
    // Visual SVG arc countdown
    const circ=2*Math.PI*24;
    const cdWrap=document.createElement('div');
    cdWrap.style.cssText='text-align:center;margin-top:10px;position:relative;';
    cdWrap.innerHTML=`<svg width="60" height="60" viewBox="0 0 60 60" style="transform:rotate(-90deg);">
      <circle cx="30" cy="30" r="24" fill="none" stroke="var(--border)" stroke-width="5"/>
      <circle id="cdArc" cx="30" cy="30" r="24" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
    </svg>
    <div id="cdNum" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22px;font-weight:900;color:var(--text);">3</div>`;
    body.appendChild(cdWrap);
    let count=3;
    const cdInt=setInterval(()=>{
      count--;
      const cdArc=body.querySelector('#cdArc');
      const cdNum=body.querySelector('#cdNum');
      if(cdArc)cdArc.style.strokeDashoffset=circ*(1-count/3);
      if(count>0){if(cdNum)cdNum.textContent=count;}
      else{
        clearInterval(cdInt);
        if(cdWrap)cdWrap.style.display='none';
        startPattern();
      }
    },750);
    function startPattern(){
      const pattern=[];
      while(pattern.length<cfg.c){const r=Math.floor(Math.random()*cellCount);if(!pattern.includes(r))pattern.push(r);}
      if(interference){
        // Show fake red cells for 0.5s before real pattern
        const fakeCount=Math.min(3,Math.floor(cfg.c*0.4));
        const fakePattern=[];
        while(fakePattern.length<fakeCount){
          const r=Math.floor(Math.random()*cellCount);
          if(!fakePattern.includes(r)&&!pattern.includes(r))fakePattern.push(r);
        }
        fakePattern.forEach(i=>{cells[i].style.background='#F87171';cells[i].style.transform='scale(1.04)';});
        setTimeout(()=>{
          fakePattern.forEach(i=>{cells[i].style.background='var(--card)';cells[i].style.transform='';});
          showRealPattern(pattern);
        },500);
      } else {
        showRealPattern(pattern);
      }
    }
    function showRealPattern(pattern){
      pattern.forEach(i=>{
        cells[i].style.background='linear-gradient(135deg,#7C3AED,#4F8EF7)';
        cells[i].style.transform='scale(1.06)';
        cells[i].style.boxShadow='0 0 20px rgba(124,58,237,.6)';
      });
      setTimeout(()=>{
        cells.forEach(c=>{c.style.background='var(--card)';c.style.transform='';c.style.boxShadow='var(--shadow)';});
        const infoEl=body.querySelector('#memInfo');
        if(infoEl)infoEl.textContent=`Round ${round+1}/8 — ${cfg.c} cells tap karo!`;
        setTimeout(()=>{
          let picked=[];
          cells.forEach(c=>{
            c.onclick=()=>{
              const idx=+c.dataset.i;
              if(picked.includes(idx))return;
              picked.push(idx);
              if(pattern.includes(idx)){
                c.style.background='#34D399';c.style.transform='scale(0.94)';
                total++;setScore(total);playSound('correct');
              } else {
                c.style.background='#F87171';playSound('wrong');
                gridWrap.style.animation='shake .3s';
                setTimeout(()=>gridWrap.style.animation='',300);
              }
              if(picked.length>=cfg.c){
                const infoEl2=body.querySelector('#memInfo');
                if(infoEl2)infoEl2.textContent=`Round ${round+1} done! ${picked.filter(p=>pattern.includes(p)).length===cfg.c?'🎯 Perfect!':''}`;
                setTimeout(()=>{
                  round++;
                  if(round>=8){
                    end({title:'Memory Master! 🧠',emoji:'🧠',sub:`${total}/${maxScore} correct`,value:total,points:8+total*3,starThresh:[20,35,50]});
                  } else doRound();
                },900);
              }
            };
          });
        },500);
      },1300);
    }
  }
}

/* ===================== PATTERN IQ ===================== */
const PAT_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24','#EF4444','#06B6D4'];
const PAT_SHAPES=['●','■','▲','◆','★','⬟','⬡','✦'];
function genNumSeq(){
  const types=[
    ()=>{const s=Math.floor(Math.random()*5)+1,a=Math.floor(Math.random()*10)+2;return{seq:[s,s+a,s+2*a,s+3*a],ans:s+4*a};},
    ()=>{const s=Math.floor(Math.random()*3)+2,a=Math.floor(Math.random()*3)+2;return{seq:[s,s*a,s*a*a,s*a*a*a],ans:s*a*a*a*a};},
    ()=>{const s1=Math.floor(Math.random()*5)+1,s2=Math.floor(Math.random()*5)+3;return{seq:[s1,s2,s1+s2,s1+2*s2],ans:2*s1+3*s2};},
    ()=>{const a=Math.floor(Math.random()*4)+2,b=Math.floor(Math.random()*3)+2;return{seq:[a,b,a+b,b*2],ans:a+b+b*2};},
  ];
  return types[Math.floor(Math.random()*types.length)]();
}
function genSpecialSeq(){
  const type=Math.floor(Math.random()*4);
  if(type===0){
    const a=Math.floor(Math.random()*3)+1,b=Math.floor(Math.random()*3)+2;
    const s=[a,b,a+b,a+2*b,2*a+3*b];
    return{seq:s.slice(0,4),ans:s[4],label:'Fibonacci-like'};
  } else if(type===1){
    const n=Math.floor(Math.random()*4)+1;
    return{seq:[n*n,(n+1)*(n+1),(n+2)*(n+2),(n+3)*(n+3)],ans:(n+4)*(n+4),label:'Squares'};
  } else if(type===2){
    const primes=[2,3,5,7,11,13,17,19,23];
    const start=Math.floor(Math.random()*5);
    return{seq:primes.slice(start,start+4),ans:primes[start+4],label:'Primes'};
  } else {
    const a=Math.floor(Math.random()*5)+2,b=2;
    const s=Math.floor(Math.random()*3)+2;
    const seq=[s,s+a,(s+a)*b,(s+a)*b+a];
    return{seq,ans:seq[3]*b,label:'Alternating ×/'};
  }
}
function genLetterSeq(){
  const type=Math.floor(Math.random()*2);
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
  } else {
    const startC=Math.floor(Math.random()*6)+16;
    const skip=Math.floor(Math.random()*2)+1;
    const seqR=Array.from({length:4},(_,i)=>String.fromCharCode(startC-i*skip));
    const ansR=String.fromCharCode(startC-4*skip);
    if(ansR.charCodeAt(0)<65)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+Math.floor(Math.random()*26));if(!dist.includes(c)&&c!==ansR)dist.push(c);}
    const opts=[ansR,...dist].sort(()=>Math.random()-.5);
    return{seq:seqR,opts,answerIdx:opts.indexOf(ansR)};
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
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">Pattern dhundo aur sahi answer chunno!<br><span style="font-size:11px;color:var(--primary);">⚡ 2 seconds mein jawab = Speed Bonus +1!</span><br>
  <button style="margin-top:10px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="patStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);
  let q=0,score=0,bonus=0,arcTimer=null,qStartTs=0;
  function showArc(secs,onDone){
    clearInterval(arcTimer);
    const circ=2*Math.PI*30;
    const arcEl=host.querySelector('#arcSvg');
    if(!arcEl)return;
    let remaining=secs*10;
    arcTimer=setInterval(()=>{
      remaining--;
      const fg=host.querySelector('#arcFg');
      const num=host.querySelector('#arcNum');
      if(!fg||!num){clearInterval(arcTimer);return;}
      const pct=remaining/(secs*10);
      fg.style.strokeDashoffset=circ*(1-pct);
      fg.setAttribute('stroke',remaining<15?'#EF4444':remaining<30?'#F59E0B':'#7C3AED');
      num.textContent=Math.ceil(remaining/10);
      if(remaining<=0){clearInterval(arcTimer);onDone();}
    },100);
  }
  function next(){
    if(q>=15){
      const total=score+bonus;
      end({title:'Pattern Master!',emoji:'💡',sub:`Score: ${score}/15 + ${bonus} speed bonus`,value:total,points:total*5,starThresh:[6,10,13],
        statsHtml:`<div class="end-stats"><div class="row"><span>Correct</span><span class="val">${score}/15</span></div><div class="row"><span>Speed Bonus</span><span class="val">+${bonus}</span></div><div class="row"><span>Accuracy</span><span class="val">${Math.round(score/15*100)}%</span></div></div>`});
      return;
    }
    clearInterval(arcTimer);
    const type=q%6;
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
    } else {
      const res=genRomanSeq();
      answerIdx=res.answerIdx;
      html=`<div class="q-type-badge">ROMAN</div>
        <div class="pat-seq">${res.seq.map(r=>`<div class="pat-item" style="background:#F97316;font-size:16px;font-weight:900;">${r}</div>`).join('')}<div class="pat-item q" style="font-size:16px;">?</div></div>
        <div class="pat-opts">${res.opts.map((r,i)=>`<button class="pat-opt" data-i="${i}" style="font-size:15px;font-weight:900;">${r}</button>`).join('')}</div>`;
    }
    const arcHtml=`<div class="arc-wrap">
      <svg id="arcSvg" width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="30" fill="none" stroke="var(--border)" stroke-width="5"/>
        <circle id="arcFg" cx="35" cy="35" r="30" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="0"/>
      </svg>
      <div class="arc-num" id="arcNum">4</div>
    </div>`;
    host.innerHTML=arcHtml+html+`<div style="text-align:center;margin-top:8px;color:var(--text2);font-size:12px;">Q${q+1}/15</div>`;
    qStartTs=Date.now();
    showArc(4,()=>{playSound('wrong');q++;next();});
    host.querySelectorAll('.pat-opt').forEach(btn=>{
      btn.onclick=()=>{
        clearInterval(arcTimer);
        const chosen=+btn.dataset.i;
        const elapsed=Date.now()-qStartTs;
        if(chosen===answerIdx){
          playSound('correct');score++;setScore(score);
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
        }
        setTimeout(()=>{q++;next();},500);
      };
    });
  }
  instrEl.querySelector('#patStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
}

/* ===================== WORD FLASH ===================== */
const WORD_GROUPS=[
  ['BRAIN','TRAIN','GRAIN','DRAIN'],['FLAME','FLARE','BLAME','BLADE'],
  ['SPADE','SPACE','SPARE','SPARK'],['PLANE','PLACE','PLAIN','PLANK'],
  ['STONE','STORE','STOVE','STOKE'],['CRANE','CRATE','GRACE','GRADE'],
  ['BREAD','DREAD','TREAD','BRAID'],['SWIFT','SHIFT','SWIRL','SNIFF'],
  ['FROST','FRONT','FROTH','FROWN'],['SHARP','SHARE','SHARD','CHARM'],
  ['LIGHT','NIGHT','TIGHT','SIGHT'],['FORCE','FORGE','FORTE','FORTS'],
  ['PRIDE','PRICE','PRISM','PRISE'],['CLOCK','BLOCK','FLOCK','KNOCK'],
  ['CLOUD','CLOUT','FLOUR','FLOAT'],
];
function playWordFlash(body,setScore,end,wrap,startClock){
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">Word flash hoga — yaad karo, phir dhundo!<br>
  <button style="margin-top:10px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="wfStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);
  const roundBar=$(`<div class="round-bar" id="wRBar"></div>`);
  body.appendChild(roundBar);
  for(let i=0;i<15;i++)roundBar.appendChild($(`<div class="round-dot ${i===0?'current':''}"></div>`));
  let q=0,score=0,shuffled=[...WORD_GROUPS].sort(()=>Math.random()-.5);
  function updateBar(){const dots=wrap.querySelectorAll('.round-dot');dots.forEach((d,i)=>{d.className='round-dot'+(i<q?' done':i===q?' current':'');});}
  function next(){
    if(q>=15){
      end({title:'Word Flash Done!',emoji:'📝',sub:`Score: ${score}/15`,value:score,points:score*4,starThresh:[6,10,13],
        statsHtml:`<div class="end-stats"><div class="row"><span>Correct</span><span class="val">${score}/15</span></div><div class="row"><span>Accuracy</span><span class="val">${Math.round(score/15*100)}%</span></div></div>`});
      return;
    }
    updateBar();
    const group=shuffled[q%shuffled.length];
    const correctWord=group[0];
    const displayMs=Math.max(400,800-q*26);
    const opts=[...group].sort(()=>Math.random()-.5);
    host.innerHTML=`<div class="word-display" id="wDisplay">${correctWord}</div><div class="word-opts" id="wOpts" style="opacity:0"></div>
      <div style="text-align:center;font-size:12px;color:var(--text2);margin-top:8px;">Q${q+1}/15 · ${displayMs}ms flash</div>`;
    const optsEl=host.querySelector('#wOpts');
    opts.forEach(w=>{
      const b=$(`<button class="word-opt" data-w="${w}">${w}</button>`);
      optsEl.appendChild(b);
    });
    setTimeout(()=>{
      host.querySelector('#wDisplay').style.opacity='0';
      host.querySelector('#wDisplay').style.transition='opacity 0.2s';
      setTimeout(()=>{
        host.querySelector('#wDisplay').textContent='?';
        host.querySelector('#wDisplay').style.opacity='1';
        optsEl.style.opacity='1';
        optsEl.style.transition='opacity 0.2s';
        optsEl.querySelectorAll('.word-opt').forEach(b=>{
          b.onclick=()=>{
            const chosen=b.dataset.w;
            if(chosen===correctWord){playSound('correct');score++;setScore(score);b.classList.add('correct-ans');}
            else{playSound('wrong');b.classList.add('wrong-ans');optsEl.querySelectorAll('.word-opt').forEach(bb=>{if(bb.dataset.w===correctWord)bb.classList.add('correct-ans');});}
            optsEl.querySelectorAll('.word-opt').forEach(bb=>bb.disabled=true);
            setTimeout(()=>{q++;next();},500);
          };
        });
      },150);
    },displayMs);
  }
  instrEl.querySelector('#wfStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
}

/* ===================== WORD CHAIN ===================== */
function playNeuralChain(body,setScore,end,wrap,startClock){
  const WORD_SETS=[
    ['Apple','Chair','River','Cloud','Music'],
    ['Tiger','Bread','Stone','Light','Phone'],
    ['Dream','Water','House','Paper','Green'],
    ['Earth','Smile','Train','Dance','Maple'],
    ['Ocean','Clock','Flame','Brain','Sugar'],
    ['Grass','Pilot','Queen','Frost','Arrow'],
    ['Lemon','Storm','Movie','Brush','Radio'],
    ['Pearl','Eagle','Comet','Prize','Unity'],
  ];
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">
    <strong>Word Chain</strong><br>
    Ek ke baad ek words dikhenge — <em>saare yaad karo!</em><br>
    End mein sab words sahi order mein tap karo.<br>
    <span style="font-size:11px;color:var(--primary);">Chain lambi hoti jayegi — kitni yaad rakh sakte ho?</span><br>
    <button style="margin-top:12px;padding:10px 28px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="wcStart">▶ Start</button>
  </div>`);
  body.appendChild(instrEl);
  const host=$(`<div style="text-align:center;"></div>`);
  body.appendChild(host);
  instrEl.querySelector('#wcStart').onclick=()=>{
    instrEl.remove();
    startClock&&startClock();
    startRound(0,[]);
  };
  function startRound(chainLen,existing){
    const allWords=WORD_SETS.flat();
    const usedSet=new Set(existing);
    const available=allWords.filter(w=>!usedSet.has(w));
    const newWord=available[Math.floor(Math.random()*available.length)];
    const chain=[...existing,newWord];
    host.innerHTML='';
    const chainLen2=chain.length;
    let idx=0;
    function showNextWord(){
      host.innerHTML=`
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px;">Chain ${chainLen2} — Word ${idx+1}/${chainLen2}</div>
        <div style="font-size:42px;font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;padding:24px;background-color:var(--card);border-radius:20px;box-shadow:var(--shadow);margin:0 auto;display:inline-block;min-width:180px;">
          ${chain[idx]}
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text2);">yaad karo...</div>
      `;
      idx++;
      if(idx<chainLen2){
        setTimeout(showNextWord,1200);
      } else {
        setTimeout(()=>showRecall(chain),600);
      }
    }
    showNextWord();
    function showRecall(chain){
      const shuffled=[...chain].sort(()=>Math.random()-.5);
      let tapped=[];
      host.innerHTML=`
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">Sahi order mein tap karo!</div>
        <div style="min-height:48px;background:var(--card);border-radius:14px;padding:10px;margin-bottom:14px;box-shadow:var(--shadow);font-size:14px;font-weight:600;color:var(--primary);" id="wcAnswer">
          ${chain.map((_,i)=>`<span id="wcSlot${i}" style="opacity:.3;">_____</span>`).join(' → ')}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;" id="wcBtns">
          ${shuffled.map(w=>`<button class="wc-btn" data-w="${w}" style="padding:10px 16px;background:var(--card);border-radius:12px;font-weight:600;font-size:14px;box-shadow:var(--shadow);border:2px solid var(--border);">${w}</button>`).join('')}
        </div>
        <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text2);">${tapped.length}/${chain.length} tapped</div>
      `;
      host.querySelectorAll('.wc-btn').forEach(btn=>{
        btn.onclick=()=>{
          if(btn.disabled)return;
          btn.disabled=true;
          btn.style.opacity='.4';
          tapped.push(btn.dataset.w);
          const slot=host.querySelector(`#wcSlot${tapped.length-1}`);
          if(slot){
            const correct=chain[tapped.length-1]===btn.dataset.w;
            slot.textContent=btn.dataset.w;
            slot.style.opacity='1';
            slot.style.color=correct?'#34D399':'#EF4444';
            playSound(correct?'correct':'wrong');
          }
          if(tapped.length>=chain.length){
            const correctCount=tapped.filter((w,i)=>w===chain[i]).length;
            const allCorrect=correctCount===chain.length;
            setTimeout(()=>{
              if(allCorrect){
                setScore(chain.length);
                host.innerHTML+=`<div style="text-align:center;margin-top:12px;font-size:16px;font-weight:700;color:#34D399;">✅ Perfect! Next chain...</div>`;
                setTimeout(()=>startRound(chainLen2,chain),1200);
              } else {
                const finalScore=chain.length-1;
                end({
                  title:'Word Chain Complete! 🔗',
                  emoji:'🔗',
                  sub:`Longest chain: ${finalScore} words`,
                  value:finalScore,
                  points:Math.max(5,finalScore*4),
                  starThresh:[4,7,10]
                });
              }
            },800);
          }
        };
      });
    }
  }
}

/* ===================== QUICK MATH ===================== */
const TIERS=[
  {label:'TIER 1',ops:['+','-'],maxA:9,maxB:9,timeMs:4000},
  {label:'TIER 2',ops:['+','-'],maxA:99,maxB:9,timeMs:4000},
  {label:'TIER 3',ops:['×','+'],maxA:25,maxB:9,timeMs:3500},
  {label:'TIER 4',ops:['×','-'],maxA:20,maxB:12,timeMs:3000},
  {label:'TIER 5',ops:['×','+'],maxA:15,maxB:15,brackets:true,timeMs:2500},
  {label:'TIER 6',ops:['÷'],maxA:12,maxB:12,timeMs:2500},
  {label:'TIER 7',ops:['alg'],maxA:10,maxB:20,timeMs:2000},
  {label:'TIER 8',ops:['word'],maxA:0,maxB:0,timeMs:2000},
];
function playMath(body,setScore,end,wrap,startClock){
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">Jaldi solve karo! Combos se bonus. 5 correct in a row = 💀 Sudden Death!<br>
  <button style="margin-top:10px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="mathStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div style="position:relative;"></div>`);body.appendChild(host);
  let q=0,score=0,tier=0,combo=0,consecutive=0,wrong2=0,sdMode=false,sdBonus=0,maxTier=0;
  let barTimer=null;
  function genWordProblem(){
    const t=Math.floor(Math.random()*5);
    if(t===0){const n=(Math.floor(Math.random()*5)+2),m=(Math.floor(Math.random()*8)+3);return{q:`${n} boxes × ${m} items = ? items`,ans:n*m};}
    if(t===1){const sp=(Math.floor(Math.random()*4)+2)*10,hr=(Math.floor(Math.random()*3)+1);return{q:`${sp}km/h × ${hr}h = ? km`,ans:sp*hr};}
    if(t===2){const p=(Math.floor(Math.random()*5)+2)*10;return{q:`₹${p}, 10% off. Final = ?`,ans:p-p/10};}
    if(t===3){const a=(Math.floor(Math.random()*5)+3),b=(Math.floor(Math.random()*5)+3);return{q:`A = B + ${a}. A+B = ${a+2*b}. A = ?`,ans:a+b};}
    const n=(Math.floor(Math.random()*6)+2),pp=(Math.floor(Math.random()*9)+4);return{q:`${n} students, ${pp} pencils each. Total?`,ans:n*pp};
  }
  function genQuestion(){
    const tc=TIERS[tier];
    if(tc.ops[0]==='alg'){
      const a=Math.floor(Math.random()*4)+2,b=Math.floor(Math.random()*10)+1,x=Math.floor(Math.random()*8)+1;
      return{display:`${a}x + ${b} = ${a*x+b}`,correct:x};
    } else if(tc.ops[0]==='word'){
      const wp=genWordProblem();return{display:wp.q,correct:wp.ans,isWord:true};
    } else if(tc.ops[0]==='÷'){
      const a=Math.floor(Math.random()*tc.maxB)+2,b=Math.floor(Math.random()*tc.maxA)+1;
      return{display:`${a*b} ÷ ${a}`,correct:b};
    } else {
      const a=Math.floor(Math.random()*tc.maxA)+1,b=Math.floor(Math.random()*tc.maxB)+1;
      const op=tc.ops[Math.floor(Math.random()*tc.ops.length)];
      let correct=op==='+'?a+b:op==='-'?a-b:a*b;
      let display=`${a} ${op} ${b}`;
      if(tc.brackets&&Math.random()>0.5){
        const c=Math.floor(Math.random()*6)+2,op2=['+','-'][Math.floor(Math.random()*2)];
        const inner=op2==='+'?b+c:Math.max(1,b-c);
        correct=a*inner;display=`${a} × (${b} ${op2} ${c})`;
      }
      return{display,correct};
    }
  }
  function endRun(opts){
    const total=score+sdBonus;
    end({...opts,value:total,points:total*3,statsHtml:`<div class="end-stats"><div class="row"><span>Correct</span><span class="val">${score}/20</span></div><div class="row"><span>Max Tier</span><span class="val">${maxTier+1}</span></div><div class="row"><span>SD Bonus</span><span class="val">+${sdBonus}</span></div></div>`});
  }
  function next(){
    if(q>=20){
      endRun({title:'Math Ninja! 🔢',emoji:'🔢',sub:`Score: ${score}/20${sdBonus?` + ${sdBonus} SD bonus`:''}`});
      return;
    }
    clearInterval(barTimer);
    const {display,correct,isWord}=genQuestion();
    const tc=TIERS[tier];
    if(tier>maxTier)maxTier=tier;
    const mult=combo>=3?1.5:1;
    const timeMs=tc.timeMs;
    const range=Math.max(Math.ceil(Math.abs(correct)*0.15),3);
    const used=new Set([correct]);
    const distract=[];
    let tries=0;
    while(distract.length<3&&tries<80){
      tries++;
      const d=correct+Math.floor(Math.random()*range*2+1)-range;
      if(d>=0&&d!==correct&&!used.has(d)){used.add(d);distract.push(d);}
    }
    while(distract.length<3)distract.push(correct+(distract.length+1)*2);
    const opts=[correct,...distract].sort(()=>Math.random()-.5);
    host.innerHTML=`
      <div class="timer-bar"><div class="timer-fill timer-green" id="mBar" style="width:100%"></div></div>
      <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text2);margin-bottom:4px;">${tc.label}${sdMode?'  <span style="color:#EF4444;">💀 SUDDEN DEATH</span>':''}${combo>=3?`  🔥×${Math.round(mult)}`:''}  Q${q+1}/20</div>
      <div style="text-align:center;font-size:${isWord?'14px':'32px'};font-weight:${isWord?'600':'900'};margin:${isWord?'8px':'10px'} 0;line-height:${isWord?'1.4':'1'};min-height:${isWord?'56px':'auto'};">${display}</div>
      <div class="math-opts">${opts.map(v=>`<button class="math-opt" data-v="${v}">${v}</button>`).join('')}</div>`;
    let elapsed=0;
    barTimer=setInterval(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=wrap.querySelector('#mBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=timeMs){
        clearInterval(barTimer);combo=0;consecutive=0;
        host.querySelectorAll('.math-opt').forEach(b=>{if(+b.dataset.v===correct)b.classList.add('correct-ans');b.disabled=true;});
        host.innerHTML+=`<div style="text-align:center;font-size:12px;color:#EF4444;margin-top:6px;">⏱ ${display} = ${correct}</div>`;
        if(sdMode){setTimeout(()=>endRun({title:'Sudden Death!',emoji:'💀',sub:`SD Run ended! +${sdBonus} bonus`}),700);return;}
        wrong2++;if(wrong2>=2){wrong2=0;tier=Math.max(0,tier-1);}
        setTimeout(()=>{q++;next();},900);
      }
    },100);
    host.querySelectorAll('.math-opt').forEach(btn=>{
      btn.onclick=()=>{
        clearInterval(barTimer);
        const chosen=+btn.dataset.v;
        if(chosen===correct){
          playSound('correct');
          score+=Math.round(mult);setScore(score);
          btn.classList.add('correct-ans');
          consecutive++;wrong2=0;
          if(consecutive>=5&&!sdMode){sdMode=true;sdBonus+=10;showCombo('💀 SUDDEN DEATH!');}
          else if(consecutive>=3){combo=consecutive;showCombo(`🔥 ${combo}× COMBO!`);}
          if(consecutive>=4&&consecutive%4===0)tier=Math.min(7,tier+1);
        } else {
          playSound('wrong');
          btn.classList.add('wrong-ans');
          host.querySelectorAll('.math-opt').forEach(b=>{if(+b.dataset.v===correct)b.classList.add('correct-ans');});
          if(sdMode){
            host.querySelectorAll('.math-opt').forEach(b=>b.disabled=true);
            host.innerHTML+=`<div style="text-align:center;font-size:13px;color:#EF4444;margin-top:8px;">💀 Sudden Death ended! +${sdBonus} bonus earned</div>`;
            setTimeout(()=>endRun({title:'Sudden Death!',emoji:'💀',sub:`Score: ${score} + ${sdBonus} SD bonus`}),900);
            return;
          }
          combo=0;consecutive=0;wrong2++;
          if(wrong2>=2){wrong2=0;tier=Math.max(0,tier-1);}
          host.innerHTML+=`<div style="text-align:center;font-size:12px;color:var(--text2);margin-top:6px;">${display} = ${correct} ✓</div>`;
        }
        host.querySelectorAll('.math-opt').forEach(b=>b.disabled=true);
        setTimeout(()=>{q++;next();},600);
      };
    });
  }
  instrEl.querySelector('#mathStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
}

/* ===================== STROOP X ===================== */
function playStroopX(body,setScore,end,wrap,startClock){
  const COLORS=[{name:'Red',hex:'#EF4444'},{name:'Blue',hex:'#3B82F6'},{name:'Green',hex:'#22C55E'},{name:'Yellow',hex:'#EAB308'},{name:'Purple',hex:'#A855F7'}];
  const SHAPES=[{name:'Circle',sym:'●'},{name:'Square',sym:'■'},{name:'Triangle',sym:'▲'},{name:'Star',sym:'★'}];
  let round=0,score=0,combo=0,maxCombo=0;
  const host=$(`<div style="text-align:center;padding:12px 0;"></div>`);
  body.appendChild(host);
  const btn=$(`<button class="start-btn">Tap to Start (30 rounds)</button>`);
  body.appendChild(btn);
  btn.onclick=()=>{btn.remove();startClock&&startClock();nextRound();};
  function startBar(limit,onTimeout){
    let elapsed=0;
    const barT=setInterval(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/limit*100);
      const bar=wrap.querySelector('#sBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=limit){clearInterval(barT);onTimeout();}
    },100);
    return barT;
  }
  function nextRound(){
    if(round>=30){
      end({title:'Stroop Master! 🎨',emoji:'🎨',sub:`Score: ${score} pts · 30 rounds`,value:score,points:score*4,starThresh:[40,65,90],
        statsHtml:`<div class="end-stats"><div class="row"><span>Score</span><span class="val">${score}</span></div><div class="row"><span>Max Combo</span><span class="val">${maxCombo}</span></div><div class="row"><span>Phase</span><span class="val">${round>25?'3':round>10?'2':'1'}</span></div></div>`});
      return;
    }
    const phase=round<11?1:round<16?2:3;
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
        <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">Round ${round+1}/30 · Phase 1 — INK ka rang tap karo!</div>
        ${combo>=3?`<div style="font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:4px;">🔥 Combo ×1.5</div>`:''}
        <div style="font-size:52px;font-weight:900;color:${ink.hex};margin:14px 0;">${word.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:280px;margin:0 auto;">
          ${choices.map(c=>`<button class="math-opt stroop-opt" style="background:${c.hex};color:#fff;font-weight:700;border:none;" data-name="${c.name}">${c.name}</button>`).join('')}
        </div>`;
      barT=startBar(3000,()=>{
        combo=0;round++;
        host.innerHTML+=`<div style="font-size:12px;color:#EF4444;margin-top:8px;">⏱ Too slow! Ink: <strong style="color:${ink.hex}">${ink.name}</strong></div>`;
        setTimeout(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          clearInterval(barT);const ms=Date.now()-ts;
          if(b.dataset.name===ink.name){
            playSound('correct');const pts=ms<1000?3:ms<2000?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.outline='3px solid #fff';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts}${combo>=3?' 🔥':''}</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Ink: <strong style="color:${ink.hex}">${ink.name}</strong></div>`;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;setTimeout(nextRound,700);
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
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">Round ${round+1}/30 · Phase 2 — Jo SHAPE dikhti hai, usse tap karo!</div>
        <div style="font-size:64px;font-weight:900;color:${inkColor.hex};margin:10px 0;">${dispShape.sym}</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">(Word: "${wordShape.name}" — IGNORE karo)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:280px;margin:0 auto;">
          ${choices.map(s=>`<button class="math-opt stroop-opt" style="font-size:20px;font-weight:700;border:2px solid var(--border);" data-name="${s.name}">${s.sym} ${s.name}</button>`).join('')}
        </div>`;
      barT=startBar(2500,()=>{
        combo=0;round++;
        host.innerHTML+=`<div style="font-size:12px;color:#EF4444;margin-top:8px;">⏱ It was ${dispShape.sym} ${dispShape.name}!</div>`;
        setTimeout(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          clearInterval(barT);const ms=Date.now()-ts;
          if(b.dataset.name===dispShape.name){
            playSound('correct');const pts=ms<1000?3:ms<1500?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.background='#22C55E';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts} Correct Shape!</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Was: ${dispShape.sym} ${dispShape.name}</div>`;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;setTimeout(nextRound,700);
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
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">Round ${round+1}/30 · Phase 3</div>
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
        setTimeout(nextRound,900);
      });
      host.querySelectorAll('.stroop-opt').forEach(b=>{
        b.onclick=()=>{
          clearInterval(barT);const ms=Date.now()-ts;
          if(b.dataset.name===target){
            playSound('correct');const pts=ms<800?3:ms<1500?2:1;
            combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
            b.style.outline='3px solid #22C55E';
            host.innerHTML+=`<div style="font-size:11px;color:#22C55E;margin-top:4px;">+${pts}${combo>=3?' 🔥':''}</div>`;
          } else {
            playSound('wrong');combo=0;b.style.background='#EF4444';b.style.color='#fff';
            host.innerHTML+=`<div style="font-size:11px;color:#EF4444;margin-top:4px;">Answer: ${target}</div>`;
          }
          host.querySelectorAll('.stroop-opt').forEach(x=>x.disabled=true);
          round++;setTimeout(nextRound,700);
        };
      });
    }
  }
}

/* ===================== IQ TEST ===================== */
function playIQTest(body,setScore,end,wrap,startClock){
  const ALL_QS=[
    {q:'Sequence: 2, 4, 8, 16, __. Agla number kya hai?',opts:['24','32','20','28'],ans:1,diff:'easy',exp:'Geometric series ×2: 16×2 = 32.'},
    {q:'Agar M=13, A=1, N=14, G=7, O=15 → MANGO=50. APPLE ka code? (A=1, B=2...)',opts:['50','51','52','53'],ans:0,diff:'easy',exp:'A(1)+P(16)+P(16)+L(12)+E(5) = 50.'},
    {q:'5 logon ki line mein Rahul 3rd hai. Uske baad kitne log hain?',opts:['1','2','3','4'],ans:1,diff:'easy',exp:'5 − 3 = 2 log Rahul ke baad hain.'},
    {q:'Ghadi mein 3:15 hain. Minute aur hour hand ke beech angle?',opts:['0°','7.5°','15°','30°'],ans:1,diff:'medium',exp:'Hour hand = 97.5°. Minute hand = 90°. Difference = 7.5°.'},
    {q:'Odd one out: Cat, Dog, Rose, Lion',opts:['Cat','Dog','Rose','Lion'],ans:2,diff:'easy',exp:'Rose ek plant hai, baaki teen animals hain.'},
    {q:'6×4=24 aur 5×3=15, toh 7×5=?',opts:['30','35','40','45'],ans:1,diff:'easy',exp:'Simple multiplication: 7×5 = 35.'},
    {q:'Ek square ka perimeter 40cm hai. Area?',opts:['80cm²','100cm²','160cm²','40cm²'],ans:1,diff:'easy',exp:'Side = 40÷4 = 10cm. Area = 10×10 = 100cm².'},
    {q:'Letter sequence: A, C, E, G, __',opts:['H','I','J','K'],ans:1,diff:'easy',exp:'Har step +2 (odd letters): A→C→E→G→I.'},
    {q:'Neha, Priya se 3 saal badi. 5 saal baad Priya 20 hogi. Abhi Neha ki umar?',opts:['18','23','22','20'],ans:0,diff:'medium',exp:'Priya abhi = 20−5 = 15. Neha = 15+3 = 18.'},
    {q:'3 cats 3 mice ko 3 minutes mein pakadti hain. 100 mice ke liye kitni cats?',opts:['100','33','3','10'],ans:2,diff:'medium',exp:'Ek cat 1 mouse ko 3 min mein pakadti hai. 3 cats kaafi hain.'},
    {q:'Ek train 60km/h se 2 ghante chalti hai. Kitni doori?',opts:['60km','100km','120km','180km'],ans:2,diff:'easy',exp:'Distance = Speed × Time = 60 × 2 = 120km.'},
    {q:'Kaunsa number 4 aur 6 dono se divisible hai?',opts:['10','14','12','16'],ans:2,diff:'easy',exp:'LCM(4,6) = 12. 12÷4=3 ✓, 12÷6=2 ✓.'},
    {q:'Mirror image mein "REPLIT" kaisa dikhega?',opts:['TILPER','TILEPR','TIRPLE','TIPREL'],ans:0,diff:'medium',exp:'Mirror = reverse: R-E-P-L-I-T → T-I-L-P-E-R = TILPER.'},
    {q:'Ek triangle ke angles 60° aur 70° hain. Teesra angle?',opts:['40°','50°','60°','70°'],ans:1,diff:'easy',exp:'180° − 60° − 70° = 50°.'},
    {q:'Sequence: 2, 6, 12, 20, 30, __',opts:['40','42','44','38'],ans:1,diff:'medium',exp:'Differences: 4,6,8,10,12. Next = 30+12 = 42.'},
    {q:'Fibonacci: 1, 1, 2, 3, 5, 8, __. Agla kya hai?',opts:['11','13','12','14'],ans:1,diff:'easy',exp:'Fibonacci: pichle 2 ka sum. 5+8 = 13.'},
    {q:'450 ka 10% kitna hai?',opts:['40','45','50','55'],ans:1,diff:'easy',exp:'10% = 450÷10 = 45.'},
    {q:'Ek cube ki kitni faces hoti hain?',opts:['4','8','6','12'],ans:2,diff:'easy',exp:'Cube ki 6 faces: top, bottom, front, back, left, right.'},
    {q:'Koi 90km 1.5 ghante mein tay karta hai. Speed?',opts:['45km/h','60km/h','90km/h','30km/h'],ans:1,diff:'medium',exp:'Speed = 90÷1.5 = 60km/h.'},
    {q:'A ki umar B se double hai. Dono ka sum 36. B ki umar?',opts:['9','10','12','14'],ans:2,diff:'medium',exp:'A = 2B. 2B+B = 36 → 3B = 36 → B = 12.'},
    {q:'3 hafte mein kitne din?',opts:['18','21','24','28'],ans:1,diff:'easy',exp:'3 × 7 = 21 din.'},
    {q:'Letter sequence: Z, X, V, T, __',opts:['P','Q','R','S'],ans:2,diff:'medium',exp:'Har step −2: Z→X→V→T→R.'},
    {q:'100 − 17 − 23 − 15 = ?',opts:['45','50','55','42'],ans:0,diff:'easy',exp:'100−17=83, 83−23=60, 60−15 = 45.'},
    {q:'Aaj Wednesday hai. 10 din baad kaunsa din?',opts:['Monday','Friday','Saturday','Sunday'],ans:2,diff:'medium',exp:'Wed + 7 = Wed. Wed + 3 more = Saturday.'},
    {q:'Algebra: 3x − 7 = 14. x = ?',opts:['5','6','7','8'],ans:2,diff:'hard',exp:'3x = 14+7 = 21. x = 21÷3 = 7.'},
  ];
  const TIMER={easy:30000,medium:20000,hard:12000};
  // Shuffle questions each session
  const QS=[...ALL_QS].sort(()=>Math.random()-.5);
  let qi=0,correct=0;
  const host=$(`<div style="padding:0 4px;"></div>`);
  body.appendChild(host);
  const btn=$(`<button class="start-btn">Start IQ Test (25 Qs)</button>`);
  body.appendChild(btn);
  btn.onclick=()=>{btn.remove();startClock&&startClock();showQ();};
  function showQ(){
    if(qi>=QS.length){
      const iq=Math.round(70+(correct/25)*70);
      end({title:`IQ Score: ${iq} 🧩`,emoji:'🧩',sub:`${correct}/25 correct`,value:iq,points:correct*5,starThresh:[10,16,22],
        statsHtml:`<div class="end-stats"><div class="row"><span>Correct</span><span class="val">${correct}/25</span></div><div class="row"><span>Estimated IQ</span><span class="val">${iq}</span></div><div class="row"><span>Rating</span><span class="val">${iq>=130?'Genius':iq>=115?'Above Avg':iq>=100?'Average':'Below Avg'}</span></div></div>`});
      return;
    }
    const {q,opts,ans,diff,exp}=QS[qi];
    const timeMs=TIMER[diff]||20000;
    const lvl=diff==='easy'?{label:'🟢 Easy',color:'#22C55E'}:diff==='medium'?{label:'🟡 Medium',color:'#EAB308'}:{label:'🔴 Hard',color:'#EF4444'};
    let barT=null,elapsed=0,answered=false;
    host.innerHTML=`
      <div class="timer-bar"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div>
      <div style="text-align:center;margin-bottom:6px;font-size:12px;font-weight:700;color:${lvl.color}">${lvl.label} · Q${qi+1}/25 · ${timeMs/1000}s</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;line-height:1.5;">${q}</div>
      <div style="display:flex;flex-direction:column;gap:8px;" id="iqOpts">
        ${opts.map((o,i)=>`<button class="math-opt iq-opt" style="text-align:left;padding:10px 14px;font-size:13px;" data-i="${i}">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}
      </div>`;
    barT=setInterval(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=wrap.querySelector('#iqBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=timeMs&&!answered){
        clearInterval(barT);answered=true;
        host.querySelectorAll('.iq-opt').forEach((b,i)=>{if(i===ans)b.classList.add('correct-ans');b.disabled=true;});
        showExp('⏱ Time\'s up!','#EF4444');
        qi++;setTimeout(showQ,1800);
      }
    },100);
    function showExp(msg,color){
      const el=document.createElement('div');
      el.style.cssText='margin-top:10px;padding:8px 12px;background:var(--card);border-radius:10px;font-size:12px;line-height:1.5;border-left:3px solid '+color+';';
      el.innerHTML=`<span style="color:${color};font-weight:700;">${msg}</span><br><span style="color:var(--text2);">💡 ${exp}</span>`;
      host.appendChild(el);
    }
    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        clearInterval(barT);answered=true;
        const chosen=+b.dataset.i;
        if(chosen===ans){
          playSound('correct');correct++;setScore(correct);
          b.classList.add('correct-ans');showExp('✅ Correct!','#22C55E');
        } else {
          playSound('wrong');b.classList.add('wrong-ans');
          host.querySelectorAll('.iq-opt').forEach((x,i)=>{if(i===ans)x.classList.add('correct-ans');});
          showExp('❌ Wrong!','#EF4444');
        }
        host.querySelectorAll('.iq-opt').forEach(x=>x.disabled=true);
        qi++;setTimeout(showQ,1800);
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
];
let relaxAudio={ctx:null,master:null,nodes:[],timers:[],playing:-1,targetVol:0.7};

function stopRelaxAudio(){
  const ac=relaxAudio.ctx;
  relaxAudio.timers.forEach(t=>{clearInterval(t);clearTimeout(t);});
  relaxAudio.timers=[];
  if(ac&&relaxAudio.master){
    const m=relaxAudio.master;const stale=[...relaxAudio.nodes];
    try{m.gain.cancelScheduledValues(ac.currentTime);m.gain.setValueAtTime(m.gain.value,ac.currentTime);m.gain.linearRampToValueAtTime(0,ac.currentTime+1.5);}catch(e){}
    setTimeout(()=>stale.forEach(n=>{try{n.stop();}catch(e){}}),1600);
  }else{relaxAudio.nodes.forEach(n=>{try{n.stop();}catch(e){}});}
  relaxAudio.nodes=[];relaxAudio.master=null;relaxAudio.playing=-1;
}

function makeNoiseBuffer(ac,type){
  const len=ac.sampleRate*4;
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
  relaxAudio.ctx=ac;relaxAudio.master=master;relaxAudio.playing=idx;relaxAudio.targetVol=vol;
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
        <div class="pl-btn">⏮</div>
        <button class="pl-play" id="playBtn">▶</button>
        <div class="pl-btn">⏭</div>
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
  volSlider.oninput=()=>{vol=volSlider.value/100;volPct.textContent=volSlider.value+'%';if(relaxAudio.master&&relaxAudio.ctx)relaxAudio.master.gain.setTargetAtTime(vol,relaxAudio.ctx.currentTime,0.02);relaxAudio.targetVol=vol;};
  SOUNDS.forEach((s,i)=>{
    const btn=$(`<button class="sound-btn ${relaxAudio.playing===i?'active':''}">
      <div class="se">${s.emoji}</div>
      <div class="sn">${s.name}</div>
      <div style="font-size:10px;color:var(--text2);">${s.desc}</div>
    </button>`);
    btn.onclick=()=>{
      if(relaxAudio.playing===i){stopRelaxAudio();p.querySelector('#npName').textContent='Choose a sound';p.querySelector('#npIcon').textContent='🎵';}
      else{playRelaxSound(i,vol);p.querySelector('#npName').textContent=s.name;p.querySelector('#npIcon').textContent=s.emoji;}
      sg.querySelectorAll('.sound-btn').forEach((b,j)=>b.classList.toggle('active',relaxAudio.playing===j));
    };
    sg.appendChild(btn);
  });
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
  const p=$(`<div></div>`);
  p.innerHTML=`
    <div class="hdr"><div><div class="greet">Your account</div><h1>Profile</h1></div></div>
    <div class="prof-card">
      <div class="prof-top">
        <div class="prof-avatar">${name.charAt(0).toUpperCase()}</div>
        <div><div class="prof-name">${name}</div><div class="prof-email">NeuroZen Player</div></div>
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

/* ===================== REACTION LAB ===================== */
function playReactionLab(body,setScore,end,wrap,startClock){
  const instrEl=$(`<div class="instr">Tap the circle the moment it appears!<br>
    <span style="font-size:11px;color:var(--text2);">Rd 5+: 🔴=tap &nbsp;🔵=don't tap &nbsp;|&nbsp; Rd 8+: tap BIGGER circle</span><br>
    <button style="margin-top:12px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="rlStart">▶ Start</button>
  </div>`);
  body.appendChild(instrEl);
  const arena=$(`<div id="rlArena" style="position:relative;width:100%;height:220px;background:var(--card);border-radius:16px;overflow:hidden;display:none;margin-top:8px;box-shadow:var(--shadow);"></div>`);
  body.appendChild(arena);
  const infoBar=$(`<div id="rlInfo" style="text-align:center;font-size:12px;color:var(--text2);margin-top:6px;min-height:18px;"></div>`);
  body.appendChild(infoBar);
  const times=[];
  let round=0,score=0,delayT=null,holdT=null,busy=false;

  instrEl.querySelector('#rlStart').onclick=()=>{
    instrEl.style.display='none';arena.style.display='block';
    startClock&&startClock();doRound();
  };

  function showFb(msg,color){
    const old=arena.querySelector('.rl-fb');if(old)old.remove();
    const el=$(`<div class="rl-fb" style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:13px;font-weight:700;color:${color};pointer-events:none;">${msg}</div>`);
    arena.appendChild(el);
  }

  function advance(t,msg,color,pts){
    clearTimeout(holdT);busy=true;
    times.push(t);
    if(pts>0){score+=pts;setScore(score);}
    showFb(msg,color);
    round++;setTimeout(()=>{busy=false;doRound();},900);
  }

  function doRound(){
    if(round>=10){showChart();return;}
    const rnd=round;
    const isNoGo=rnd>=4&&rnd<7;
    const isBig=rnd>=7;
    const info=body.querySelector('#rlInfo');
    if(info)info.textContent=`Round ${rnd+1}/10${isNoGo?' · 🔴=tap  🔵=skip':''}${isBig?' · Tap BIGGER circle':''}`;
    arena.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:14px;letter-spacing:.15em;">+ + +</div>';
    const delay=1000+Math.random()*2500;
    delayT=setTimeout(()=>{
      if(round!==rnd)return;
      arena.innerHTML='';
      const aw=arena.clientWidth||300,ah=arena.clientHeight||220;
      if(isBig){
        let s1=30+Math.floor(Math.random()*22);
        let s2=s1;while(Math.abs(s2-s1)<18)s2=30+Math.floor(Math.random()*22);
        const bigS=Math.max(s1,s2),smallS=Math.min(s1,s2);
        const sides=[{size:bigS,correct:true},{size:smallS,correct:false}];
        if(Math.random()>0.5)sides.reverse();
        const ts=Date.now();
        sides.forEach((c,i)=>{
          const hw=aw/2-c.size-6,hh=ah-c.size-10;
          const x=(i===0?4:Math.floor(aw/2)+4)+Math.floor(Math.random()*Math.max(1,hw));
          const y=10+Math.floor(Math.random()*Math.max(1,hh));
          const col=['#7C3AED','#4F8EF7'][i];
          const el=$(`<div style="position:absolute;left:${x}px;top:${y}px;width:${c.size}px;height:${c.size}px;border-radius:50%;background:${col};cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.22);transition:transform .08s;"></div>`);
          el.onclick=()=>{
            if(busy)return;
            arena.querySelectorAll('div').forEach(d=>{d.style.pointerEvents='none';});
            const rt=Date.now()-ts;
            if(c.correct){
              const pts=rt<200?5:rt<350?3:rt<500?2:1;
              advance(rt,`+${pts} pts · ${rt}ms ✓`,'#22C55E',pts);
            } else {
              advance(rt,'Wrong circle! 0 pts','#EF4444',0);
            }
          };
          arena.appendChild(el);
        });
        holdT=setTimeout(()=>{if(!busy)advance(2000,'Too slow! ⏱','#EF4444',0);},2000);
      } else {
        const goChance=isNoGo?0.62:1;
        const isGo=Math.random()<goChance;
        const col=isGo?'#EF4444':'#3B82F6';
        const size=50;
        const maxX=Math.max(0,aw-size-10),maxY=Math.max(0,ah-size-10);
        const x=10+Math.floor(Math.random()*maxX);
        const y=10+Math.floor(Math.random()*maxY);
        const el=$(`<div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${col};cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.22);transition:transform .08s;"></div>`);
        const ts=Date.now();
        arena.appendChild(el);
        if(!isGo){
          el.onclick=()=>{if(busy)return;advance(-1,"Don't tap blue! ❌",'#EF4444',0);};
          holdT=setTimeout(()=>{if(!busy)advance(0,'+3 · Correctly ignored ✓','#22C55E',3);},1500);
        } else {
          el.onclick=()=>{
            if(busy)return;
            const rt=Date.now()-ts;
            const pts=rt<200?5:rt<350?3:rt<500?2:1;
            el.style.transform='scale(0.75)';
            advance(rt,`+${pts} pts · ${rt}ms`,'#22C55E',pts);
          };
          holdT=setTimeout(()=>{if(!busy)advance(2000,'Too slow! ⏱','#EF4444',0);},1800);
        }
      }
    },delay);
  }

  function showChart(){
    const validTimes=times.filter(t=>t>0&&t<1999);
    const avg=validTimes.length?Math.round(validTimes.reduce((a,b)=>a+b,0)/validTimes.length):999;
    const ach=S('nz_achievements')||[];
    if(avg<250&&!ach.includes('Lightning')){ach.push('Lightning');setS('nz_achievements',ach);playSound('achievement');}
    if(score>=40&&!ach.includes('Robot')){ach.push('Robot');setS('nz_achievements',ach);playSound('achievement');}
    const n=10,cw=24,gap=3,ph=64,pw=n*(cw+gap)+gap*2;
    const maxMs=Math.max(...validTimes,300);
    const bars=times.map((t,i)=>{
      const x=gap+i*(cw+gap);
      let bh,fc,lbl;
      if(t===0){bh=10;fc='#22C55E';lbl='✓';}
      else if(t<0){bh=10;fc='#EF4444';lbl='✗';}
      else if(t>=1999){bh=ph;fc='#EF4444';lbl='⏱';}
      else{bh=Math.max(8,Math.round(t/maxMs*ph));fc=t<200?'#7C3AED':t<350?'#34D399':t<500?'#FBBF24':'#F97316';lbl=t+'ms';}
      return`<rect x="${x}" y="${ph-bh}" width="${cw}" height="${bh}" rx="3" fill="${fc}"/>
<text x="${x+cw/2}" y="${ph+11}" text-anchor="middle" fill="var(--text2)" font-size="7">${lbl}</text>`;
    }).join('');
    const chartSvg=`<svg width="${pw}" height="${ph+14}" viewBox="0 0 ${pw} ${ph+14}" style="display:block;margin:0 auto;overflow:visible;">${bars}</svg>`;
    end({
      title:'Reaction Lab ⚡',emoji:'⚡',
      sub:`Avg: ${avg}ms · Score: ${score}${avg<250?' · ⚡ Lightning':''}${score>=40?' · 🤖 Robot':''}`,
      value:score,points:score*4,starThresh:[14,26,38],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${score} pts</span></div>
        <div class="row"><span>Avg Reaction</span><span class="val">${avg}ms</span></div>
        <div class="row"><span>Best Single</span><span class="val">${validTimes.length?Math.min(...validTimes)+'ms':'—'}</span></div>
        ${avg<250?'<div class="row"><span>🏆 Achievement</span><span class="val">⚡ Lightning</span></div>':''}
        ${score>=40?'<div class="row"><span>🏆 Achievement</span><span class="val">🤖 Robot</span></div>':''}
      </div>
      <div style="margin-top:14px;">
        <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:6px;">Reaction times — 10 rounds</div>
        ${chartSvg}
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px;font-size:10px;">
          <span style="color:#7C3AED;">■ &lt;200ms</span>
          <span style="color:#34D399;">■ &lt;350ms</span>
          <span style="color:#FBBF24;">■ &lt;500ms</span>
          <span style="color:#F97316;">■ 500ms+</span>
          <span style="color:#22C55E;">■ ✓ skipped</span>
        </div>
      </div>`
    });
  }
}

/* ===================== SPATIAL SPIN ===================== */
function playSpatialSpin(body,setScore,end,wrap,startClock){
  const SHAPES={
    L:[[0,0],[1,0],[2,0],[2,1]],
    T:[[0,0],[0,1],[0,2],[1,1]],
    J:[[0,1],[1,1],[2,1],[2,0]],
  };
  function rotateCW(cells){
    const maxR=Math.max(...cells.map(([r])=>r));
    const rotated=cells.map(([r,c])=>[c,maxR-r]);
    const minR=Math.min(...rotated.map(([r])=>r));
    const minC=Math.min(...rotated.map(([,c])=>c));
    return rotated.map(([r,c])=>[r-minR,c-minC]);
  }
  function getRots(cells){
    const rots=[cells];
    for(let i=0;i<3;i++)rots.push(rotateCW(rots[rots.length-1]));
    return rots;
  }
  function drawShapeSvg(cells,cs,color){
    const maxR=Math.max(...cells.map(([r])=>r));
    const maxC=Math.max(...cells.map(([,c])=>c));
    const p=2,w=(maxC+1)*cs+p*2,h=(maxR+1)*cs+p*2;
    const rects=cells.map(([r,c])=>`<rect x="${c*cs+p}" y="${r*cs+p}" width="${cs-2}" height="${cs-2}" rx="3" fill="${color}"/>`).join('');
    return{svg:`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`,w,h};
  }
  const ROT_LABELS=['90° CW','180°','270° CW'];
  const SHAPE_SEQ=['L','L','L','T','T','T','J','J','J','L','T','J'];
  const questions=SHAPE_SEQ.map((type,i)=>({
    type,dispRot:Math.floor(Math.random()*4),rotAmt:(i%3)+1,hint:i<2
  }));
  let qi=0,score=0,barT=null;
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;">Mental rotation challenge!<br>
    <span style="font-size:11px;color:var(--text2);">Pick the correct rotation from 4 options. 8 seconds each.</span><br>
    <button style="margin-top:10px;padding:10px 24px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="ssStart">▶ Start</button>
  </div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);

  function nextQ(){
    if(qi>=12){
      const ach=S('nz_achievements')||[];
      const gotCadet=score>=8&&!ach.includes('Space Cadet');
      const gotAstro=score>=12&&!ach.includes('Astronaut');
      if(gotCadet){ach.push('Space Cadet');setS('nz_achievements',ach);}
      if(gotAstro){ach.push('Astronaut');setS('nz_achievements',ach);}
      if(gotCadet||gotAstro)playSound('achievement');
      end({
        title:'Spatial Spin! 🔄',emoji:'🔄',
        sub:`${score}/12 correct${score>=12?' 🚀 Astronaut!':score>=8?' 🛸 Space Cadet!':''}`,
        value:score,points:score*8,starThresh:[5,8,11],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Correct</span><span class="val">${score} / 12</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${Math.round(score/12*100)}%</span></div>
          ${score>=12?'<div class="row"><span>🏆 Achievement</span><span class="val">🚀 Astronaut</span></div>':
            score>=8?'<div class="row"><span>🏆 Achievement</span><span class="val">🛸 Space Cadet</span></div>':''}
        </div>`
      });
      return;
    }
    clearInterval(barT);
    const {type,dispRot,rotAmt,hint}=questions[qi];
    const cells=SHAPES[type];
    const rots=getRots(cells);
    const dispCells=rots[dispRot];
    const targetRot=(dispRot+rotAmt)%4;
    const label=ROT_LABELS[rotAmt-1];
    const optColors=['#7C3AED','#4F8EF7','#34D399','#F97316'];
    const optOrder=[0,1,2,3].sort(()=>Math.random()-.5);
    const {svg:dispSvg,w:dw,h:dh}=drawShapeSvg(dispCells,26,'#7C3AED');
    const optButtons=optOrder.map((r,i)=>{
      const {svg:oSvg}=drawShapeSvg(rots[r],20,optColors[i]);
      return`<button class="ss-opt" data-r="${r}" style="padding:10px;background:var(--card);border:2px solid var(--border);border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:64px;transition:border .12s;">${oSvg}</button>`;
    }).join('');
    host.innerHTML=`
      <div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>
      <div style="text-align:center;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;">Q${qi+1}/12 · <span style="color:var(--primary);">Rotate ${label}</span></div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
        <div style="text-align:center;">
          <div style="font-size:10px;color:var(--text2);margin-bottom:4px;">Original</div>
          <div id="ssDisp" style="display:inline-flex;align-items:center;justify-content:center;padding:10px;background:var(--card);border-radius:12px;box-shadow:var(--shadow);">${dispSvg}</div>
        </div>
        <div style="font-size:20px;color:var(--text2);">→</div>
        <div style="text-align:center;">
          <div style="font-size:10px;color:var(--primary);font-weight:700;margin-bottom:4px;">${label}?</div>
          <div style="width:${dw+20}px;height:${dh+20}px;background:var(--card);border-radius:12px;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--text2);">?</div>
        </div>
      </div>
      ${hint?'<div style="text-align:center;font-size:11px;color:#A78BFA;margin-bottom:8px;">💡 Hint: watch the shape animate!</div>':''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:290px;margin:0 auto;" id="ssOpts">${optButtons}</div>
      <div id="ssFb" style="text-align:center;font-size:13px;font-weight:700;min-height:22px;margin-top:8px;"></div>`;
    if(hint){
      const dispEl=host.querySelector('#ssDisp');
      if(dispEl){
        const deg=rotAmt*90;
        setTimeout(()=>{
          dispEl.style.transition='transform 0.9s ease-in-out';
          dispEl.style.transform=`rotate(${deg}deg)`;
          setTimeout(()=>{
            dispEl.style.transition='transform 0.4s ease-in-out';
            dispEl.style.transform='';
          },950);
        },350);
      }
    }
    let elapsed=0;
    barT=setInterval(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/8000*100);
      const bar=host.querySelector('#ssBar');
      if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      if(elapsed>=8000){
        clearInterval(barT);
        host.querySelectorAll('.ss-opt').forEach(b=>{
          if(+b.dataset.r===targetRot){b.style.border='3px solid #22C55E';b.style.background='rgba(52,211,153,.1)';}
          b.disabled=true;
        });
        const fb=host.querySelector('#ssFb');if(fb){fb.style.color='#EF4444';fb.textContent='⏱ Time\'s up!';}
        qi++;setTimeout(nextQ,1000);
      }
    },100);
    host.querySelectorAll('.ss-opt').forEach(btn=>{
      btn.onclick=()=>{
        clearInterval(barT);
        const chosen=+btn.dataset.r;
        const fb=host.querySelector('#ssFb');
        host.querySelectorAll('.ss-opt').forEach(b=>b.disabled=true);
        if(chosen===targetRot){
          playSound('correct');score++;setScore(score);
          btn.style.border='3px solid #22C55E';btn.style.background='rgba(52,211,153,.12)';
          if(fb){fb.style.color='#22C55E';fb.textContent='✅ Correct!';}
        } else {
          playSound('wrong');
          btn.style.border='3px solid #EF4444';
          host.querySelectorAll('.ss-opt').forEach(b=>{
            if(+b.dataset.r===targetRot){b.style.border='3px solid #22C55E';b.style.background='rgba(52,211,153,.12)';}
          });
          if(fb){fb.style.color='#EF4444';fb.textContent='❌ Wrong!';}
        }
        qi++;setTimeout(nextQ,900);
      };
    });
  }
  instrEl.querySelector('#ssStart').onclick=()=>{instrEl.remove();startClock&&startClock();nextQ();};
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
