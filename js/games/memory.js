
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
        value:finalRound,points:finalRound>=20?45:finalRound>=12?30:finalRound>=6?18:8,starThresh:[6,12,20],
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
