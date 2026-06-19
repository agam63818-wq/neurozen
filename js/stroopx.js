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
