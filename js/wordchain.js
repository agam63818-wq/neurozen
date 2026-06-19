/* ===================== STROOP X ===================== */
function playStroopX(body,setScore,end,wrap,startClock){
  const COLORS=[
    {name:'Red',hex:'#EF4444'},{name:'Blue',hex:'#3B82F6'},{name:'Green',hex:'#22C55E'},
    {name:'Yellow',hex:'#EAB308'},{name:'Purple',hex:'#A855F7'},{name:'Orange',hex:'#F97316'},
    {name:'Cyan',hex:'#06B6D4'},{name:'Pink',hex:'#EC4899'}
  ];
  const SHAPES=[
    {name:'Circle',sym:'●'},{name:'Square',sym:'■'},
    {name:'Triangle',sym:'▲'},{name:'Star',sym:'★'}
  ];
  const DIRECTIONS=[
    {name:'Up',sym:'↑'},{name:'Down',sym:'↓'},
    {name:'Left',sym:'←'},{name:'Right',sym:'→'}
  ];
  const VARIANT_DEFS={
    classic:{id:'classic',emoji:'🎨',label:'Word·Ink',color:'#7C3AED',desc:'Word ka color alag, INK tap karo'},
    shape:{id:'shape',emoji:'🔷',label:'Shape',color:'#4F8EF7',desc:'Shape dikhti hai — usse pehchano'},
    number:{id:'number',emoji:'🔢',label:'Number',color:'#F97316',desc:'Number ya digit count — focus!'},
    position:{id:'position',emoji:'⬆',label:'Position',color:'#34D399',desc:'Word neeche hai ya upar?'},
    arrow:{id:'arrow',emoji:'➡',label:'Arrow',color:'#F472B6',desc:'Arrow direction dekho'},
    dual:{id:'dual',emoji:'🔥',label:'Dual',color:'#EF4444',desc:'2 inks — same ya different?'},
    reverse:{id:'reverse',emoji:'🔄',label:'Reverse',color:'#22C55E',desc:'WORD likha hai, INK nahi'}
  };
  const MODE_DEFS={
    classic:{label:'Classic',emoji:'🎨',sub:'7 variants · 3 lives · 3s timer',lives:3,baseTime:3000,scoreMult:1,minTime:1200,timeDecay:60,colorsStart:5,colorsIncEvery:8},
    speed:{label:'Speed',emoji:'⚡',sub:'Fast timer 2s · 1.5x points',lives:3,baseTime:2000,scoreMult:1.5,minTime:800,timeDecay:40,colorsStart:5,colorsIncEvery:6},
    marathon:{label:'Marathon',emoji:'🏃',sub:'5 lives · slow start · endless',lives:5,baseTime:3500,scoreMult:1,minTime:1000,timeDecay:50,colorsStart:5,colorsIncEvery:10},
    zen:{label:'Zen',emoji:'🧘',sub:'No timer · no lives · practice',lives:99,baseTime:0,scoreMult:0.5,minTime:0,timeDecay:0,colorsStart:5,colorsIncEvery:10}
  };
  const VARIANTS_ALL=['classic','shape','number','position','arrow','dual','reverse'];
  const VARIANTS_EASY=['classic','shape','reverse'];
  const VARIANTS_MED=['number','position','arrow'];
  const VARIANTS_HARD=['dual'];
  const SPECIAL_EVENTS=[
    {id:'speed',emoji:'⚡',label:'SPEED!',sub:'2x points · 1.5s timer',mult:2,timer:1500},
    {id:'immunity',emoji:'🛡️',label:'IMMUNITY!',sub:'Wrong = no life lost',noLife:true},
    {id:'double',emoji:'🎯',label:'DOUBLE!',sub:'3x points this round',mult:3,timer:0},
    {id:'lightning',emoji:'🌩️',label:'LIGHTNING!',sub:'1s timer · 4x points',mult:4,timer:1000},
    {id:'rainbow',emoji:'🌈',label:'RAINBOW!',sub:'8 colors · 2x points',mult:2,allColors:true}
  ];
  const record=S('nz_stroop_best')||0;
  let mode='classic',round=0,score=0,combo=0,maxCombo=0,lives=3,variantPool=[],difficulty=0;
  let host,specialActive=null,isZen=false;

  renderStart();

  function renderStart(){
    body.innerHTML='';
    const best=S('nz_stroop_best')||0;
    const games=S('nz_stroop_games')||0;
    const screen=$(`<div class="sx-start"></div>`);
    screen.innerHTML=`
      <div class="sx-hero">
        <div style="font-size:52px;margin-bottom:6px;">🎨</div>
        <h2 style="margin:0 0 6px;font-size:20px;">Color Stroop Xtreme</h2>
        <p style="font-size:12px;color:var(--text2);margin:0;">7 Stroop variants · Endless · Har round naya challenge!</p>
        ${best?`<div class="sx-best-chip">🏆 Best: ${best} pts</div>`:''}
      </div>
      <div style="font-size:13px;font-weight:700;margin:4px 2px 10px;">Choose Mode</div>
      <div class="sx-modes" id="sxModes"></div>
      <button class="btn-primary" id="sxGo" style="margin-top:18px;width:100%;padding:16px;">Start Game ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#sxModes');
    Object.keys(MODE_DEFS).forEach(k=>{
      const m=MODE_DEFS[k];
      const card=$(`<button class="sx-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.sx-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#sxGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const def=MODE_DEFS[mode];
    lives=def.lives;score=0;round=0;combo=0;maxCombo=0;specialActive=null;
    isZen=mode==='zen';
    difficulty=0;
    body.innerHTML='';
    host=$(`<div class="sx-host"></div>`);
    body.appendChild(host);
    nextRound();
  }

  function getColors(){
    const def=MODE_DEFS[mode];
    const n=Math.min(8,def.colorsStart+Math.floor(round/def.colorsIncEvery));
    return COLORS.slice(0,n);
  }

  function getTimer(){
    if(isZen)return 0;
    if(specialActive&&specialActive.timer)return specialActive.timer;
    const def=MODE_DEFS[mode];
    return Math.max(def.minTime,def.baseTime-round*def.timeDecay);
  }

  function getScoreMult(){
    let m=MODE_DEFS[mode].scoreMult;
    if(combo>=5)m*=1.5;
    else if(combo>=3)m*=1.25;
    if(specialActive&&specialActive.mult)m*=specialActive.mult;
    return m;
  }

  function pickVariant(){
    const easy=VARIANTS_EASY.filter(v=>!specialActive||specialActive.id!=='rainbow'||v!=='dual');
    const med=VARIANTS_MED;
    const hard=VARIANTS_HARD;
    if(specialActive&&specialActive.allColors)return VARIANTS_ALL.filter(v=>v!=='dual')[Math.floor(Math.random()*(VARIANTS_ALL.length-1))];
    if(round<5)return easy[Math.floor(Math.random()*easy.length)];
    if(round<12){const pool=[...easy,...med];return pool[Math.floor(Math.random()*pool.length)];}
    const pool=[...easy,...med,...hard];return pool[Math.floor(Math.random()*pool.length)];
  }

  function checkSpecial(){
    if(round>0&&round%10===0&&mode!=='zen'){
      specialActive=SPECIAL_EVENTS[Math.floor(Math.random()*SPECIAL_EVENTS.length)];
      toast(`${specialActive.emoji} ${specialActive.label} ${specialActive.sub}`);
    }else{
      specialActive=null;
    }
  }

  function genClassic(colors){
    const cPool=colors.length>=2?colors:COLORS.slice(0,5);
    const word=cPool[Math.floor(Math.random()*cPool.length)];
    let ink=word;while(ink.name===word.name)ink=cPool[Math.floor(Math.random()*cPool.length)];
    const choices=initChoices(colors,ink.name,4);
    return{html:`<div class="sx-stimulus"><div class="sx-word" style="color:${ink.hex}">${word.name}</div></div>`,
      answer:ink.name,choices,question:`'${word.name}' likha hai par INK ka rang <strong>${ink.name}</strong> hai — INK ka rang tap karo!`};
  }

  function genShape(colors){
    const color=colors[Math.floor(Math.random()*colors.length)];
    const disp=SHAPES[Math.floor(Math.random()*SHAPES.length)];
    let word=disp;while(word.name===disp.name)word=SHAPES[Math.floor(Math.random()*SHAPES.length)];
    const choices=shuffle([...SHAPES]);
    return{html:`<div class="sx-stimulus"><div class="sx-shape" style="color:${color.hex}">${disp.sym}</div></div>
      <div style="text-align:center;font-size:14px;color:var(--text2);font-weight:600;">Lekin likha hai: <strong>"${word.name}"</strong> — IGNORE karo!</div>`,
      answer:disp.name,choices,question:'Jo SHAPE dikh rahi hai, usse tap karo!'};
  }

  function genNumber(colors){
    const digits=[2,3,4,5][Math.floor(Math.random()*4)];
    const digitChar=String(Math.floor(Math.random()*9)+1);
    const numStr=Array(digits).fill(digitChar).join('');
    const color=colors[Math.floor(Math.random()*colors.length)];
    const askCount=Math.random()>0.5;
    if(askCount){
      const ans=String(digits)+' digits';
      const fake=[digits-1,digits+1,digits+2].filter(n=>n>=1&&n<=6).map(n=>String(n)+' digits');
      let raw=[ans,String(numStr),...fake].sort(()=>Math.random()-.5).slice(0,4);
      if(!raw.includes(ans))raw[0]=ans;
      return{html:`<div class="sx-stimulus"><div class="sx-number" style="color:${color.hex}">${numStr}</div></div>
        <div style="text-align:center;font-size:13px;color:var(--text2);font-weight:600;">Number VALUE ${numStr} hai — par DIGIT COUNT kya hai?</div>`,
        answer:ans,choices:raw.map(v=>({name:v})),question:'Digits count kya hai?'};
    }else{
      const alt=[String(Number(numStr)*2),String(Number(numStr)+1),String(Number(numStr)-1)];
      let raw=[numStr,...alt].sort(()=>Math.random()-.5).slice(0,4);
      if(!raw.includes(numStr))raw[0]=numStr;
      return{html:`<div class="sx-stimulus"><div class="sx-number" style="color:${color.hex}">${numStr}</div></div>
        <div style="text-align:center;font-size:13px;color:var(--text2);font-weight:600;">Digits: ${digits} · VALUE kya hai?</div>`,
        answer:numStr,choices:raw.map(v=>({name:v})),question:'Number ka VALUE kya hai?'};
    }
  }

  function genPosition(colors){
    const isUp=Math.random()>0.5;
    const wordText=isUp?'UP':'DOWN';
    const posText=isUp?'DOWN':'UP';
    const color=colors[Math.floor(Math.random()*colors.length)];
    return{html:`<div class="sx-stimulus" style="flex-direction:column;min-height:120px;position:relative;">
        <div class="sx-pos-word ${isUp?'sx-top':'sx-bottom'}" style="color:${color.hex};border-color:${color.hex};">${wordText}</div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--text2);font-weight:600;">Word "${wordText}" likha hai — par POSITION kya hai?</div>`,
      answer:posText,choices:[{name:'Up',sym:'↑'},{name:'Down',sym:'↓'}],question:'Word upar hai ya neeche?'};
  }

  function genArrow(colors){
    const dir=DIRECTIONS[Math.floor(Math.random()*DIRECTIONS.length)];
    let wrongDir=dir;while(wrongDir.name===dir.name)wrongDir=DIRECTIONS[Math.floor(Math.random()*DIRECTIONS.length)];
    const color=colors[Math.floor(Math.random()*colors.length)];
    return{html:`<div class="sx-stimulus"><div class="sx-arrow" style="color:${color.hex}">${dir.sym}</div></div>
      <div style="text-align:center;font-size:14px;color:var(--text2);font-weight:600;">Likha hai: <strong>"${wrongDir.name}"</strong> — Arrow KIDHAR hai?</div>`,
      answer:dir.name,choices:DIRECTIONS,question:'Arrow direction kya hai?'};
  }

  function genDual(colors){
    const n=Math.min(colors.length,5);
    const pool=colors.slice(0,n);
    const same=Math.random()>0.5;
    let word1,word2,c1,c2;
    word1=pool[Math.floor(Math.random()*pool.length)];
    word2=word1;while(word2.name===word1.name)word2=pool[Math.floor(Math.random()*pool.length)];
    if(same){
      c1=pool[Math.floor(Math.random()*pool.length)];
      c2=c1;
    }else{
      c1=pool[Math.floor(Math.random()*pool.length)];
      c2=c1;while(c2.name===c1.name)c2=pool[Math.floor(Math.random()*pool.length)];
    }
    return{html:`<div class="sx-dual">
        <div class="sx-dual-word" style="background:${c1.hex};color:#fff;">${word1.name}</div>
        <div class="sx-dual-vs">VS</div>
        <div class="sx-dual-word" style="background:${c2.hex};color:#fff;">${word2.name}</div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--text2);font-weight:600;margin-top:10px;">Dono ka INK color SAME hai ya DIFFERENT?</div>`,
      answer:same?'SAME ✓':'DIFFERENT ✗',choices:[{name:'SAME ✓'},{name:'DIFFERENT ✗'}],question:'Dono ka ink compare karo!'};
  }

  function genReverse(colors){
    const cPool=colors.length>=2?colors:COLORS.slice(0,5);
    const word=cPool[Math.floor(Math.random()*cPool.length)];
    let ink=word;while(ink.name===word.name)ink=cPool[Math.floor(Math.random()*cPool.length)];
    const choices=initChoices(cPool,word.name,4);
    return{html:`<div class="sx-stimulus"><div class="sx-word" style="color:${ink.hex}">${word.name}</div></div>
      <div style="text-align:center;font-size:13px;color:var(--text2);font-weight:600;">INK ${ink.name} hai — par WORD kya LIKHA hai?</div>`,
      answer:word.name,choices,question:'WORD kya likha hai? (INK ignore karo!)'};
  }

  function initChoices(colors,target,count){
    let c=[...colors];
    const found=c.find(x=>x.name===target);
    if(!found){c[0]={name:target,hex:'#000'};}
    c=shuffle(c);
    const picked=[];
    for(let i=0;i<c.length&&picked.length<count;i++){if(!picked.find(p=>p.name===c[i].name))picked.push(c[i]);}
    if(!picked.find(p=>p.name===target))picked[0]=colors.find(x=>x.name===target)||{name:target,hex:'#000'};
    return shuffle(picked);
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  function livesHtml(){
    if(isZen)return `<div style="font-size:20px;text-align:center;margin-bottom:4px;">🧘 Zen Mode · No pressure</div>`;
    const l=Math.min(lives,3);
    return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=l?'lost':''} ${(l===1&&i===0)?'mm-last':''}">${i>=l?'💔':'❤️'}</span>`).join('')}</div>`;
  }

  function loseLifeCB(){
    if(isZen||(specialActive&&specialActive.noLife))return false;
    lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    if(lives<=0){_st(gameOver,900);return true;}
    return false;
  }

  function nextRound(){
    if(lives<=0)return;
    checkSpecial();
    const variantId=pickVariant();
    const vdef=VARIANT_DEFS[variantId];
    const colors=getColors();
    const timerMs=getTimer();
    const mult=getScoreMult();
    let qData;
    switch(variantId){
      case'classic':qData=genClassic(colors);break;
      case'shape':qData=genShape(colors);break;
      case'number':qData=genNumber(colors);break;
      case'position':qData=genPosition(colors);break;
      case'arrow':qData=genArrow(colors);break;
      case'dual':qData=genDual(colors);break;
      case'reverse':qData=genReverse(colors);break;
    }
    const ts=Date.now();
    let barT=null;
    const optCount=Math.min(qData.choices.length,4);
    const optGrid=optCount<=2?'sx-opts-2':optCount===3?'sx-opts-3':'sx-opts-4';
    const specialHtml=specialActive?`<div class="sx-special-badge" style="background:linear-gradient(135deg,#7C3AED,#F97316);">${specialActive.emoji} ${specialActive.label}</div>`:'';
    const comboHtml=combo>=3?`<span style="color:#F59E0B;font-weight:800;">🔥 ${combo}x</span>`:'';
    host.innerHTML=`
      ${round>0?`<hr style="border:none;height:2px;background:var(--grad);opacity:.2;margin-bottom:10px;border-radius:2px;">`:''}
      ${timerMs>0?`<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>`:''}
      ${livesHtml()}
      ${specialHtml}
      <div class="sx-info">
        <span class="sx-round-tag">${vdef.emoji} ${vdef.label} · <strong>R${round+1}</strong></span>
        <span>${comboHtml}</span>
        <span style="color:var(--primary);font-weight:700;">+${Math.round(1*mult)}pts</span>
      </div>
      <div class="sx-question">${qData.question}</div>
      ${qData.html}
      <div class="sx-opts ${optGrid}" id="sxOpts">
        ${qData.choices.slice(0,optCount).map((c,i)=>{
          const isColor=COLORS.find(cl=>cl.name===c.name);
          const style=isColor?`style="background:${isColor.hex};color:#fff;border:none;text-shadow:0 2px 8px rgba(0,0,0,.3);box-shadow:0 4px 14px ${isColor.hex}55;"`:'';
          return `<button class="sx-opt" data-i="${i}" data-name="${c.name||c}" ${style}>${c.sym?c.sym+' ':''}${c.name||c}</button>`;
        }).join('')}
      </div>
    `;
    if(timerMs>0){
      let elapsed=0;
      barT=_si(()=>{
        elapsed+=100;
        const pct=Math.max(0,100-elapsed/timerMs*100);
        const bar=wrap.querySelector('#sBar');
        if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
        if(elapsed>=timerMs){_cti(barT);
          playSound('wrong');combo=0;
          host.innerHTML+=`<div class="sx-last-hint">⏱ Time! Answer: ${qData.answer}</div>`;
          const dead=loseLifeCB();round++;
          _st(nextRound,900);
        }
      },100);
    }
    host.querySelectorAll('.sx-opt').forEach(b=>{
      b.onclick=()=>{
        if(b.disabled)return;
        if(barT)_cti(barT);
        host.querySelectorAll('.sx-opt').forEach(x=>x.disabled=true);
        const ms=Date.now()-ts;
        if(b.dataset.name===qData.answer||b.dataset.name===undefined&&qData.answer===b.textContent.trim()){
          playSound('correct');
          b.classList.add('sx-correct');
          const fastBonus=ms<timerMs*0.3?1.5:ms<timerMs*0.6?1.25:1;
          const pts=Math.max(1,Math.round(2*mult*fastBonus));
          combo++;if(combo>maxCombo)maxCombo=combo;score+=pts;setScore(score);
          const popup=$(`<div class="sx-pts-popup" style="color:#22C55E;">+${pts}${combo>=3?' 🔥':''}${fastBonus>1?' ⚡':''}</div>`);
          document.body.appendChild(popup);
          _st(()=>popup.remove(),900);
          if(combo===3)showCombo('🔥 STREAK x3!');
          else if(combo===6)showCombo('⚡ ON FIRE x6!');
        }else{
          playSound('wrong');
          b.classList.add('sx-wrong');
          host.querySelectorAll('.sx-opt').forEach(x=>{if(x.dataset.name===qData.answer||(x.dataset.name===undefined&&qData.answer===x.textContent.trim()))x.classList.add('sx-correct');});
          host.innerHTML+=`<div class="sx-last-hint" style="color:#EF4444;">❌ Answer: ${qData.answer}</div>`;
          combo=0;
          const dead=loseLifeCB();if(dead)return;
        }
        round++;_st(nextRound,600);
      };
    });
  }

  function gameOver(){
    const newPB=score>record;
    if(newPB)setS('nz_stroop_best',score);
    setS('nz_stroop_games',(S('nz_stroop_games')||0)+1);
    if(newPB)confetti(50);
    end({title:newPB?'New Best! 🏆':'Out of Lives! 🎨',emoji:'🎨',sub:`Score: ${score} pts · ${round} rounds · ${MODE_DEFS[mode].emoji} ${MODE_DEFS[mode].label}`,value:score,points:Math.max(2,score*1.3),starThresh:[40,80,130],
      statsHtml:`<div class="end-stats"><div class="row"><span>Score</span><span class="val">${score}</span></div><div class="row"><span>Rounds Survived</span><span class="val">${round}</span></div><div class="row"><span>Max Combo</span><span class="val">${maxCombo}</span></div><div class="row"><span>Mode</span><span class="val">${MODE_DEFS[mode].emoji} ${MODE_DEFS[mode].label}</span></div><div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div></div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`});
  }
}
