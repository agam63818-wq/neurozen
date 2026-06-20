/* ===================== STROOP X v2 — redesigned ===================== */
function playStroopX(body,setScore,end,wrap,startClock){
  /* ---------------------------------------------------------------- */
  /*  CONSTANTS                                                       */
  /* ---------------------------------------------------------------- */
  const COLORS=[
    {name:'Red',hex:'#EF4444'},{name:'Blue',hex:'#3B82F6'},{name:'Green',hex:'#22C55E'},
    {name:'Yellow',hex:'#EAB308'},{name:'Purple',hex:'#A855F7'},{name:'Orange',hex:'#F97316'},
    {name:'Cyan',hex:'#06B6D4'},{name:'Pink',hex:'#EC4899'}
  ];
  const COLOR_NAMES=new Map(COLORS.map(c=>[c.name,c]));
  const SHAPES=[
    {name:'Circle',sym:'●'},{name:'Square',sym:'■'},
    {name:'Triangle',sym:'▲'},{name:'Star',sym:'★'}
  ];
  const SHAPE_NAMES=new Map(SHAPES.map(s=>[s.name,s]));
  const DIRECTIONS=[
    {name:'Up',sym:'↑'},{name:'Down',sym:'↓'},
    {name:'Left',sym:'←'},{name:'Right',sym:'→'}
  ];
  const DIR_NAMES=new Map(DIRECTIONS.map(d=>[d.name,d]));

  const VARIANT_DEFS={
    wordink:{id:'wordink',emoji:'🎨',label:'Word·Ink',color:'#7C3AED',desc:'Word ka color alag, INK ka rang tap'},
    shape:{id:'shape',emoji:'🔷',label:'Shape',color:'#4F8EF7',desc:'Shape dekho, word ignore karo'},
    number:{id:'number',emoji:'🔢',label:'Number',color:'#F97316',desc:'Digit count ya value? Focus!'},
    position:{id:'position',emoji:'⬆',label:'Position',color:'#34D399',desc:'Word upar ya neeche?'},
    arrow:{id:'arrow',emoji:'➡',label:'Arrow',color:'#F472B6',desc:'Arrow kidhar ja raha hai?'},
    dual:{id:'dual',emoji:'🔥',label:'Dual',color:'#EF4444',desc:'Dono INK same ya different?'},
    reverse:{id:'reverse',emoji:'🔄',label:'Reverse',color:'#22C55E',desc:'Word kya likha hai (INK ignore)'}
  };

  const MODE_DEFS={
    classic:{label:'Classic',emoji:'🎨',sub:'7 variants · 3 lives · balanced',lives:3,baseTime:3000,scoreMult:1,minTime:1200,timeDecay:60,colorsStart:5,colorsIncEvery:8,checkpoints:null,waveLen:null},
    speed:{label:'Speed',emoji:'⚡',sub:'2s timer · 1.5x · combo focus',lives:3,baseTime:2000,scoreMult:1.5,minTime:800,timeDecay:40,colorsStart:5,colorsIncEvery:6,checkpoints:null,waveLen:null},
    marathon:{label:'Marathon',emoji:'🏃',sub:'5 lives · endurance waves · rewards',lives:5,baseTime:3500,scoreMult:1.2,minTime:1000,timeDecay:50,colorsStart:5,colorsIncEvery:10,checkpoints:[5,15,30,50],waveLen:8},
    zen:{label:'Zen',emoji:'🧘',sub:'No timer · unlimited · learn',lives:99,baseTime:0,scoreMult:0.5,minTime:0,timeDecay:0,colorsStart:8,colorsIncEvery:99,checkpoints:null,waveLen:null}
  };

  const VARIANTS_EASY=['wordink','shape','reverse'];
  const VARIANTS_MED=['number','position','arrow'];
  const VARIANTS_HARD=['dual'];

  const SPECIAL_EVENTS=[
    {id:'speed',emoji:'⚡',label:'SPEED!',sub:'2x points · 1.5s timer',mult:2,timer:1500,minRound:10},
    {id:'immunity',emoji:'🛡️',label:'IMMUNITY!',sub:'Next wrong = no life lost',noLife:true,minRound:5},
    {id:'double',emoji:'🎯',label:'DOUBLE!',sub:'3x points this round',mult:3,timer:0,minRound:15},
    {id:'lightning',emoji:'🌩️',label:'LIGHTNING!',sub:'1s timer · 4x points',mult:4,timer:1000,minRound:20},
    {id:'rainbow',emoji:'🌈',label:'RAINBOW!',sub:'All 8 colors · 2x points',mult:2,allColors:true,minRound:8}
  ];

  const record=S('nz_stroop_best')||0;

  /* ---------------------------------------------------------------- */
  /*  CENTRAL STATE                                                   */
  /* ---------------------------------------------------------------- */
  const G={
    mode:'classic',round:0,score:0,lives:3,maxLives:3,combo:0,maxCombo:0,
    streak:0,difficulty:0,phase:0,specialActive:null,isZen:false,
    wave:1,roundsInWave:0,barT:null,_ts:0,_pending:false,
    prevAnswer:null,prevVariant:null,
    // per-round snapshot
    timerMs:0,mult:1,qData:null,startMs:0
  };

  let host=null;
  let _sxHideTs=0,_sxOff=0;
  const _sxVH=()=>{
    if(document.hidden)_sxHideTs=Date.now();
    else if(_sxHideTs){_sxOff+=Date.now()-_sxHideTs;_sxHideTs=0;}
  };
  document.addEventListener('visibilitychange',_sxVH);
  wrap.addEventListener('remove_game',()=>{document.removeEventListener('visibilitychange',_sxVH);});

  /* ---------------------------------------------------------------- */
  /*  FRESHNESS ENGINE                                                */
  /* ---------------------------------------------------------------- */
  const Fresh={
    variants:[],
    answers:[],
    signatures:[],
    maxV:3,maxA:6,maxSig:10,
    _sig(qData,variantId){
      // Unique signature: answer + variant + first-choice hash
      return `${variantId}::${qData.answer}::${(qData.choices||[]).slice(0,2).map(c=>c.name||c).join(',')}`;
    },
    used(variantId,qData){
      const sig=this._sig(qData,variantId);
      return this.signatures.includes(sig);
    },
    record(variantId,qData){
      this.variants.push(variantId);
      if(this.variants.length>this.maxV)this.variants.shift();
      this.answers.push(qData.answer);
      if(this.answers.length>this.maxA)this.answers.shift();
      const sig=this._sig(qData,variantId);
      this.signatures.push(sig);
      if(this.signatures.length>this.maxSig)this.signatures.shift();
    },
    pickVariant(allowed){
      // Score each variant: penalty for recent use
      const scored=allowed.map(v=>{
        const recency=this.variants.filter(x=>x===v).length;
        return {id:v,weight:1/(1+recency*3)};
      });
      const total=scored.reduce((s,x)=>s+x.weight,0);
      let r=Math.random()*total;
      for(const x of scored){
        r-=x.weight;
        if(r<=0)return x.id;
      }
      return scored[scored.length-1].id;
    }
  };

  /* ---------------------------------------------------------------- */
  /*  VARIANT GENERATORS                                              */
  /* ---------------------------------------------------------------- */
  const Gen={
    /* —— Existing variants (improved) —— */
    wordink(colors){
      const pool=colors.length>=2?colors:COLORS.slice(0,5);
      const cPool=this._pickColor(pool,pool);
      const word=pool[Math.floor(Math.random()*pool.length)];
      // Ensure ink≠word name, and answer position varies
      const eligible=pool.filter(c=>c.name!==word.name);
      const ink=eligible.length?eligible[Math.floor(Math.random()*eligible.length)]:pool[(pool.indexOf(word)+1)%pool.length];
      const choices=this._choices(pool,ink.name,4);
      const shapes=['▲','●','■','★'];
      const deco=shapes[Math.floor(Math.random()*shapes.length)];
      return{
        html:`<div class="sx-stim"><div class="sx-word" style="color:${ink.hex}">${word.name}</div><div class="sx-deco">${deco}</div></div>`,
        answer:ink.name,choices,
        question:`'${word.name}' likha hai — INK ka rang <strong>${ink.name}</strong> hai. INK tap karo!`
      };
    },
    shape(colors){
      const color=colors[Math.floor(Math.random()*colors.length)];
      const disp=SHAPES[Math.floor(Math.random()*SHAPES.length)];
      const others=SHAPES.filter(s=>s.name!==disp.name);
      const word=others[Math.floor(Math.random()*others.length)];
      const choices=shuffle([...SHAPES]);
      return{
        html:`<div class="sx-stim"><div class="sx-shape" style="color:${color.hex}">${disp.sym}</div></div>
          <div class="sx-shape-word">Likha hai: <strong>"${word.name}"</strong> — ignore karo</div>`,
        answer:disp.name,choices,
        question:'Jo SHAPE dikh rahi hai, usse tap karo!'
      };
    },
    number(colors){
      const digits=[2,3,4,5][Math.floor(Math.random()*4)];
      const digitChar=String(Math.floor(Math.random()*9)+1);
      const numStr=Array(digits).fill(digitChar).join('');
      const color=colors[Math.floor(Math.random()*colors.length)];
      // Alternate between "count digits" and "what value"
      const askCount=Math.random()>0.5;
      if(askCount){
        const ans=String(digits)+' digits';
        const dist=Gen._distractors(digits-1,digits+1,digits+2).filter(n=>n>=1&&n<=6).map(n=>String(n)+' digits');
        const raw=shuffle([ans,String(numStr),...dist]).slice(0,4);
        if(!raw.includes(ans))raw[0]=ans;
        return{
          html:`<div class="sx-stim"><div class="sx-number" style="color:${color.hex}">${numStr}</div></div>`,
          answer:ans,choices:raw.map(v=>({name:v})),
          question:`Value ${numStr} hai — DIGIT COUNT kya hai?`
        };
      }
      const alt=[String(Number(numStr)*2),String(Number(numStr)+1),String(Number(numStr)-1)];
      const raw=shuffle([numStr,...alt]).slice(0,4);
      if(!raw.includes(numStr))raw[0]=numStr;
      return{
        html:`<div class="sx-stim"><div class="sx-number" style="color:${color.hex}">${numStr}</div></div>
          <div class="sx-shape-word">Digits: ${digits}</div>`,
        answer:numStr,choices:raw.map(v=>({name:v})),
        question:'Number ka VALUE kya hai?'
      };
    },
    position(colors){
      const isUp=Math.random()>0.5;
      const wordText=isUp?'UP':'DOWN';
      const posText=isUp?'DOWN':'UP';
      const color=colors[Math.floor(Math.random()*colors.length)];
      return{
        html:`<div class="sx-stimulus" style="flex-direction:column;min-height:120px;position:relative;">
          <div class="sx-pos-word ${isUp?'sx-top':'sx-bottom'}" style="background:${color.hex};color:#fff;border-color:${color.hex};">${wordText}</div>
        </div>`,
        answer:posText,choices:[{name:'Up',sym:'↑'},{name:'Down',sym:'↓'}],
        question:`"${wordText}" likha hai — POSITION kya hai?`
      };
    },
    arrow(colors){
      const dir=DIRECTIONS[Math.floor(Math.random()*DIRECTIONS.length)];
      const others=DIRECTIONS.filter(d=>d.name!==dir.name);
      const wrongDir=others[Math.floor(Math.random()*others.length)];
      const color=colors[Math.floor(Math.random()*colors.length)];
      return{
        html:`<div class="sx-stim"><div class="sx-arrow" style="color:${color.hex}">${dir.sym}</div></div>
          <div class="sx-shape-word">Likha hai: <strong>"${wrongDir.name}"</strong></div>`,
        answer:dir.name,choices:DIRECTIONS,
        question:'Arrow KIDHAR ja raha hai?'
      };
    },
    dual(colors){
      const n=Math.min(colors.length,5);
      const pool=colors.slice(0,n);
      const same=Math.random()>0.4; // 60% same, 40% different for better balance
      let word1=pool[Math.floor(Math.random()*pool.length)];
      let word2=pool.filter(w=>w.name!==word1.name);
      word2=word2.length?word2[Math.floor(Math.random()*word2.length)]:pool[(pool.indexOf(word1)+1)%pool.length];
      let c1,c2;
      if(same){
        c1=pool[Math.floor(Math.random()*pool.length)];
        c2=c1;
      }else{
        c1=pool[Math.floor(Math.random()*pool.length)];
        c2=pool.filter(c=>c.name!==c1.name);
        c2=c2.length?c2[Math.floor(Math.random()*c2.length)]:pool[(pool.indexOf(c1)+1)%pool.length];
      }
      return{
        html:`<div class="sx-dual">
          <div class="sx-dual-word" style="background:${c1.hex};color:#fff;">${word1.name}</div>
          <div class="sx-dual-vs">VS</div>
          <div class="sx-dual-word" style="background:${c2.hex};color:#fff;">${word2.name}</div>
        </div>`,
        answer:same?'SAME':'DIFFERENT',
        choices:[{name:'SAME'},{name:'DIFFERENT'}],
        question:'Dono ka INK color SAME hai ya DIFFERENT?'
      };
    },
    reverse(colors){
      const pool=colors.length>=2?colors:COLORS.slice(0,5);
      const word=pool[Math.floor(Math.random()*pool.length)];
      const eligible=pool.filter(c=>c.name!==word.name);
      const ink=eligible.length?eligible[Math.floor(Math.random()*eligible.length)]:pool[(pool.indexOf(word)+1)%pool.length];
      const choices=Gen._choices(pool,word.name,4);
      return{
        html:`<div class="sx-stim"><div class="sx-word" style="color:${ink.hex}">${word.name}</div></div>`,
        answer:word.name,choices,
        question:`INK ${ink.name} hai — WORD kya LIKHA hai?`
      };
    },

    /* —— New advanced round types —— */
    seqmem(colors){
      // Show sequence of 2-3 items, then ask if a probe was in the sequence
      const len=2+Math.floor(Math.random()*2); // 2 or 3
      const seq=[];
      for(let i=0;i<len;i++){
        seq.push(colors[Math.floor(Math.random()*colors.length)]);
      }
      const wasInSeq=Math.random()>0.5;
      const probe=wasInSeq?seq[Math.floor(Math.random()*seq.length)]:colors.filter(c=>!seq.some(s=>s.name===c.name));
      const probeColor=wasInSeq?probe:(probe.length?probe[Math.floor(Math.random()*probe.length)]:colors[0]);
      const seqHtml=seq.map(s=>`<span class="sx-seq-chip" style="background:${s.hex}">${s.name.charAt(0)}</span>`).join('');
      return{
        html:`<div class="sx-seq-wrap"><div class="sx-seq-label">Sequence (yaad rakho)</div><div class="sx-seq-row">${seqHtml}</div></div>
          <div class="sx-seq-probe">Probe: <span class="sx-seq-chip" style="background:${probeColor.hex}">${probeColor.name.charAt(0)}</span></div>`,
        answer:wasInSeq?'YES':'NO',
        choices:[{name:'YES'},{name:'NO'}],
        question:'Kya yeh color sequence mein THA?'
      };
    },
    oddball(colors){
      // 3 items, 2 same category 1 different — tap the odd one
      const base=colors[Math.floor(Math.random()*colors.length)];
      let other=base;
      while(other.name===base.name)other=colors[Math.floor(Math.random()*colors.length)];
      const oddIdx=Math.floor(Math.random()*3);
      const items=[];
      for(let i=0;i<3;i++){
        items.push(i===oddIdx?{name:other.name,hex:other.hex,isOdd:true}:{name:base.name,hex:base.hex,isOdd:false});
      }
      const shuffled=shuffle(items);
      return{
        html:`<div class="sx-odd-wrap"><div class="sx-odd-lbl">Odd one out — tap the DIFFERENT one</div>
          <div class="sx-odd-row">
            ${shuffled.map((item,i)=>`<button class="sx-odd-btn" data-odd="${item.isOdd?'1':'0'}" data-idx="${i}" style="background:${item.hex}">${item.name.charAt(0)}</button>`).join('')}
          </div></div>`,
        answer:'ODD',choices:[], // special — handled via data-odd attribute
        question:'Kaunsa color ALAG hai?'
      };
    },
    split(colors){
      // Two halves — compare left vs right
      const n=Math.min(colors.length,6);
      const pool=colors.slice(0,n);
      const c1=pool[Math.floor(Math.random()*pool.length)];
      const c2=pool.filter(c=>c.name!==c1.name);
      const r2=c2.length?c2[Math.floor(Math.random()*c2.length)]:pool[(pool.indexOf(c1)+1)%pool.length];
      const sameInk=Math.random()>0.5;
      const leftInk=sameInk?c1:pool[Math.floor(Math.random()*pool.length)];
      const rightInk=sameInk?leftInk:pool.filter(c=>c.name!==leftInk.name);
      const ri=sameInk?leftInk:(rightInk.length?rightInk[Math.floor(Math.random()*rightInk.length)]:pool[(pool.indexOf(leftInk)+1)%pool.length]);
      return{
        html:`<div class="sx-split">
          <div class="sx-split-half" style="border-color:${c1.hex}">
            <div class="sx-split-label">LEFT</div>
            <div class="sx-split-word" style="background:${leftInk.hex}">${c1.name}</div>
          </div>
          <div class="sx-split-vs">VS</div>
          <div class="sx-split-half" style="border-color:${r2.hex}">
            <div class="sx-split-label">RIGHT</div>
            <div class="sx-split-word" style="background:${ri.hex}">${c2?c2.name:c1.name}</div>
          </div>
        </div>`,
        answer:sameInk?'SAME':'DIFFERENT',
        choices:[{name:'SAME'},{name:'DIFFERENT'}],
        question:'Dono halves ka INK color same hai ya different?'
      };
    },
    compareprev(colors){
      // Compare current stimulus with previous round's answer
      const prev=G.prevAnswer;
      if(!prev){
        // Fallback to normal wordink on first round
        return Gen.wordink(colors);
      }
      const base=colors[Math.floor(Math.random()*colors.length)];
      const isSame=Math.random()>0.5;
      const current=isSame?prev:colors.filter(c=>c.name!==prev);
      const cur=isSame?COLOR_NAMES.get(prev)||colors[0]:(current.length?current[Math.floor(Math.random()*current.length)]:colors[0]);
      return{
        html:`<div class="sx-compare">
          <div class="sx-compare-prev">Previously: <span class="sx-seq-chip" style="background:${COLOR_NAMES.get(prev)?COLOR_NAMES.get(prev).hex:'#7C3AED'}">${prev}</span></div>
          <div class="sx-stim" style="margin-top:12px"><div class="sx-word" style="color:${cur.hex}">${cur.name}</div></div>
        </div>`,
        answer:isSame?'SAME':'DIFFERENT',
        choices:[{name:'SAME'},{name:'DIFFERENT'}],
        question:'Kya yeh wahi color hai jo previous round mein tha?'
      };
    },

    /* —— Helpers —— */
    _pickColor(pool,from){
      // Avoid using the same color multiple times if pool is large enough
      if(G.prevAnswer&&pool.length>2){
        const filtered=pool.filter(c=>c.name!==G.prevAnswer);
        if(filtered.length)return filtered[Math.floor(Math.random()*filtered.length)];
      }
      return pool[Math.floor(Math.random()*pool.length)];
    },
    _choices(colors,target,count){
      let c=[...colors];
      const found=c.find(x=>x.name===target);
      if(!found)c[0]={name:target,hex:'#000'};
      c=shuffle(c);
      const picked=[];
      for(let i=0;i<c.length&&picked.length<count;i++){
        if(!picked.find(p=>p.name===c[i].name))picked.push(c[i]);
      }
      if(!picked.find(p=>p.name===target)){
        picked[0]=colors.find(x=>x.name===target)||{name:target,hex:'#000'};
      }
      return shuffle(picked);
    },
    _distractors(...vals){
      const set=new Set(vals);
      return [...set];
    }
  };
  const ALL_VARIANTS=Object.keys(VARIANT_DEFS);
  const NEW_VARIANTS=['seqmem','oddball','split','compareprev'];

  /* ---------------------------------------------------------------- */
  /*  ADAPTIVE DIFFICULTY                                             */
  /* ---------------------------------------------------------------- */
  function getPhase(){
    if(G.round<5)return 0;
    if(G.round<15)return 1;
    if(G.round<30)return 2;
    return 3;
  }

  function getColors(){
    const def=MODE_DEFS[G.mode];
    const n=Math.min(8,def.colorsStart+Math.floor(G.round/def.colorsIncEvery));
    return COLORS.slice(0,n);
  }

  function getTimer(){
    if(G.isZen)return 0;
    const def=MODE_DEFS[G.mode];
    let t=def.baseTime-G.round*def.timeDecay;
    // Marathon: waves adjust timer
    if(G.mode==='marathon'&&G.wave>1)t=Math.max(def.minTime,t-G.wave*80);
    if(G.specialActive&&G.specialActive.timer)return Math.min(t,G.specialActive.timer);
    return Math.max(def.minTime,t);
  }

  function getScoreMult(){
    let m=MODE_DEFS[G.mode].scoreMult;
    // Combo bonus
    if(G.combo>=5)m*=1.5;
    else if(G.combo>=3)m*=1.25;
    else if(G.combo>=8)m*=2;
    if(G.specialActive&&G.specialActive.mult)m*=G.specialActive.mult;
    return m;
  }

  function getAvailableVariants(){
    const phase=getPhase();
    let pool=[...VARIANTS_EASY];
    if(phase>=1)pool=pool.concat(VARIANTS_MED);
    if(phase>=2)pool=pool.concat(VARIANTS_HARD);
    // Add new variants from phase 1+
    if(phase>=1)pool.push('seqmem','oddball');
    if(phase>=2)pool.push('split','compareprev');
    // Special event: rainbow uses all except dual
    if(G.specialActive&&G.specialActive.allColors)return ALL_VARIANTS.filter(v=>v!=='dual');
    return pool;
  }

  function checkSpecial(){
    if(G.mode==='zen'){G.specialActive=null;return;}
    // Marathon: special events more frequent (every 7 rounds)
    const interval=G.mode==='marathon'?7:10;
    if(G.round>0&&G.round%interval===0){
      const eligible=SPECIAL_EVENTS.filter(e=>G.round>=e.minRound);
      if(eligible.length){
        G.specialActive=eligible[Math.floor(Math.random()*eligible.length)];
        toast(`${G.specialActive.emoji} ${G.specialActive.label} — ${G.specialActive.sub}`);
        return;
      }
    }
    G.specialActive=null;
  }

  function updateWave(){
    if(G.mode!=='marathon')return;
    const wl=MODE_DEFS.marathon.waveLen;
    G.roundsInWave++;
    if(G.roundsInWave>=wl){
      G.wave++;
      G.roundsInWave=0;
      toast(`🌊 Wave ${G.wave} begins! +1 life bonus`);
      // Wave checkpoint: bonus life (up to max)
      if(G.lives<G.maxLives)G.lives++;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  RENDERERS                                                       */
  /* ---------------------------------------------------------------- */
  function renderStart(){
    body.innerHTML='';
    const best=S('nz_stroop_best')||0;
    const games=S('nz_stroop_games')||0;
    const screen=$(`
      <div class="sx-start">
        <div class="sx-hero">
          <div class="sx-hero-em">🎨</div>
          <h2>Color Stroop Xtreme</h2>
          <p class="sx-hero-sub">${Object.keys(VARIANT_DEFS).length + NEW_VARIANTS.length} variants · Endless · Har round naya challenge!</p>
          ${best?`<div class="sx-best-chip">🏆 Best: ${best} pts</div>`:''}
        </div>
        <div class="sx-sel-title">Mode chunein</div>
        <div class="sx-modes" id="sxModes"></div>
        <div class="sx-rules-card" id="sxRules">
          <div class="sx-rules-title">📖 How to Play</div>
          <div class="sx-rules-text" id="sxRulesText">Har round mein ek stimulus dikhega. Uske hisaab se sahi option tap karo. Har galat jawab par ek life jaati hai. Combo banake extra points kamao!</div>
        </div>
        <button class="sx-start-btn" id="sxGo">Start Game ▶</button>
      </div>
    `);
    body.appendChild(screen);
    const modesEl=screen.querySelector('#sxModes');
    Object.keys(MODE_DEFS).forEach(k=>{
      const m=MODE_DEFS[k];
      const card=$(`
        <button class="sx-mode-card ${k===G.mode?'sel':''}" data-m="${k}">
          <div class="sx-mode-em">${m.emoji}</div>
          <div class="sx-mode-info">
            <div class="sx-mode-name">${m.label}</div>
            <div class="sx-mode-sub">${m.sub}</div>
          </div>
          <div class="sx-mode-check">${k===G.mode?'✓':''}</div>
        </button>
      `);
      card.onclick=()=>{
        playSound('tap');
        G.mode=k;
        modesEl.querySelectorAll('.sx-mode-card').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));
        modesEl.querySelectorAll('.sx-mode-check').forEach(c=>c.textContent=c.closest('.sx-mode-card')?.dataset.m===k?'✓':'');
        // Update rules text per mode
        const rules={
          classic:'Classic Stroop training. 3 lives, gradual difficulty. Sabhi variants explore karo.',
          speed:'Fast timer (2s), high combo multiplier. Reflexes test karo! 3 lives.',
          marathon:'Endurance mode. 5 lives, wave-based difficulty, checkpoint rewards. Har 8 rounds = naya wave.',
          zen:'No timer, no lives. Practice karo, seekho, relax karo. Har question ke baad explanation.'
        };
        screen.querySelector('#sxRulesText').textContent=rules[k]||rules.classic;
      };
      modesEl.appendChild(card);
    });
    screen.querySelector('#sxGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const def=MODE_DEFS[G.mode];
    G.round=0;G.score=0;G.lives=def.lives;G.maxLives=def.lives;
    G.combo=0;G.maxCombo=0;G.streak=0;G.specialActive=null;
    G.isZen=G.mode==='zen';
    G.difficulty=0;G.phase=0;
    G.wave=1;G.roundsInWave=0;
    G.prevAnswer=null;G.prevVariant=null;
    Fresh.variants=[];Fresh.answers=[];Fresh.signatures=[];
    body.innerHTML='';
    host=$(`<div class="sx-host" id="sxHost"></div>`);
    body.appendChild(host);
    nextRound();
  }

  function nextRound(){
    if(G.lives<=0||G._pending)return;
    G._pending=false;
    checkSpecial();
    updateWave();
    const colors=getColors();
    const variantId=Fresh.pickVariant(getAvailableVariants());
    const vdef=VARIANT_DEFS[variantId]||{emoji:'🧩',label:variantId,color:'#7C3AED'};
    G.timerMs=getTimer();
    G.mult=getScoreMult();
    let qData=null;
    // Route to generator
    if(Gen[variantId])qData=Gen[variantId](colors);
    else qData=Gen.wordink(colors);
    // Fallback if signature is too recent
    if(Fresh.used(variantId,qData)&&getAvailableVariants().length>1){
      const alt=Fresh.pickVariant(getAvailableVariants().filter(v=>v!==variantId));
      if(Gen[alt])qData=Gen[alt](colors);
      G.timerMs=getTimer();
      G.mult=getScoreMult();
    }
    Fresh.record(variantId,qData);
    G.qData=qData;
    G.prevVariant=variantId;
    G.startMs=Date.now();
    renderRound(variantId,vdef,colors,qData);
  }

  function renderRound(variantId,vdef,colors,qData){
    G._ts=Date.now();
    const optCount=Math.min(qData.choices.length,4);
    const optGrid=optCount<=2?'sx-opts-2':optCount===3?'sx-opts-3':'sx-opts-4';
    const isSpecial=!!G.specialActive;
    const specialHtml=isSpecial?`<div class="sx-special-badge" style="background:linear-gradient(135deg,#7C3AED,#F97316);">${G.specialActive.emoji} ${G.specialActive.label}</div>`:'';
    const comboHtml=G.combo>=3?`<span class="sx-combo-badge">🔥 ${G.combo}x combo</span>`:'';
    const waveHtml=G.mode==='marathon'?`<span class="sx-wave-badge">🌊 Wave ${G.wave}</span>`:'';
    // Marathon: show 5 lives (not capped at 3)
    const heartsHtml=renderHearts();
    host.innerHTML=`
      ${G.timerMs>0?`<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>`:''}
      <div class="sx-hud">
        <div class="sx-hud-left">
          ${variantId==='oddball'?'':`<span class="sx-variant-chip" style="background:${vdef.color}">${vdef.emoji} ${vdef.label}</span>`}
          ${waveHtml}
        </div>
        <div class="sx-hud-right">
          ${comboHtml}
          <span class="sx-round-num">R${G.round+1}</span>
        </div>
      </div>
      ${heartsHtml}
      ${specialHtml}
      ${G.mode==='marathon'?`<div class="sx-wave-progress"><div class="sx-wp-label">Wave ${G.wave} · Round ${G.roundsInWave+1}/${MODE_DEFS.marathon.waveLen}</div></div>`:''}
      <div class="sx-question">${qData.question}</div>
      ${qData.html}
      ${qData.choices.length>0?`
        <div class="sx-opts ${optGrid}" id="sxOpts">
          ${qData.choices.slice(0,optCount).map((c,i)=>{
            const isColor=COLORS.find(cl=>cl.name===c.name||cl.name===c);
            const cName=c.name||c;
            const style=isColor?`style="background:${isColor.hex};color:#fff;border:none;text-shadow:0 2px 8px rgba(0,0,0,.3);box-shadow:0 4px 14px ${isColor.hex}55;"`:'';
            return `<button class="sx-opt" data-name="${cName}" ${style}>${c.sym?c.sym+' ':''}${cName}</button>`;
          }).join('')}
        </div>
      `:''}
      <div class="sx-score-line">Score: <strong>${G.score}</strong> · ${G.mult>1?'×'+G.mult.toFixed(1)+' pts':''}</div>
    `;
    // Timer interval
    if(G.timerMs>0){
      const _roundStart=Date.now(),_roundOff=_sxOff;
      if(G.barT){_cti(G.barT);G.barT=null;}
      G.barT=_si(()=>{
        const elapsed=Date.now()-_roundStart-(_sxOff-_roundOff);
        const pct=Math.max(0,100-elapsed/G.timerMs*100);
        const bar=wrap.querySelector('#sBar');
        if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
        if(elapsed>=G.timerMs){
          _cti(G.barT);G.barT=null;
          onTimeout(qData);
        }
      },100);
    }
    // Bind answer buttons
    if(variantId==='oddball'){
      host.querySelectorAll('.sx-odd-btn').forEach(b=>{
        b.onclick=()=>{
          if(b.disabled)return;
          if(G.barT){_cti(G.barT);G.barT=null;}
          host.querySelectorAll('.sx-odd-btn').forEach(x=>x.disabled=true);
          const isOdd=b.dataset.odd==='1';
          if(isOdd){
            onCorrect(qData,Date.now()-G.startMs);
          }else{
            onWrong(qData);
          }
        };
      });
    }else{
      host.querySelectorAll('.sx-opt').forEach(b=>{
        b.onclick=()=>{
          if(b.disabled)return;
          if(G.barT){_cti(G.barT);G.barT=null;}
          host.querySelectorAll('.sx-opt').forEach(x=>x.disabled=true);
          const val=b.dataset.name===qData.answer||(b.dataset.name===undefined&&qData.answer===b.textContent.trim());
          if(val){
            onCorrect(qData,Date.now()-G.startMs);
          }else{
            onWrong(qData);
          }
        };
      });
    }
  }

  function renderHearts(){
    if(G.isZen)return `<div class="sx-zen-badge">🧘 Zen — no pressure</div>`;
    const n=G.maxLives>3?G.maxLives:3;
    const show=G.mode==='marathon'?G.maxLives:Math.min(G.maxLives,3);
    if(G.mode==='marathon'){
      return `<div class="sx-hearts-row">${Array.from({length:show},(_,i)=>`<span class="wx-heart ${i>=G.lives?'lost':''}">${i>=G.lives?'💔':'❤️'}</span>`).join('')}<span class="sx-lives-count">${G.lives}/${G.maxLives}</span></div>`;
    }
    return `<div class="wc-hearts">${Array.from({length:show},(_,i)=>`<span class="wc-heart ${i>=G.lives?'lost':''} ${(G.lives===1&&i===0)?'mm-last':''}">${i>=G.lives?'💔':'❤️'}</span>`).join('')}</div>`;
  }

  /* ---------------------------------------------------------------- */
  /*  GAME ACTIONS                                                    */
  /* ---------------------------------------------------------------- */
  function onCorrect(qData,ms){
    playSound('correct');
    const timerMs=G.timerMs||3000;
    const fastBonus=ms<timerMs*0.3?1.5:ms<timerMs*0.6?1.25:1;
    const pts=Math.max(1,Math.round(2*G.mult*fastBonus));
    G.combo++;if(G.combo>G.maxCombo)G.maxCombo=G.combo;
    G.streak++;
    G.score+=pts;setScore(G.score);
    G.prevAnswer=qData.answer;
    // Popup feedback
    const popup=$(`<div class="sx-pts-popup" style="color:#22C55E;">+${pts}${fastBonus>1?' ⚡':''}</div>`);
    document.body.appendChild(popup);
    _st(()=>popup.remove(),900);
    // Combo callouts
    if(G.combo===3)showCombo('🔥 STREAK x3!');
    else if(G.combo===5)showCombo('⚡ ON FIRE x5!');
    else if(G.combo===8)showCombo('🌟 UNSTOPPABLE x8!');
    else if(G.combo===12)showCombo('💥 GODLIKE x12!');
    G.round++;
    _st(nextRound,500);
  }

  function onWrong(qData){
    playSound('wrong');
    G.combo=0;G.streak=0;
    G.prevAnswer=null;
    host.querySelectorAll('.sx-opt').forEach(x=>{
      if(x.dataset.name===qData.answer||(x.dataset.name===undefined&&qData.answer===x.textContent.trim()))x.classList.add('sx-correct');
    });
    host.appendChild($(`<div class="sx-last-hint" style="color:#EF4444;">❌ Answer: ${qData.answer}</div>`));
    const dead=loseLifeCB();
    if(!dead){G.round++;_st(nextRound,800);}
  }

  function onTimeout(qData){
    playSound('wrong');
    G.combo=0;G.streak=0;
    host.appendChild($(`<div class="sx-last-hint">⏱ Time! Answer: ${qData.answer}</div>`));
    const dead=loseLifeCB();
    if(!dead){G.round++;_st(nextRound,900);}
  }

  function loseLifeCB(){
    if(G.isZen)return false;
    if(G.specialActive&&G.specialActive.noLife){G.specialActive=null;return false;}
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    if(G.lives<=0){_st(gameOver,700);return true;}
    return false;
  }

  /* ---------------------------------------------------------------- */
  /*  GAME OVER                                                       */
  /* ---------------------------------------------------------------- */
  function gameOver(){
    document.removeEventListener('visibilitychange',_sxVH);
    if(G.barT){_cti(G.barT);G.barT=null;}
    const newPB=G.score>record;
    if(newPB)setS('nz_stroop_best',G.score);
    setS('nz_stroop_games',(S('nz_stroop_games')||0)+1);
    if(newPB)confetti(50);
    const def=MODE_DEFS[G.mode];
    end({
      title:newPB?'New Best! 🏆':'Game Over',
      emoji:def.emoji,
      sub:`${G.score} pts · ${G.round} rounds · ${def.emoji} ${def.label}`,
      value:G.score,
      points:Math.max(2,Math.round(G.score*1.3)),
      starThresh:G.mode==='marathon'?[50,120,250]:[40,80,130],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${G.score}</span></div>
        <div class="row"><span>Rounds</span><span class="val">${G.round}</span></div>
        <div class="row"><span>Max Combo</span><span class="val">${G.maxCombo}x</span></div>
        <div class="row"><span>Mode</span><span class="val">${def.emoji} ${def.label}</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(G.score,record)}${newPB?' 🏆':''}</span></div>
        ${G.mode==='marathon'?`<div class="row"><span>Waves Survived</span><span class="val">${G.wave}</span></div>`:''}
      </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
    });
  }

  /* ---------------------------------------------------------------- */
  /*  HELPERS                                                         */
  /* ---------------------------------------------------------------- */
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  /* ---------------------------------------------------------------- */
  /*  BOOT                                                            */
  /* ---------------------------------------------------------------- */
  renderStart();
}
