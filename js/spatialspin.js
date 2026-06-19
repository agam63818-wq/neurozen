
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