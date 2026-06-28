/* ===================== SCHULTE TABLE v5 — 9-mode redesign =====================
 *  Entry: playSchulte(body, setScore, end, wrap, startClock)
 *  Reuses globals: $, S, setS, playSound, toast, haptic, confetti, _si, _cti, _st,
 *                  todayKey
 *  CSS prefix: .sch-, .sc-cell, .schulte-grid (existing in style.css — untouched)
 *  localStorage keys preserved:
 *    nz_schulte_best_normal, nz_schulte_best_medium, nz_schulte_best_hard,
 *    nz_schulte_games, nz_schulte_accuracy_history,
 *    nz_schulte_daily_date, nz_schulte_daily_done
 *  New additive keys:
 *    nz_schulte_best_reverse, nz_schulte_best_ghost,
 *    nz_schulte_best_blink, nz_schulte_best_spotlight,
 *    nz_schulte_best_endless (highest round reached)
 * ============================================================================ */

const SCHULTE_MODES={
  normal:   {size:5,label:'Normal',   sub:'Classic visual search',          emoji:'\uD83D\uDFE2',bestKey:'nz_schulte_best_normal',  thresh:[30,25,20,15,10], train:'Visual Search'},
  medium:   {size:6,label:'Medium',   sub:'Dense scanning \u00B7 6\u00D76',emoji:'\uD83D\uDFE1',bestKey:'nz_schulte_best_medium',  thresh:[40,35,30,25,20], train:'Visual Search+',   variation:true},
  hard:     {size:7,label:'Hard',     sub:'Relocate under pressure',         emoji:'\uD83D\uDD34',bestKey:'nz_schulte_best_hard',    thresh:[60,52,45,38,32], train:'Relocation',       shuffle:true,shuffleEvery:9},
  reverse:  {size:5,label:'Reverse',  sub:'Tap 25\u21921',                  emoji:'\u21A9\uFE0F',bestKey:'nz_schulte_best_reverse', thresh:[32,27,22,17,12], train:'Cognitive Flex',  reverse:true},
  ghost:    {size:5,label:'Ghost',    sub:'Progressive memory',              emoji:'\uD83D\uDC7B',bestKey:'nz_schulte_best_ghost',   thresh:[60,50,42,35,28], train:'Memory + Search',  ghost:true},
  zen:      {size:5,label:'Zen',      sub:'No timer, no pressure',           emoji:'\uD83E\uDDD8',bestKey:null,                       thresh:[30,25,20,15,10], train:'Relaxed Focus',    zen:true},
  blink:    {size:5,label:'Blink',    sub:'Board flashes on/off',            emoji:'\u26A1',         bestKey:'nz_schulte_best_blink',   thresh:[45,38,32,26,20], train:'Sustained Attention',blink:true},
  spotlight:{size:5,label:'Spotlight',sub:'Tiny visible area',               emoji:'\uD83D\uDD26',bestKey:'nz_schulte_best_spotlight',thresh:[55,48,40,32,26],train:'Peripheral Vision', spotlight:true},
  endless:  {size:5,label:'Endless',  sub:'Survival \u00B7 3 lives',         emoji:'\u267E\uFE0F',bestKey:'nz_schulte_best_endless', thresh:[0,0,0,0,0],     train:'Brain Endurance',  endless:true}
};
const SCHULTE_ORDER=['normal','medium','hard','reverse','ghost','zen','blink','spotlight','endless'];

function schulteRating(secs,thresh){
  const [t30,t25,t20,t15,t10]=thresh;
  if(secs>=t30)return{emoji:'\uD83D\uDE42',text:'Good'};
  if(secs>=t25)return{emoji:'\uD83D\uDE0E',text:'Great'};
  if(secs>=t20)return{emoji:'\uD83D\uDD25',text:'Amazing'};
  if(secs>=t15)return{emoji:'\u26A1',text:'Incredible'};
  if(secs>=t10)return{emoji:'\uD83E\uDDE0',text:'Genius'};
  return{emoji:'\uD83D\uDC51',text:'Legendary Focus'};
}
function schulteAccuracyAvg(){
  const h=S('nz_schulte_accuracy_history')||[];
  if(!h.length)return 0;
  return Math.round(h.reduce((a,b)=>a+b,0)/h.length);
}
function schulteFocusRating(){
  const acc=schulteAccuracyAvg();
  const best=S('nz_schulte_best_normal');
  let timeScore=50;
  if(best!=null){const b=+best;timeScore=Math.max(0,Math.min(100,Math.round(100-(b-8)*3)));}
  if(!acc&&best==null)return 0;
  return Math.round(acc*0.5+timeScore*0.5);
}

function schulteDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {mode:'normal',   label:'Normal Mode under 20s',    limit:20},
    {mode:'medium',   label:'Medium Mode under 35s',    limit:35},
    {mode:'ghost',    label:'Ghost Mode under 50s',     limit:50},
    {mode:'hard',     label:'Hard Mode under 55s',      limit:55},
    {mode:'reverse',  label:'Reverse Mode under 25s',   limit:25},
    {mode:'blink',    label:'Blink Mode under 38s',     limit:38},
    {mode:'spotlight',label:'Spotlight Mode under 48s', limit:48},
    {mode:'endless',  label:'Endless: reach Round 5',   limit:Infinity,roundTarget:5},
    {mode:'normal',   label:'Normal Mode under 15s',    limit:15}
  ];
  return defs[dayN%defs.length];
}
function schulteDailyDone(){
  return S('nz_schulte_daily_date')===todayKey()&&!!S('nz_schulte_daily_done');
}

/* Anti-repetition: keep last 2 layout hashes per mode/size in memory */
const _SCH_RECENT={};
function _layoutHash(nums){return nums.slice(0,10).join(',');}
function _genFreshLayout(size,modeKey){
  const total=size*size;
  const recent=_SCH_RECENT[modeKey]||[];
  for(let attempt=0;attempt<8;attempt++){
    const nums=Array.from({length:total},(_,i)=>i+1).sort(()=>Math.random()-0.5);
    const h=_layoutHash(nums);
    if(recent.indexOf(h)<0){
      recent.push(h);
      if(recent.length>2)recent.shift();
      _SCH_RECENT[modeKey]=recent;
      return nums;
    }
  }
  return Array.from({length:total},(_,i)=>i+1).sort(()=>Math.random()-0.5);
}

function playSchulte(body,setScore,end,wrap,startClock){
  let mode='normal';
  let challenge=true;

  /* per-game cleanup tracking */
  const G={
    intervals:[],
    timeouts:[],
    spotlightHandler:null,
    boardGridEl:null,
    blinkTimer:null,
    hintTimer:null,
    revealTimer:null
  };
  function _ct(id){clearTimeout(id);}
  function _trackT(id){G.timeouts.push(id);return id;}
  function _trackI(id){G.intervals.push(id);return id;}
  function _cleanupSchulte(){
    G.intervals.forEach(id=>_cti(id));G.intervals=[];
    G.timeouts.forEach(id=>_ct(id));G.timeouts=[];
    if(G.spotlightHandler&&G.boardGridEl){
      G.boardGridEl.removeEventListener('pointermove',G.spotlightHandler);
      G.boardGridEl.removeEventListener('pointerdown',G.spotlightHandler);
      G.spotlightHandler=null;
    }
    G.blinkTimer=null;G.hintTimer=null;G.revealTimer=null;
  }
  wrap.addEventListener('remove_game',_cleanupSchulte);

  renderStart();

  /* ====================== START SCREEN ====================== */
  function renderStart(){
    body.innerHTML='';
    const bestN=S('nz_schulte_best_normal');
    const games=S('nz_schulte_games')||0;
    const acc=schulteAccuracyAvg();
    const focus=schulteFocusRating();
    const dc=schulteDailyChallenge();
    const dcDone=schulteDailyDone();
    const bestEndless=S('nz_schulte_best_endless')||0;
    const screen=$('<div class="sch-start"></div>');
    screen.innerHTML=
      '<div class="sch-stats">'+
        '<div class="sch-stat"><div class="v">'+(bestN!=null?bestN+'s':'\u2014')+'</div><div class="l">Best Time</div></div>'+
        '<div class="sch-stat"><div class="v">'+games+'</div><div class="l">Games</div></div>'+
        '<div class="sch-stat"><div class="v">'+acc+'%</div><div class="l">Accuracy</div></div>'+
        '<div class="sch-stat"><div class="v">'+focus+'</div><div class="l">Focus</div></div>'+
      '</div>'+
      (bestEndless>0?'<div style="max-width:260px;margin:0 auto 12px;background:linear-gradient(135deg,#7C3AED22,#4F8EF722);padding:10px 14px;border-radius:12px;text-align:center;font-weight:700;">\u267E\uFE0F Endless Best: Round '+bestEndless+'</div>':'')+
      '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;">'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="dc-ico">'+(dcDone?'\u2705':'\uD83C\uDFAF')+'</div>'+
          '<div style="flex:1;"><div class="dc-name">Daily: '+dc.label+'</div><div class="dc-sub">'+(dcDone?'Completed today!':'Complete for bonus XP')+'</div></div>'+
          '<span class="dc-badge">2x XP</span>'+
        '</div>'+
      '</div>'+
      '<div class="sch-mode-title">Choose a Mode</div>'+
      '<div class="sch-modes" id="schModes"></div>'+
      '<div class="sch-toggle" id="schToggle">'+
        '<button class="sch-tg active" data-c="1">\u23F1 Challenge<span>Timer \u00B7 records</span></button>'+
        '<button class="sch-tg" data-c="0">\uD83E\uDDD8 Practice<span>No ranking</span></button>'+
      '</div>'+
      '<button class="btn-primary" id="schGo" style="margin-top:18px;">Start Game \u25B6</button>';
    body.appendChild(screen);
    const modesEl=screen.querySelector('#schModes');
    SCHULTE_ORDER.forEach(k=>{
      const m=SCHULTE_MODES[k];
      const sizeLine=m.endless?'Survival \u00B7 \u2764\u2764\u2764':
                     m.spotlight?m.size+'\u00D7'+m.size+' \u00B7 dark':
                     m.blink?m.size+'\u00D7'+m.size+' \u00B7 on/off':
                     m.zen?m.size+'\u00D7'+m.size+' \u00B7 no timer':
                     m.reverse?m.size+'\u00D7'+m.size+' \u00B7 '+(m.size*m.size)+'\u21921':
                     m.size+'\u00D7'+m.size+' \u00B7 1\u2192'+(m.size*m.size);
      const card=$('<button class="sch-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid">'+sizeLine+'</div>'+
        '<div class="sm-sub">'+m.sub+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.sch-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));updateToggleForMode();};
      modesEl.appendChild(card);
    });
    const toggleEl=screen.querySelector('#schToggle');
    function updateToggleForMode(){
      const m=SCHULTE_MODES[mode];
      const forcedPractice=!!m.zen;
      const forcedChallenge=!!m.endless;
      if(forcedPractice)challenge=false;
      if(forcedChallenge)challenge=true;
      toggleEl.querySelectorAll('.sch-tg').forEach(b=>b.classList.toggle('active',(b.dataset.c==='1')===challenge));
      const disabled=forcedPractice||forcedChallenge;
      toggleEl.style.opacity=disabled?'0.5':'1';
      toggleEl.style.pointerEvents=disabled?'none':'auto';
    }
    toggleEl.querySelectorAll('.sch-tg').forEach(b=>{
      b.onclick=()=>{playSound('tap');challenge=b.dataset.c==='1';updateToggleForMode();};
    });
    updateToggleForMode();
    screen.querySelector('#schGo').onclick=()=>{playSound('tap');if(startClock)startClock();startCountdown();};
  }

  /* ====================== COUNTDOWN ====================== */
  function startCountdown(){
    const m=SCHULTE_MODES[mode];
    const useTimer=challenge&&!m.zen;
    body.innerHTML='';
    const ov=$('<div class="countdown-overlay"><div class="countdown-num" id="cdNum">3</div><div class="countdown-sub">'+m.emoji+' '+m.label+' \u00B7 '+m.train+'</div></div>');
    wrap.appendChild(ov);
    buildBoard(m,useTimer,{round:1});
    let n=3;
    const numEl=ov.querySelector('#cdNum');
    const step=()=>{
      n--;
      if(n>0){
        numEl.textContent=n;
        numEl.style.animation='none';void numEl.offsetWidth;
        numEl.style.animation='countPop .35s cubic-bezier(.16,1,.3,1)';
        _trackT(_st(step,800));
      }else{
        numEl.textContent='GO!';
        numEl.style.animation='none';void numEl.offsetWidth;
        numEl.style.animation='countPop .4s cubic-bezier(.16,1,.3,1)';
        playSound('complete');
        _trackT(_st(()=>{ov.remove();beginGame(m,useTimer,{round:1,endlessLives:3,endlessScore:0});},650));
      }
    };
    _trackT(_st(step,800));
  }

  /* ====================== BOARD BUILDER ====================== */
  let board=null;
  function buildBoard(m,useTimer,ctx){
    const flavor=m.endless?_endlessFlavor(ctx.round):m;
    const size=flavor.size;
    const total=size*size;
    const layoutKey=mode+'_'+size;
    const nums=_genFreshLayout(size,layoutKey);
    const chipEmoji=flavor.emoji||m.emoji||'\u25A6';
    const fs=size<=5?'22px':size===6?'17px':'14px';
    const cont=$('<div class="sch-play'+(m.zen?' sch-zen':'')+'"></div>');
    const extraStyle=m.spotlight?'background:#0a0a14;border-radius:14px;padding:12px;position:relative;overflow:hidden;':'';
    let chipText=chipEmoji+' '+m.label+' Mode'+(useTimer?'':' \u00B7 Practice');
    if(m.endless)chipText=chipEmoji+' Endless \u00B7 Round '+ctx.round+(flavor.tag?' \u00B7 '+flavor.tag:'');
    cont.innerHTML=
      '<div class="sch-chip">'+chipText+'</div>'+
      (m.endless?'<div id="schEndlessHud" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;font-size:13px;font-weight:700;">'+
        '<span id="schEndlessHearts">'+_renderHearts(ctx.endlessLives)+'</span>'+
        '<span style="color:var(--primary);">Score '+ctx.endlessScore+'</span>'+
      '</div>':'')+
      '<div class="sch-progress"><div class="sch-progress-fill" id="schProg" style="width:0%"></div></div>'+
      ((useTimer||m.endless)?'<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>':'')+
      '<div class="schulte-grid" id="schGrid" style="grid-template-columns:repeat('+size+',1fr);font-size:'+fs+';'+extraStyle+'"></div>'+
      '<div class="sch-find" id="schFind">Find: <strong id="schNext"></strong></div>';
    body.appendChild(cont);
    const grid=cont.querySelector('#schGrid');
    const cells=[];
    nums.forEach(n=>{
      const c=$('<div class="sc-cell">'+n+'</div>');
      c.dataset.n=n;
      grid.appendChild(c);
      cells.push(c);
    });
    if(m.variation){
      cells.forEach(c=>{
        const variance=85+Math.floor(Math.random()*15);
        c.style.filter='brightness('+variance+'%)';
      });
    }
    let spotlightEl=null;
    if(m.spotlight){
      grid.style.position='relative';
      cells.forEach(c=>{c.style.color='transparent';c.style.background='rgba(124,58,237,0.08)';});
      spotlightEl=$('<div class="sch-spotlight" style="position:absolute;pointer-events:none;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.5) 40%,rgba(0,0,0,0) 70%);mix-blend-mode:screen;width:120px;height:120px;left:-200px;top:-200px;transition:width 0.4s ease,height 0.4s ease;z-index:10;"></div>');
      grid.appendChild(spotlightEl);
    }
    board={m,flavor,total,cells,locked:true,cont,spotlightEl,size};
    G.boardGridEl=grid;
  }

  function _endlessFlavor(round){
    if(round<=2)return{size:5,emoji:'\uD83D\uDFE2',tag:'Normal'};
    if(round<=4)return{size:5,emoji:'\u21A9\uFE0F',reverse:true,tag:'Reverse'};
    if(round<=6)return{size:5,emoji:'\u26A1',blink:true,tag:'Blink'};
    if(round<=9)return{size:5,emoji:'\uD83D\uDC7B',ghost:true,tag:'Ghost'};
    if(round<=14)return{size:6,emoji:'\uD83D\uDFE1',tag:'Medium 6\u00D76'};
    return{size:7,emoji:'\uD83D\uDD34',shuffle:true,shuffleEvery:9,tag:'Hard 7\u00D77'};
  }

  function _renderHearts(lives){
    return Array.from({length:3},(_,i)=>'<span style="font-size:16px;margin-right:2px;">'+(i<lives?'\u2764\uFE0F':'\uD83D\uDC94')+'</span>').join('');
  }

  /* ====================== BEGIN ROUND ====================== */
  function beginGame(m,useTimer,ctx){
    const {total,cells,cont,flavor,size}=board;
    board.locked=false;
    const eff={
      reverse:!!(m.reverse||flavor.reverse),
      ghost:!!(m.ghost||flavor.ghost),
      blink:!!(m.blink||flavor.blink),
      shuffle:!!(m.shuffle||flavor.shuffle),
      shuffleEvery:flavor.shuffleEvery||m.shuffleEvery||9,
      spotlight:!!m.spotlight,
      endless:!!m.endless
    };
    let next=eff.reverse?total:1;
    let done=0,correct=0,wrong=0;
    const startTs=Date.now();
    let penaltyMs=0;
    let barTimer=null;
    let ghostPhase=1;
    let ghostHintUsed=0;
    const findEl=cont.querySelector('#schNext');
    const progEl=cont.querySelector('#schProg');
    if(findEl)findEl.textContent=next;

    /* ========== GHOST 4-PHASE PROGRESSIVE MEMORY ========== */
    function _ghostAdvance(){
      if(!eff.ghost)return;
      if(done===5&&ghostPhase===1){
        ghostPhase=2;
        toast('\uD83D\uDC7B Phase 2 \u2014 fading...');
        cells.filter(c=>!c.classList.contains('done')).forEach(c=>{
          c.style.transition='opacity 6s ease-in-out';
          c.style.opacity='0.25';
        });
        _trackT(_st(_ghostPhase3,7000));
      }
    }
    function _ghostPhase3(){
      if(board.locked||done>=total||ghostPhase>=3)return;
      ghostPhase=3;
      toast('\uD83D\uDC7B Phase 3 \u2014 tap to peek (300ms)');
      cells.forEach(c=>{
        if(c.classList.contains('done'))return;
        c.style.transition='opacity 0.2s';
        c.style.opacity='0';
        c.style.background='var(--card)';
      });
      const phase3StartDone=done;
      _trackT(_st(()=>{
        if(board.locked||done>=total||ghostPhase>=4)return;
        _ghostPhase4();
      },10000));
      board._ghostP3Check=()=>{
        if(done-phase3StartDone>=5&&ghostPhase===3){_ghostPhase4();}
      };
    }
    function _ghostPhase4(){
      if(board.locked||done>=total)return;
      ghostPhase=4;
      toast('\uD83D\uDC7B Phase 4 \u2014 blind! Idle 5s for hint');
      cells.forEach(c=>{if(!c.classList.contains('done'))c.style.opacity='0';});
      _ghostHintLoop();
    }
    function _ghostHintLoop(){
      if(board.locked||done>=total||ghostPhase!==4)return;
      G.hintTimer=_st(()=>{
        if(board.locked||done>=total||ghostPhase!==4)return;
        const targetCell=cells.find(c=>+c.dataset.n===next&&!c.classList.contains('done'));
        if(targetCell){
          ghostHintUsed++;
          penaltyMs+=1500;
          targetCell.style.transition='opacity 0.2s';
          targetCell.style.opacity='1';
          targetCell.style.background='linear-gradient(135deg,#FBBF24,#F59E0B)';
          targetCell.style.color='#fff';
          _trackT(_st(()=>{
            if(!targetCell.classList.contains('done')){
              targetCell.style.opacity='0';
              targetCell.style.background='var(--card)';
              targetCell.style.color='';
            }
          },500));
        }
        _ghostHintLoop();
      },5000);
      _trackT(G.hintTimer);
    }
    function _ghostResetHintTimer(){
      if(G.hintTimer){_ct(G.hintTimer);G.hintTimer=null;}
      if(ghostPhase===4)_ghostHintLoop();
    }
    function _ghostPeek(c){
      if(ghostPhase!==3||c.classList.contains('done'))return;
      if(G.revealTimer){_ct(G.revealTimer);G.revealTimer=null;}
      c.style.transition='opacity 0.1s';
      c.style.opacity='1';
      G.revealTimer=_st(()=>{
        if(!c.classList.contains('done'))c.style.opacity='0';
      },300);
      _trackT(G.revealTimer);
    }

    /* ========== BLINK ========== */
    function _startBlink(){
      if(!eff.blink)return;
      let visible=true;
      let interval=800;
      let cycles=0;
      const tick=()=>{
        if(board.locked||done>=total)return;
        visible=!visible;
        cells.forEach(c=>{
          if(c.classList.contains('done'))return;
          c.style.transition='opacity 0.18s';
          c.style.opacity=visible?'1':'0';
        });
        cycles++;
        if(cycles%10===0&&interval>350)interval=Math.max(350,interval-50);
        G.blinkTimer=_st(tick,interval);
        _trackT(G.blinkTimer);
      };
      G.blinkTimer=_st(tick,interval);
      _trackT(G.blinkTimer);
    }

    /* ========== SPOTLIGHT ========== */
    function _startSpotlight(){
      if(!eff.spotlight||!board.spotlightEl)return;
      let radius=120;
      const grid=cont.querySelector('#schGrid');
      const updatePos=(e)=>{
        const rect=grid.getBoundingClientRect();
        let x,y;
        if(e.touches&&e.touches.length){x=e.touches[0].clientX-rect.left;y=e.touches[0].clientY-rect.top;}
        else{x=e.clientX-rect.left;y=e.clientY-rect.top;}
        board.spotlightEl.style.left=(x-radius/2)+'px';
        board.spotlightEl.style.top=(y-radius/2)+'px';
        cells.forEach(c=>{
          if(c.classList.contains('done'))return;
          const cr=c.getBoundingClientRect();
          const cx=cr.left-rect.left+cr.width/2;
          const cy=cr.top-rect.top+cr.height/2;
          const dist=Math.hypot(cx-x,cy-y);
          if(dist<radius/2+10){
            c.style.color='var(--text)';
            c.style.background='rgba(255,255,255,0.95)';
          }else{
            c.style.color='transparent';
            c.style.background='rgba(124,58,237,0.08)';
          }
        });
      };
      G.spotlightHandler=updatePos;
      grid.addEventListener('pointermove',updatePos);
      grid.addEventListener('pointerdown',updatePos);
      board._spotlightShrink=()=>{
        const stages=[120,100,85,75,68];
        const stage=Math.min(stages.length-1,Math.floor(done/5));
        radius=stages[stage];
        if(board.spotlightEl){
          board.spotlightEl.style.width=radius+'px';
          board.spotlightEl.style.height=radius+'px';
        }
      };
    }

    /* ========== HARD MODE SHUFFLE ========== */
    function _shuffleRemaining(){
      const remaining=cells.filter(c=>!c.classList.contains('done'));
      if(remaining.length<2)return;
      const nums=remaining.map(c=>+c.dataset.n);
      for(let i=nums.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=nums[i];nums[i]=nums[j];nums[j]=t;}
      let moved=0;
      remaining.forEach((c,i)=>{
        if(+c.dataset.n!==nums[i])moved++;
        c.dataset.n=nums[i];
        c.textContent=nums[i];
      });
      if(moved<remaining.length*0.6&&remaining.length>=3){
        const nums2=remaining.map(c=>+c.dataset.n);
        for(let i=nums2.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=nums2[i];nums2[i]=nums2[j];nums2[j]=t;}
        remaining.forEach((c,i)=>{c.dataset.n=nums2[i];c.textContent=nums2[i];});
      }
      remaining.forEach((c,i)=>{
        _trackT(_st(()=>{c.classList.add('sch-wave');_trackT(_st(()=>c.classList.remove('sch-wave'),300));},i*15));
      });
      toast('\uD83D\uDD04 Shuffle! Find '+next);
      haptic([20,40,20]);
    }

    /* ========== TIMER BAR ========== */
    if(useTimer&&!eff.endless){
      const maxMs=(m.thresh[0]+20)*1000;
      barTimer=_si(()=>{
        const elapsed=Date.now()-startTs+penaltyMs;
        const pct=Math.max(0,100-(elapsed/maxMs*100));
        const bar=wrap.querySelector('#sBar');
        if(bar){
          bar.style.width=pct+'%';
          const rem=(maxMs-elapsed)/1000;
          bar.className='timer-fill '+(rem<10?'timer-red':rem<25?'timer-yellow':'timer-green');
        }
      },100);
      _trackI(barTimer);
    }
    if(eff.endless){
      const maxMs=45000;
      barTimer=_si(()=>{
        const elapsed=Date.now()-startTs;
        const pct=Math.max(0,100-(elapsed/maxMs*100));
        const bar=wrap.querySelector('#sBar');
        if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
      },100);
      _trackI(barTimer);
    }

    if(eff.blink)_startBlink();
    if(eff.spotlight)_startSpotlight();

    /* ========== CELL CLICK HANDLER ========== */
    cells.forEach(c=>{
      c.onclick=()=>{
        if(board.locked)return;
        const n=+c.dataset.n;
        if(eff.ghost&&ghostPhase===3&&!c.classList.contains('done')){
          _ghostPeek(c);
          if(n===next)_handleCorrect(c);
          else _handleWrong(c);
          return;
        }
        if(n===next)_handleCorrect(c);
        else _handleWrong(c);
      };
    });

    function _handleCorrect(c){
      correct++;done++;
      playSound('correct');
      c.classList.add('done');
      c.classList.remove('sch-ghost-hidden');
      c.style.opacity='1';
      c.style.color='';
      c.style.background='';
      setScore(done);
      if(progEl)progEl.style.width=Math.round(done/total*100)+'%';
      next=eff.reverse?next-1:next+1;
      const remaining=eff.reverse?next>=1:next<=total;
      if(findEl&&remaining)findEl.textContent=next;
      _ghostResetHintTimer();
      _ghostAdvance();
      if(board._ghostP3Check)board._ghostP3Check();
      if(board._spotlightShrink)board._spotlightShrink();
      if(eff.shuffle&&done>0&&done%eff.shuffleEvery===0&&done<total){
        _trackT(_st(_shuffleRemaining,200));
      }
      if(done>=total){
        if(barTimer){_cti(barTimer);barTimer=null;}
        finishBoard();
      }
    }

    function _handleWrong(c){
      wrong++;
      playSound('wrong');
      haptic([30,50,30]);
      c.classList.add('wrong');
      penaltyMs+=2000;
      flashEdge();
      if(eff.ghost){
        const pen=$('<span class="sch-pen">-2s</span>');
        c.appendChild(pen);
        _trackT(_st(()=>pen.remove(),800));
      }
      _trackT(_st(()=>c.classList.remove('wrong'),350));
      if(eff.endless){
        ctx.endlessLives--;
        const heartsEl=cont.querySelector('#schEndlessHearts');
        if(heartsEl)heartsEl.innerHTML=_renderHearts(ctx.endlessLives);
        if(ctx.endlessLives<=0){
          if(barTimer){_cti(barTimer);barTimer=null;}
          finishEndless();
        }
      }
    }

    function finishBoard(){
      board.locked=true;
      _cleanupMidGame();
      if(eff.endless){
        const rawSecs=(Date.now()-startTs)/1000;
        const cleanBonus=wrong===0?10:0;
        ctx.endlessScore+=Math.max(1,Math.round(50-rawSecs))+cleanBonus;
        toast('\u2705 Round '+ctx.round+' complete!'+(cleanBonus?' +'+cleanBonus+' clean':''));
        confetti(25);
        ctx.round++;
        _trackT(_st(()=>{
          body.innerHTML='';
          buildBoard(m,useTimer,ctx);
          beginGame(m,useTimer,ctx);
        },700));
        return;
      }
      finish();
    }

    function finishEndless(){
      board.locked=true;
      _cleanupMidGame();
      const reached=ctx.round;
      const prev=S('nz_schulte_best_endless')||0;
      const newPB=reached>prev;
      if(newPB)setS('nz_schulte_best_endless',reached);
      setS('nz_schulte_games',(S('nz_schulte_games')||0)+1);
      if(newPB)confetti(60);
      const dc=schulteDailyChallenge();
      if(dc.mode==='endless'&&!schulteDailyDone()&&dc.roundTarget&&reached>=dc.roundTarget){
        setS('nz_schulte_daily_date',todayKey());
        setS('nz_schulte_daily_done',true);
        _trackT(_st(()=>toast('\uD83C\uDFAF Daily Challenge complete! 2x XP'),700));
      }
      const focusScore=Math.min(100,Math.max(10,Math.round(reached*8+ctx.endlessScore*0.3)));
      const pts=focusScore>=85?48:focusScore>=65?32:focusScore>=40?20:10;
      end({
        title:'\u267E\uFE0F Endless Run',emoji:'\u267E\uFE0F',
        sub:'Round '+reached+' \u00B7 Score '+ctx.endlessScore+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
        value:focusScore,points:pts,starThresh:[40,65,85],
        statsHtml:'<div class="end-stats">'+
          '<div class="row"><span>Round Reached</span><span class="val">'+reached+'</span></div>'+
          '<div class="row"><span>Total Score</span><span class="val">'+ctx.endlessScore+'</span></div>'+
          '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(reached,prev)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
          '<div class="row"><span>Mode</span><span class="val">Endless Survival</span></div>'+
        '</div>'+(newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
      });
    }

    function finish(){
      const rawSecs=(Date.now()-startTs)/1000;
      const secs=rawSecs+(useTimer?penaltyMs/1000:0);
      const secsR=Math.round(secs*10)/10;
      const totalTaps=correct+wrong;
      const accuracy=totalTaps?Math.round(correct/totalTaps*100):100;
      const rating=schulteRating(secsR,m.thresh);
      let focusScore=100-(wrong*5)-ghostHintUsed*3;
      const overGood=secsR-m.thresh[4];
      if(overGood>0)focusScore-=Math.min(60,Math.round(overGood*2));
      focusScore=Math.max(10,Math.min(100,focusScore));
      cells.forEach((cell,i)=>{
        _trackT(_st(()=>{cell.classList.add('sch-wave');_trackT(_st(()=>cell.classList.remove('sch-wave'),400));},i*22));
      });
      confetti(50);
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
        const dc=schulteDailyChallenge();
        if(dc.mode===mode&&!schulteDailyDone()&&dc.limit!==Infinity&&secsR<=dc.limit){
          setS('nz_schulte_daily_date',todayKey());
          setS('nz_schulte_daily_done',true);
          _trackT(_st(()=>toast('\uD83C\uDFAF Daily Challenge complete! 2x XP'),700));
        }
      }
      const pts=focusScore>=85?48:focusScore>=65?32:focusScore>=40?20:10;
      end({
        title:rating.emoji+' '+rating.text,emoji:rating.emoji,
        sub:secsR+'s \u00B7 '+m.emoji+' '+m.label+' Mode',
        value:focusScore,points:pts,
        starThresh:[40,65,85],
        statsHtml:'<div class="end-stats">'+
          '<div class="row"><span>Time</span><span class="val">'+secsR+'s</span></div>'+
          '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'%</span></div>'+
          '<div class="row"><span>Wrong Taps</span><span class="val">'+wrong+'</span></div>'+
          '<div class="row"><span>Focus Score</span><span class="val">'+focusScore+'/100</span></div>'+
          (eff.ghost&&ghostHintUsed>0?'<div class="row"><span>Hints Used</span><span class="val">'+ghostHintUsed+'</span></div>':'')+
          (!ranked?'<div class="row"><span>Mode</span><span class="val">Practice (not ranked)</span></div>':'')+
          (newPB?'<div class="row"><span>\uD83C\uDFC6 New Personal Best!</span><span class="val">'+secsR+'s</span></div>':'')+
        '</div>'
      });
    }

    function _cleanupMidGame(){
      if(barTimer){_cti(barTimer);barTimer=null;}
      if(G.blinkTimer){_ct(G.blinkTimer);G.blinkTimer=null;}
      if(G.hintTimer){_ct(G.hintTimer);G.hintTimer=null;}
      if(G.revealTimer){_ct(G.revealTimer);G.revealTimer=null;}
      if(G.spotlightHandler&&G.boardGridEl){
        G.boardGridEl.removeEventListener('pointermove',G.spotlightHandler);
        G.boardGridEl.removeEventListener('pointerdown',G.spotlightHandler);
        G.spotlightHandler=null;
      }
    }
  }

  function flashEdge(){
    let g=document.getElementById('schEdgeGlow');
    if(!g){g=$('<div id="schEdgeGlow" class="sch-edge-glow"></div>');document.body.appendChild(g);}
    g.classList.add('show');
    _trackT(_st(()=>{g.classList.remove('show');},120));
  }
}
