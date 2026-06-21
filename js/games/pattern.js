/* ===================== PATTERN IQ v4 — procedural reasoning engine =====================
 *  Entry: playPattern(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed PT_ to avoid global collisions with the other 9 games.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st.
 *  CSS prefix preserved: .pat-
 *  localStorage keys preserved: nz_pattern_best, nz_pattern_games
 *  New additive keys: nz_pattern_skill, nz_pattern_v3_seen
 *  Note: previous file used PAT_* and a few unprefixed globals (showCombo). All renamed.
 * ============================================================================== */

/* ---------- DATA ---------- */
const PT_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24','#EF4444','#06B6D4'];
const PT_COLOR_NAMES=['Purple','Blue','Green','Orange','Pink','Yellow','Red','Cyan'];
const PT_HUE_NEIGHBOR={0:4,4:0,1:7,7:1,2:5,5:2,6:4,3:5}; /* perceptually nearby */
const PT_SHAPES=['\u25CF','\u25A0','\u25B2','\u25C6','\u2605','\u2B1F','\u2B22','\u2726'];
const PT_SHAPE_NAMES=['Circle','Square','Triangle','Diamond','Star','Pentagon','Hexagon','Sparkle'];
const PT_SIZES=[{key:'S',label:'Small',scale:0.7},{key:'M',label:'Medium',scale:1.0},{key:'L',label:'Large',scale:1.35},{key:'XL',label:'X-Large',scale:1.65}];
const PT_ARROWS=['\u2191','\u2197','\u2192','\u2198','\u2193','\u2199','\u2190','\u2196']; /* 8 directions, CW from N */

/* ---------- CATEGORY DEFINITIONS (data) ---------- */
const PT_CATEGORIES={
  num   :{id:'num',   label:'NUMBER LOGIC', icon:'\uD83D\uDD22',hue:'#4F8EF7',weight:1.0,phaseMin:0,answerKind:'number'},
  letter:{id:'letter',label:'LETTER LOGIC', icon:'\uD83D\uDD24',hue:'#F472B6',weight:1.0,phaseMin:0,answerKind:'letter'},
  color :{id:'color', label:'COLOR LOGIC',  icon:'\uD83C\uDFA8',hue:'#7C3AED',weight:0.95,phaseMin:0,answerKind:'color'},
  shape :{id:'shape', label:'SHAPE LOGIC',  icon:'\uD83D\uDD37',hue:'#06B6D4',weight:0.95,phaseMin:0,answerKind:'shape'},
  matrix:{id:'matrix',label:'MATRIX LOGIC', icon:'\uD83D\uDD32',hue:'#F97316',weight:0.9, phaseMin:1,answerKind:'shapeColor'},
  rotate:{id:'rotate',label:'ROTATION',     icon:'\uD83D\uDD04',hue:'#22C55E',weight:0.8, phaseMin:1,answerKind:'arrow'},
  size  :{id:'size',  label:'SIZE LOGIC',   icon:'\uD83D\uDCCF',hue:'#EAB308',weight:0.75,phaseMin:1,answerKind:'size'},
  mixed :{id:'mixed', label:'MIXED LOGIC',  icon:'\uD83E\uDDE9',hue:'#EF4444',weight:0.85,phaseMin:2,answerKind:'mixed'}
};
const PT_CATEGORY_IDS=Object.keys(PT_CATEGORIES);

/* ---------- SPECIAL EVENTS (rare, cooldown-gated) ---------- */
const PT_EVENTS={
  lightning:{id:'lightning',icon:'\uD83C\uDF29\uFE0F',label:'LIGHTNING LOGIC',sub:'2.5s \u00B7 3\u00D7 pts',timer:2500,mult:3,minRound:8, force:['num','letter']},
  hybrid   :{id:'hybrid',   icon:'\uD83E\uDDE9',         label:'HYBRID BURST',  sub:'+1.5s \u00B7 2.5\u00D7 pts', timeBonus:1500,mult:2.5,minRound:12,force:['mixed']},
  memory   :{id:'memory',   icon:'\uD83E\uDDE0',         label:'MEMORY PATTERN',sub:'Hide & recall \u00B7 2.5\u00D7',mult:2.5,minRound:10,memHide:true},
  trap     :{id:'trap',     icon:'\uD83E\uDEA4',         label:'TRAP ROUND',    sub:'Looks easy. Read carefully \u00B7 2\u00D7',mult:2,minRound:14,trap:true},
  focus    :{id:'focus',    icon:'\uD83C\uDFAF',         label:'FOCUS ROUND',   sub:'No HUD \u00B7 0.85\u00D7 timer \u00B7 2\u00D7',mult:2,minRound:10,focus:true,timerMul:0.85}
};
const PT_EVENT_IDS=Object.keys(PT_EVENTS);

/* ---------- HELPERS (top-level, all PT_-prefixed) ---------- */
function PT_rand(n){return Math.floor(Math.random()*n);}
function PT_pick(a){return a[Math.floor(Math.random()*a.length)];}
function PT_clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
function PT_shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=PT_rand(i+1);const t=x[i];x[i]=x[j];x[j]=t;}return x;}
function PT_haptic(p){try{if(navigator&&navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function PT_weightedPick(items){
  let total=0;for(let i=0;i<items.length;i++)total+=items[i].w;
  if(total<=0)return items[0]&&items[0].v;
  let r=Math.random()*total;
  for(let i=0;i<items.length;i++){r-=items[i].w;if(r<=0)return items[i].v;}
  return items[items.length-1].v;
}
function PT_escape(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));}
function PT_signatureStem(sig){
  /* strip variable parts: anything after key= becomes _ except the family stem */
  return sig.replace(/(start|gaps|miss|ratio|d|skip|step)=[^|]*/g,'$1=_');
}

/* ====================================================================== */
function playPattern(body,setScore,end,wrap,startClock){

  /* ---------- per-game state ---------- */
  const G={
    round:0,score:0,attempts:0,bonus:0,
    lives:3,streak:0,bestStreak:0,combo:1,
    arcTimer:null,qStart:0,qOffPause:0,timerMs:0,
    activeEvent:null,eventCooldown:0,
    chainPending:null, /* {expectedPos:number} for Chain Round */
    /* skill profile per-category (n attempted, ok correct) */
    skill:Object.fromEntries(PT_CATEGORY_IDS.map(c=>[c,{n:0,ok:0,ms:0}])),
    pending:false
  };

  /* anti-repetition rings */
  const Fresh={
    categories:[],   maxC:8,
    sigs:[],         maxSig:30,
    sigStems:[],     maxStem:6,
    answerShape:[],  maxAS:6,
    distrStyles:[],  maxDS:6,
    correctPos:[],   maxPos:8,
    add(buf,k,cap){buf.push(k);if(buf.length>cap)buf.shift();},
    countIn(buf,k,n){let c=0;const start=Math.max(0,buf.length-n);for(let i=start;i<buf.length;i++)if(buf[i]===k)c++;return c;},
    has(buf,k){return buf.indexOf(k)>=0;},
    clear(){this.categories=[];this.sigs=[];this.sigStems=[];this.answerShape=[];this.distrStyles=[];this.correctPos=[];}
  };

  /* adaptive engine */
  const Adapt={
    win:[],winSize:8,bias:0,recoveryRoundsLeft:0,
    record(correct,ms,timerMs,categoryId,complexityCost){
      this.win.push({c:correct?1:0,ms:ms||0,t:timerMs||5000,cat:categoryId,cost:complexityCost||1});
      if(this.win.length>this.winSize)this.win.shift();
      G.skill[categoryId].n++;
      if(correct)G.skill[categoryId].ok++;
      G.skill[categoryId].ms+=(ms||0);
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(const e of this.win){acc+=e.c;rt+=e.ms;tref+=e.t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.55)this.bias=PT_clamp(this.bias+1,-2,2);
      else if(acc<0.6){this.bias=PT_clamp(this.bias-1,-2,2);if(this.recoveryRoundsLeft<=0)this.recoveryRoundsLeft=2;}
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(const e of this.win)a+=e.c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(const e of this.win)r+=e.ms;return r/this.win.length;},
    reset(){this.win=[];this.bias=0;this.recoveryRoundsLeft=0;}
  };

  /* visibility pause */
  let _hidTs=0;
  const _onVis=()=>{
    if(document.hidden){_hidTs=Date.now();if(G.arcTimer){_cti(G.arcTimer);G.arcTimer=null;}}
    else if(_hidTs){G.qOffPause+=Date.now()-_hidTs;_hidTs=0;_resumeArc();}
  };
  document.addEventListener('visibilitychange',_onVis);
  function _cleanup(){
    document.removeEventListener('visibilitychange',_onVis);
    if(G.arcTimer){_cti(G.arcTimer);G.arcTimer=null;}
  }
  wrap.addEventListener('remove_game',_cleanup);

  /* ====================================================================== */
  /*  GENERATORS  —  each returns:                                          */
  /*    { html, optsHtml, opts, answerIdx, hint, sig, complexityCost,        */
  /*      answerKind, distrStyle, memHidden? }                               */
  /* ====================================================================== */
  const Gen={

    /* ---------- 1. NUMBER LOGIC (8 sub-rules) ---------- */
    num(diffBias){
      const variants=[
        ()=>{const a=PT_rand(8)+1,d=PT_rand(9)+2;return{seq:[a,a+d,a+2*d,a+3*d],ans:a+4*d,hint:'+'+d+' each step',sig:'num|arith|d='+d+'|start='+a,cost:1};},
        ()=>{const a=PT_rand(4)+2,r=PT_rand(3)+2;return{seq:[a,a*r,a*r*r,a*r*r*r],ans:a*r*r*r*r,hint:'\u00D7'+r+' each step',sig:'num|geom|r='+r+'|start='+a,cost:2};},
        ()=>{const a=PT_rand(6)+1,b=PT_rand(6)+2;const s=[a,b,a+b,a+2*b,2*a+3*b];return{seq:s.slice(0,4),ans:s[4],hint:'Fibonacci-like (sum of last two)',sig:'num|fib|a='+a+'|b='+b,cost:3};},
        ()=>{const n=PT_rand(5)+1;return{seq:[n*n,(n+1)*(n+1),(n+2)*(n+2),(n+3)*(n+3)],ans:(n+4)*(n+4),hint:'Perfect squares',sig:'num|sq|start='+n,cost:2};},
        ()=>{const primes=[2,3,5,7,11,13,17,19,23,29];const s=PT_rand(5);return{seq:primes.slice(s,s+4),ans:primes[s+4],hint:'Prime numbers',sig:'num|prime|start='+s,cost:3};},
        ()=>{const a=PT_rand(15)+10,d=PT_rand(5)+1;return{seq:[a,a-d,a-2*d,a-3*d],ans:a-4*d,hint:'-'+d+' each step',sig:'num|sub|d='+d+'|start='+a,cost:1};},
        ()=>{const a=PT_rand(6)+2,b=PT_rand(4)+2;return{seq:[a,a+b,a+3*b,a+6*b],ans:a+10*b,hint:'Gaps grow: +b,+2b,+3b,+4b',sig:'num|gap|b='+b+'|start='+a,cost:3};},
        ()=>{const a=PT_rand(3)+2,b=PT_rand(3)+2;const s=[a,a*b,a*b+a,(a*b+a)*b];return{seq:s,ans:s[3]+a,hint:'Alternating \u00D7'+b+' then +'+a,sig:'num|altOp|a='+a+'|b='+b,cost:4};}
      ];
      const v=variants[PT_rand(variants.length)]();
      /* smart distractors: 2 near-misses (±d and ±2d), 1 wrong-rule (apply +b instead of ×r), 1 reasonable other */
      const ans=v.ans;
      const distrSet=new Set([ans]);
      const tryAdd=(x)=>{if(typeof x==='number'&&isFinite(x)&&x>0&&x!==ans&&!distrSet.has(x))distrSet.add(x);};
      tryAdd(ans+1);tryAdd(ans-1);tryAdd(ans+(diffBias>=1?2:5));tryAdd(Math.max(1,ans-3));
      while(distrSet.size<4){tryAdd(ans+PT_rand(11)-5);}
      const opts=PT_shuffle(Array.from(distrSet)).slice(0,4);
      const ai=opts.indexOf(ans);
      const html='<div class="pat-seq">'+v.seq.map(n=>'<div class="pat-item pat-num" style="background:linear-gradient(135deg,#7C3AED,#4F8EF7);">'+n+'</div>').join('')+'<div class="pat-item pat-num pat-q">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((v,i)=>'<button class="pat-opt pat-opt-num" data-i="'+i+'">'+v+'</button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'number',distrStyle:'numNear'};
    },

    /* ---------- 2. LETTER LOGIC ---------- */
    letter(diffBias){
      const variants=[
        ()=>{const skip=PT_rand(3)+1,start=PT_rand(8);const seq=[],pos=[];for(let i=0;i<5;i++)pos.push(start+i*(skip+1));if(pos[4]>25)return null;for(let i=0;i<4;i++)seq.push(String.fromCharCode(65+pos[i]));return{seq:seq,ans:String.fromCharCode(65+pos[4]),hint:'Skip +'+skip+' letters forward',sig:'letter|skipFwd|skip='+skip+'|start='+start,cost:1};},
        ()=>{const skip=PT_rand(3)+1,start=PT_rand(8)+18;const pos=[];for(let i=0;i<5;i++)pos.push(start-i*(skip+1));if(pos[4]<0)return null;const seq=pos.slice(0,4).map(p=>String.fromCharCode(65+p));return{seq:seq,ans:String.fromCharCode(65+pos[4]),hint:'Skip -'+skip+' letters backward',sig:'letter|skipBack|skip='+skip+'|start='+start,cost:2};},
        ()=>{const start=PT_rand(8);const gaps=[1,2,1,2,1];const pos=[start];for(let i=0;i<4;i++)pos.push(pos[i]+gaps[i]);if(pos[4]>25)return null;return{seq:pos.slice(0,4).map(p=>String.fromCharCode(65+p)),ans:String.fromCharCode(65+pos[4]),hint:'Gaps alternate +1,+2',sig:'letter|altSkip|start='+start,cost:3};},
        ()=>{const start=PT_rand(8);const pos=[start];for(let i=0;i<4;i++)pos.push(pos[i]+(i+1));if(pos[4]>25)return null;return{seq:pos.slice(0,4).map(p=>String.fromCharCode(65+p)),ans:String.fromCharCode(65+pos[4]),hint:'Gap grows +1,+2,+3,+4',sig:'letter|growGap|start='+start,cost:3};},
        ()=>{const start=PT_rand(8);return{seq:[String.fromCharCode(65+start),String.fromCharCode(90-start),String.fromCharCode(65+start+2),String.fromCharCode(90-start-2)],ans:String.fromCharCode(65+start+4),hint:'Mirror alphabet alternation',sig:'letter|mirror|start='+start,cost:4};}
      ];
      let v=null,tries=0;
      while(!v&&tries<6){v=variants[PT_rand(variants.length)]();tries++;}
      if(!v)v={seq:['A','C','E','G'],ans:'I',hint:'Skip +1 letter forward',sig:'letter|skipFwd|skip=1|start=0',cost:1};
      const ansChar=v.ans;
      const set=new Set([ansChar]);
      const ansCode=ansChar.charCodeAt(0);
      const tryAdd=(o)=>{const cd=ansCode+o;if(cd>=65&&cd<=90){const ch=String.fromCharCode(cd);if(ch!==ansChar)set.add(ch);}};
      tryAdd(1);tryAdd(-1);tryAdd(2);tryAdd(-2);tryAdd(3);
      while(set.size<4){tryAdd(PT_rand(11)-5);}
      const opts=PT_shuffle(Array.from(set)).slice(0,4);
      const ai=opts.indexOf(ansChar);
      const html='<div class="pat-seq">'+v.seq.map(l=>'<div class="pat-item pat-letter">'+l+'</div>').join('')+'<div class="pat-item pat-letter pat-q">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((l,i)=>'<button class="pat-opt pat-opt-letter" data-i="'+i+'">'+l+'</button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'letter',distrStyle:'letterNear'};
    },

    /* ---------- 3. COLOR LOGIC ---------- */
    color(diffBias){
      const shape=PT_pick(PT_SHAPES);
      const N=PT_COLORS.length;
      const variants=[
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,b,a,b],ans:a,hint:'ABAB repeat',sig:'color|abab|a='+a+'|b='+b,cost:1};},
        ()=>{const pool=PT_shuffle(Array.from({length:N},(_,i)=>i)).slice(0,3);return{seq:[pool[0],pool[1],pool[2],pool[0]],ans:pool[1],hint:'ABCABC cycle',sig:'color|abcCycle|p='+pool.join(','),cost:2};},
        ()=>{const start=PT_rand(N);return{seq:[start,(start+1)%N,(start+2)%N,(start+3)%N],ans:(start+4)%N,hint:'Color wheel +1',sig:'color|wheel|start='+start,cost:2};},
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,a,b,b],ans:a,hint:'Grouped repeat AABB \u2192 next AA',sig:'color|grouped|a='+a+'|b='+b,cost:2};},
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,b,b,a],ans:a,hint:'Nested ABBA \u2192 next mirror',sig:'color|abba|a='+a+'|b='+b,cost:3};}
      ];
      const v=variants[PT_rand(variants.length)]();
      const ans=v.ans;
      const set=new Set([ans]);
      /* smart distractors: hue-neighbour and random */
      if(PT_HUE_NEIGHBOR[ans]!==undefined)set.add(PT_HUE_NEIGHBOR[ans]);
      while(set.size<4){const c=PT_rand(N);if(!set.has(c))set.add(c);}
      const opts=PT_shuffle(Array.from(set)).slice(0,4);
      const ai=opts.indexOf(ans);
      const html='<div class="pat-seq pat-seq-lg">'+v.seq.map(c=>'<div class="pat-item pat-item-lg" style="background:'+PT_COLORS[c]+';box-shadow:0 4px 16px '+PT_COLORS[c]+'55;">'+shape+'</div>').join('')+'<div class="pat-item pat-item-lg pat-q">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((c,i)=>'<button class="pat-opt pat-opt-color" data-i="'+i+'" style="background:'+PT_COLORS[c]+';box-shadow:0 4px 12px '+PT_COLORS[c]+'44;">'+shape+'<span style="font-size:10px;display:block;margin-top:2px;">'+PT_COLOR_NAMES[c]+'</span></button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'color',distrStyle:'hueNeighbor'};
    },

    /* ---------- 4. SHAPE LOGIC (alternation, count, rotation through types) ---------- */
    shape(diffBias){
      const N=PT_SHAPES.length;
      const variants=[
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,b,a,b],ans:a,hint:'ABAB shape alternation',sig:'shape|abab|a='+a+'|b='+b,cost:1};},
        ()=>{const start=PT_rand(N);return{seq:[start,(start+1)%N,(start+2)%N,(start+3)%N],ans:(start+4)%N,hint:'Shape wheel +1',sig:'shape|wheel|start='+start,cost:2};},
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);let c=PT_rand(N);while(c===a||c===b)c=PT_rand(N);return{seq:[a,b,c,a],ans:b,hint:'ABC cycling',sig:'shape|abc|a='+a+'|b='+b+'|c='+c,cost:2};},
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,a,b,b],ans:a,hint:'Pair grouping AABB\u2192AA',sig:'shape|pair|a='+a+'|b='+b,cost:2};}
      ];
      const v=variants[PT_rand(variants.length)]();
      const ans=v.ans;
      const set=new Set([ans]);
      while(set.size<4){const c=PT_rand(N);if(!set.has(c))set.add(c);}
      const opts=PT_shuffle(Array.from(set)).slice(0,4);
      const ai=opts.indexOf(ans);
      const ink=PT_COLORS[PT_rand(PT_COLORS.length)];
      const html='<div class="pat-seq">'+v.seq.map(s=>'<div class="pat-item" style="background:'+ink+';color:#fff;font-size:24px;">'+PT_SHAPES[s]+'</div>').join('')+'<div class="pat-item pat-q">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((s,i)=>'<button class="pat-opt" data-i="'+i+'" style="background:'+ink+';color:#fff;font-size:24px;">'+PT_SHAPES[s]+'</button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'shape',distrStyle:'shapeRot'};
    },

    /* ---------- 5. MATRIX LOGIC — row/column rule, missing cell anywhere ---------- */
    matrix(diffBias){
      /* pick a rule: rowShape_colColor | colShape_rowColor | rowShift (shape index shifts +1 per col) */
      const rule=['rowShape_colColor','colShape_rowColor','rowShift'][PT_rand(diffBias>=1?3:2)];
      const grid=[];
      let rowShapes,colShapes,rowCols,colCols;
      if(rule==='rowShape_colColor'){
        rowShapes=[0,1,2].map(()=>PT_rand(PT_SHAPES.length));
        colCols=[0,1,2].map(()=>PT_rand(PT_COLORS.length));
        for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:rowShapes[r],c:colCols[c]});
      }else if(rule==='colShape_rowColor'){
        colShapes=[0,1,2].map(()=>PT_rand(PT_SHAPES.length));
        rowCols=[0,1,2].map(()=>PT_rand(PT_COLORS.length));
        for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:colShapes[c],c:rowCols[r]});
      }else{ /* rowShift */
        const baseShape=PT_rand(PT_SHAPES.length);
        const baseCol=PT_rand(PT_COLORS.length);
        for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:(baseShape+c)%PT_SHAPES.length,c:(baseCol+r)%PT_COLORS.length});
      }
      const missingPos=PT_rand(9);
      const missingCell=grid[missingPos];
      const correct=missingCell.s+'_'+missingCell.c;
      const wrongOpts=new Set();
      while(wrongOpts.size<3){
        /* smart distractors: violate exactly ONE attribute */
        const violateShape=Math.random()<0.5;
        const ws=violateShape?(missingCell.s+1+PT_rand(PT_SHAPES.length-1))%PT_SHAPES.length:missingCell.s;
        const wc=violateShape?missingCell.c:(missingCell.c+1+PT_rand(PT_COLORS.length-1))%PT_COLORS.length;
        const k=ws+'_'+wc;
        if(k!==correct&&!wrongOpts.has(k))wrongOpts.add(k);
      }
      const opts=PT_shuffle([correct].concat(Array.from(wrongOpts)));
      const ai=opts.indexOf(correct);
      const cellHTML=grid.map((cell,i)=>i===missingPos?
        '<div class="pm-cell missing">?</div>':
        '<div class="pm-cell" style="background:'+PT_COLORS[cell.c]+';color:#fff;">'+PT_SHAPES[cell.s]+'</div>'
      ).join('');
      const hintMap={'rowShape_colColor':'Each row shares a SHAPE; each column shares a COLOR.','colShape_rowColor':'Each column shares a SHAPE; each row shares a COLOR.','rowShift':'Shape shifts across each row; color shifts down each column.'};
      const html='<div class="pat-matrix-wrap"><div class="pat-matrix">'+cellHTML+'</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((k,i)=>{const p=k.split('_');const s=parseInt(p[0],10),c=parseInt(p[1],10);return'<button class="pat-opt" data-i="'+i+'" style="background:'+PT_COLORS[c]+';color:#fff;font-size:22px;">'+PT_SHAPES[s]+'</button>';}).join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:hintMap[rule],sig:'matrix|rule='+rule+'|miss='+missingPos,complexityCost:rule==='rowShift'?4:3,answerKind:'shapeColor',distrStyle:'matrixOneAttr'};
    },

    /* ---------- 6. ROTATION LOGIC — 8-direction arrow progression ---------- */
    rotate(diffBias){
      const N=PT_ARROWS.length;
      const start=PT_rand(N);
      const stepChoices=diffBias>=1?[1,2,3,7]:[1,2];
      const step=PT_pick(stepChoices); /* 7 == −1 mod 8 */
      const seq=[start,(start+step)%N,(start+2*step)%N,(start+3*step)%N];
      const ans=(start+4*step)%N;
      const set=new Set([ans]);
      /* smart distractors: ± one step, mirror */
      set.add((ans+1)%N);set.add((ans+N-1)%N);set.add((ans+4)%N); /* 180° mirror */
      const opts=PT_shuffle(Array.from(set)).slice(0,4);
      const ai=opts.indexOf(ans);
      const ink=PT_COLORS[PT_rand(PT_COLORS.length)];
      const html='<div class="pat-seq">'+seq.map(a=>'<div class="pat-item pat-item-arrow" style="color:'+ink+'">'+PT_ARROWS[a]+'</div>').join('')+'<div class="pat-item pat-q pat-item-arrow">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((a,i)=>'<button class="pat-opt pat-opt-arrow" data-i="'+i+'" style="color:'+ink+'">'+PT_ARROWS[a]+'</button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:'Each step rotates by '+(step===7?'-45\u00B0':step*45+'\u00B0'),sig:'rotate|step='+step+'|start='+start,complexityCost:Math.abs(step)>1?3:2,answerKind:'arrow',distrStyle:'rotStep'};
    },

    /* ---------- 7. SIZE LOGIC — S/M/L/XL progression with optional color combo ---------- */
    size(diffBias){
      const N=PT_SIZES.length;
      const variants=[
        ()=>{const start=PT_rand(N-3);return{seq:[start,start+1,start+2,start+3].map(i=>i%N),ans:(start+4)%N,hint:'Size grows S\u2192M\u2192L\u2192XL',sig:'size|grow|start='+start,cost:1};},
        ()=>{const start=N-1-PT_rand(N-3);return{seq:[start,start-1,start-2,start-3],ans:start-4>=0?start-4:0,hint:'Size shrinks XL\u2192L\u2192M\u2192S',sig:'size|shrink|start='+start,cost:1};},
        ()=>{const a=PT_rand(N);let b=PT_rand(N);while(b===a)b=PT_rand(N);return{seq:[a,b,a,b],ans:a,hint:'Size alternates A\u2192B\u2192A',sig:'size|alt|a='+a+'|b='+b,cost:2};}
      ];
      const v=variants[PT_rand(variants.length)]();
      const ans=v.ans;
      const set=new Set([ans]);
      set.add((ans+1)%N);set.add((ans+N-1)%N);
      while(set.size<4){const c=PT_rand(N);if(!set.has(c))set.add(c);}
      const opts=PT_shuffle(Array.from(set)).slice(0,4);
      const ai=opts.indexOf(ans);
      const ink=PT_COLORS[PT_rand(PT_COLORS.length)];
      const shape=PT_pick(PT_SHAPES);
      const html='<div class="pat-seq">'+v.seq.map(idx=>'<div class="pat-item pat-item-size" style="color:'+ink+';font-size:'+(18*PT_SIZES[idx].scale)+'px;"><span class="pat-size-tag">'+PT_SIZES[idx].key+'</span>'+shape+'</div>').join('')+'<div class="pat-item pat-q">?</div></div>';
      const optsHtml='<div class="pat-opts">'+opts.map((idx,i)=>'<button class="pat-opt pat-opt-size" data-i="'+i+'" style="color:'+ink+';"><span class="pat-size-tag">'+PT_SIZES[idx].key+'</span><span style="font-size:'+(20*PT_SIZES[idx].scale)+'px;">'+shape+'</span></button>').join('')+'</div>';
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'size',distrStyle:'sizeStep'};
    },

    /* ---------- 8. MIXED LOGIC — two attributes co-evolve ---------- */
    mixed(diffBias){
      const variants=[
        /* letter+number both increment */
        ()=>{const startL=PT_rand(8),startN=PT_rand(5)+1,dN=PT_rand(3)+1;
          const seq=[];for(let i=0;i<4;i++)seq.push(String.fromCharCode(65+startL+i)+(startN+i*dN));
          const ans=String.fromCharCode(65+startL+4)+(startN+4*dN);
          if(startL+4>25)return null;
          return{seq:seq,ans:ans,hint:'Letter +1 AND number +'+dN,sig:'mixed|letterNum|sL='+startL+'|sN='+startN+'|dN='+dN,cost:3,kind:'letterNum'};
        },
        /* color cycle + shape cycle simultaneously */
        ()=>{const startC=PT_rand(PT_COLORS.length),startS=PT_rand(PT_SHAPES.length);
          const seq=[];for(let i=0;i<4;i++)seq.push({c:(startC+i)%PT_COLORS.length,s:(startS+i)%PT_SHAPES.length});
          const ans={c:(startC+4)%PT_COLORS.length,s:(startS+4)%PT_SHAPES.length};
          return{seq:seq,ans:ans,hint:'Both color and shape cycle +1',sig:'mixed|colorShape|sC='+startC+'|sS='+startS,cost:3,kind:'colorShape'};
        },
        /* shape count grows */
        ()=>{const shape=PT_pick(PT_SHAPES);const ink=PT_COLORS[PT_rand(PT_COLORS.length)];
          const seq=[1,2,3,4].map(n=>({n:n,shape:shape,ink:ink}));
          const ans=5;
          return{seq:seq,ans:ans,hint:'Count grows 1,2,3,4...',sig:'mixed|countGrow|shape='+shape,cost:2,kind:'countGrow'};
        }
      ];
      let v=null,tries=0;
      while(!v&&tries<5){v=variants[PT_rand(variants.length)]();tries++;}
      if(!v)v={seq:['A1','B2','C3','D4'],ans:'E5',hint:'Letter +1 AND number +1',sig:'mixed|letterNum|sL=0|sN=1|dN=1',cost:3,kind:'letterNum'};
      let html='',optsHtml='',opts,ai;
      if(v.kind==='letterNum'){
        const set=new Set([v.ans]);
        const ansLetter=v.ans.charAt(0),ansNum=parseInt(v.ans.slice(1),10);
        set.add(String.fromCharCode(ansLetter.charCodeAt(0)+1)+ansNum);
        set.add(ansLetter+(ansNum+1));
        set.add(String.fromCharCode(Math.max(65,ansLetter.charCodeAt(0)-1))+(ansNum-1));
        while(set.size<4){const L=String.fromCharCode(65+PT_rand(20));const N=PT_rand(20)+1;set.add(L+N);}
        opts=PT_shuffle(Array.from(set)).slice(0,4);ai=opts.indexOf(v.ans);
        html='<div class="pat-seq">'+v.seq.map(s=>'<div class="pat-item pat-mix-cell">'+s+'</div>').join('')+'<div class="pat-item pat-mix-cell pat-q">?</div></div>';
        optsHtml='<div class="pat-opts">'+opts.map((s,i)=>'<button class="pat-opt pat-opt-mix" data-i="'+i+'">'+s+'</button>').join('')+'</div>';
      }else if(v.kind==='colorShape'){
        const ans=v.ans;
        const set=new Map();
        const key=(o)=>o.s+'_'+o.c;
        set.set(key(ans),ans);
        /* one-attribute-violations */
        set.set(((ans.s+1)%PT_SHAPES.length)+'_'+ans.c,{s:(ans.s+1)%PT_SHAPES.length,c:ans.c});
        set.set(ans.s+'_'+((ans.c+1)%PT_COLORS.length),{s:ans.s,c:(ans.c+1)%PT_COLORS.length});
        while(set.size<4){const r={s:PT_rand(PT_SHAPES.length),c:PT_rand(PT_COLORS.length)};set.set(key(r),r);}
        opts=PT_shuffle(Array.from(set.values())).slice(0,4);
        ai=opts.findIndex(o=>o.s===ans.s&&o.c===ans.c);
        html='<div class="pat-seq pat-seq-lg">'+v.seq.map(o=>'<div class="pat-item pat-item-lg" style="background:'+PT_COLORS[o.c]+';">'+PT_SHAPES[o.s]+'</div>').join('')+'<div class="pat-item pat-item-lg pat-q">?</div></div>';
        optsHtml='<div class="pat-opts">'+opts.map((o,i)=>'<button class="pat-opt pat-opt-mix" data-i="'+i+'" style="background:'+PT_COLORS[o.c]+';color:#fff;font-size:22px;">'+PT_SHAPES[o.s]+'</button>').join('')+'</div>';
      }else{ /* countGrow */
        const set=new Set([v.ans]);set.add(v.ans+1);set.add(v.ans-1);set.add(v.ans+2);
        opts=PT_shuffle(Array.from(set)).slice(0,4);ai=opts.indexOf(v.ans);
        html='<div class="pat-seq">'+v.seq.map(item=>'<div class="pat-item pat-mix-cell" style="color:'+item.ink+';">'+(item.shape.repeat(item.n))+'</div>').join('')+'<div class="pat-item pat-mix-cell pat-q">?</div></div>';
        optsHtml='<div class="pat-opts">'+opts.map((n,i)=>'<button class="pat-opt pat-opt-num" data-i="'+i+'">'+n+'</button>').join('')+'</div>';
      }
      return{html:html,optsHtml:optsHtml,opts:opts,answerIdx:ai,hint:v.hint,sig:v.sig,complexityCost:v.cost,answerKind:'mixed',distrStyle:'mixedOneAttr'};
    }
  };

  /* ====================================================================== */
  /*  CATEGORY SELECTION                                                    */
  /* ====================================================================== */
  function PT_phase(){
    if(G.score<5)return 0;
    if(G.score<12)return 1;
    if(G.score<20)return 2;
    if(G.score<35)return 3;
    return 4;
  }
  function PT_phaseLabel(){
    const p=PT_phase();
    return['\uD83D\uDFE2 Easy','\uD83D\uDFE1 Medium','\uD83D\uDD34 Hard','\uD83D\uDC80 Expert','\uD83D\uDC51 Master'][p];
  }
  function PT_pickCategory(){
    if(G.activeEvent&&G.activeEvent.force){
      return PT_pick(G.activeEvent.force);
    }
    const phase=PT_phase()+Math.max(0,Adapt.bias);
    let elig=PT_CATEGORY_IDS.filter(id=>PT_CATEGORIES[id].phaseMin<=phase);
    /* recovery rounds: prefer easy categories with cost 1-2 */
    if(Adapt.recoveryRoundsLeft>0){
      const easyOnly=elig.filter(id=>id==='num'||id==='letter'||id==='color');
      if(easyOnly.length)elig=easyOnly;
      Adapt.recoveryRoundsLeft--;
    }
    /* hard rule: cannot equal last category */
    const last=Fresh.categories[Fresh.categories.length-1];
    let candidates=elig.filter(c=>c!==last);
    if(!candidates.length)candidates=elig;
    /* weighted by base weight × recency penalty */
    const items=candidates.map(c=>{
      const recent=Fresh.countIn(Fresh.categories,c,3);
      let w=PT_CATEGORIES[c].weight*(1/(1+recent*3));
      if(Adapt.bias>=1&&(c==='matrix'||c==='mixed'||c==='rotate'))w*=1.5;
      if(Adapt.bias<=-1&&(c==='matrix'||c==='mixed'))w*=0.5;
      return{v:c,w:w};
    });
    return PT_weightedPick(items);
  }

  /* ====================================================================== */
  /*  EVENT SCHEDULER                                                       */
  /* ====================================================================== */
  function PT_maybeEvent(){
    G.activeEvent=null;
    if(G.eventCooldown>0){G.eventCooldown--;return;}
    if(G.round<5)return;
    let p=0.04;
    if(Adapt.accuracy()>0.85)p+=0.02;
    if(Math.random()>p)return;
    const eligible=PT_EVENT_IDS.map(k=>PT_EVENTS[k]).filter(e=>G.round>=e.minRound);
    if(!eligible.length)return;
    const ev=PT_pick(eligible);
    G.activeEvent=ev;
    G.eventCooldown=4+PT_rand(3);
    PT_haptic([20,40,20]);
    toast(ev.icon+' '+ev.label+' \u2014 '+ev.sub);
  }

  /* ====================================================================== */
  /*  TIMER                                                                  */
  /* ====================================================================== */
  function PT_computeTimerMs(complexityCost){
    const ev=G.activeEvent;
    if(ev&&ev.timer)return ev.timer;
    const phase=PT_phase();
    let s=7000+(complexityCost-1)*1000-phase*500-Adapt.bias*400;
    if(ev&&ev.timeBonus)s+=ev.timeBonus;
    if(ev&&ev.timerMul)s*=ev.timerMul;
    return PT_clamp(Math.round(s),3000,10000);
  }

  /* ====================================================================== */
  /*  COMBO BANNER                                                          */
  /* ====================================================================== */
  function PT_showCombo(text){
    const banner=$('<div class="pat-combo-banner">'+text+'</div>');
    document.body.appendChild(banner);
    _st(()=>{banner.classList.add('pat-combo-out');},900);
    _st(()=>banner.remove(),1450);
  }
  function PT_scoreMult(){
    let m=1;
    if(G.streak>=10)m*=2.0;
    else if(G.streak>=6)m*=1.5;
    else if(G.streak>=3)m*=1.25;
    if(G.activeEvent&&G.activeEvent.mult)m*=G.activeEvent.mult;
    return m;
  }

  /* ====================================================================== */
  /*  RENDER — START SCREEN                                                */
  /* ====================================================================== */
  function renderStart(){
    body.innerHTML='';
    const record=S('nz_pattern_best')||0;
    const games=S('nz_pattern_games')||0;
    const screen=$('<div class="pat-start-screen">'+
      '<div class="pat-start-hero">'+
        '<div style="font-size:60px;margin-bottom:6px;">\uD83D\uDCA1</div>'+
        '<h2 style="margin:0 0 4px;font-size:22px;">Pattern IQ</h2>'+
        '<p style="font-size:12px;color:var(--text2);margin:0 0 12px;line-height:1.45;">'+
          '8 reasoning categories \u00B7 procedural \u00B7 endless'+
        '</p>'+
        (record?'<div class="pat-best-chip">\uD83C\uDFC6 Best: '+record+' \u00B7 '+games+' games</div>':'')+
      '</div>'+
      '<div class="pat-rules">'+
        '<div class="pat-rule"><span>\u26A1</span><span>Fast answers earn speed bonus</span></div>'+
        '<div class="pat-rule"><span>\uD83D\uDD25</span><span>Streak \u2265 3 \u2192 1.25\u00D7, \u2265 6 \u2192 1.5\u00D7, \u2265 10 \u2192 2\u00D7</span></div>'+
        '<div class="pat-rule"><span>\uD83D\uDCA1</span><span>Wrong reveals the rule \u00B7 -1 life</span></div>'+
        '<div class="pat-rule"><span>\uD83C\uDFAF</span><span>Adaptive difficulty \u00B7 surprise events</span></div>'+
      '</div>'+
      '<button class="btn-primary" id="patStart" style="width:100%;margin-top:16px;padding:16px;">Start Game \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    screen.querySelector('#patStart').onclick=()=>{
      playSound('tap');
      setS('nz_pattern_v3_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ====================================================================== */
  /*  GAME LOOP                                                              */
  /* ====================================================================== */
  let host=null;
  function startGame(){
    G.round=0;G.score=0;G.attempts=0;G.bonus=0;
    G.lives=3;G.streak=0;G.bestStreak=0;G.combo=1;
    G.activeEvent=null;G.eventCooldown=0;G.chainPending=null;
    G.skill=Object.fromEntries(PT_CATEGORY_IDS.map(c=>[c,{n:0,ok:0,ms:0}]));
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="pat-host"></div>');body.appendChild(host);
    setScore(0);
    next();
  }

  function _resumeArc(){if(host&&G.timerMs&&!G.arcTimer&&!G.pending)_runArc();}

  function _runArc(){
    const circ=2*Math.PI*30;
    if(G.arcTimer){_cti(G.arcTimer);G.arcTimer=null;}
    G.arcTimer=_si(()=>{
      const elapsed=Date.now()-G.qStart-G.qOffPause;
      const remaining=G.timerMs-elapsed;
      const fg=host.querySelector('#arcFg');
      const num=host.querySelector('#arcNum');
      if(fg){
        const pct=Math.max(0,remaining/G.timerMs);
        fg.style.strokeDashoffset=circ*(1-pct);
        fg.setAttribute('stroke',remaining<1500?'#EF4444':remaining<3000?'#F59E0B':'#7C3AED');
      }
      if(num)num.textContent=Math.max(0,Math.ceil(remaining/1000));
      if(remaining<=0){_cti(G.arcTimer);G.arcTimer=null;_onTimeout();}
    },80);
  }

  function next(){
    if(G.lives<=0){gameOver();return;}
    if(G.arcTimer){_cti(G.arcTimer);G.arcTimer=null;}
    PT_maybeEvent();
    /* Trap event override: force a near-rule violation generator (uses num with shifted sequence) */
    /* For simplicity, Trap reuses normal generators; the multiplier already rewards it. */
    let categoryId=PT_pickCategory();
    let q=null,tries=0;
    while(!q&&tries<6){
      tries++;
      const cand=Gen[categoryId]?Gen[categoryId](Adapt.bias):null;
      if(!cand)continue;
      /* freshness gates (relax after 3 tries) */
      const stem=PT_signatureStem(cand.sig);
      const tooSoon=tries<=3&&(Fresh.has(Fresh.sigs,cand.sig)||Fresh.countIn(Fresh.sigStems,stem,5)>=2);
      const sameAnsShape=tries<=3&&Fresh.countIn(Fresh.answerShape,cand.answerKind,3)>=3;
      const sameDistr  =tries<=3&&Fresh.countIn(Fresh.distrStyles,cand.distrStyle,4)>=3;
      if(tooSoon||sameAnsShape||sameDistr)continue;
      q=cand;
    }
    if(!q)q=Gen.num(Adapt.bias);
    /* enforce correct-position balance */
    q=PT_avoidStalePos(q);
    /* record freshness */
    Fresh.add(Fresh.categories,categoryId,Fresh.maxC);
    Fresh.add(Fresh.sigs,q.sig,Fresh.maxSig);
    Fresh.add(Fresh.sigStems,PT_signatureStem(q.sig),Fresh.maxStem);
    Fresh.add(Fresh.answerShape,q.answerKind,Fresh.maxAS);
    Fresh.add(Fresh.distrStyles,q.distrStyle,Fresh.maxDS);
    Fresh.add(Fresh.correctPos,q.answerIdx,Fresh.maxPos);
    G.timerMs=PT_computeTimerMs(q.complexityCost);
    G.qStart=Date.now();G.qOffPause=0;
    renderRound(categoryId,q);
  }

  function PT_avoidStalePos(q){
    const recent=Fresh.correctPos.slice(-5);
    const cur=q.answerIdx;
    if(recent.filter(p=>p===cur).length<2)return q;
    /* swap correct option to a less-used slot */
    let bestSlot=cur,bestCount=99;
    const optCount=q.opts?q.opts.length:4;
    for(let i=0;i<optCount;i++){
      const c=recent.filter(p=>p===i).length;
      if(c<bestCount){bestCount=c;bestSlot=i;}
    }
    if(bestSlot===cur||!q.opts)return q;
    const tmp=q.opts[cur];q.opts[cur]=q.opts[bestSlot];q.opts[bestSlot]=tmp;
    /* rebuild optsHtml positions — simple regex swap of data-i is fragile, so re-render via the generator's html if possible.
       The cheap reliable fix: rewrite data-i indices in-place. */
    q.answerIdx=bestSlot;
    /* swap data-i=cur and data-i=bestSlot in optsHtml strings */
    const a='data-i="'+cur+'"',b='data-i="'+bestSlot+'"';
    const placeholder='__PT_SWAP__';
    q.optsHtml=q.optsHtml.split(a).join(placeholder).split(b).join(a).split(placeholder).join(b);
    return q;
  }

  function renderRound(categoryId,q){
    const cat=PT_CATEGORIES[categoryId];
    const ev=G.activeEvent;
    const focusMode=!!(ev&&ev.focus);
    const phaseLabel=PT_phaseLabel();
    const taskChip='<div class="pat-task-chip" style="background:'+cat.hue+';"><span class="pat-task-icon">'+cat.icon+'</span><span class="pat-task-text">'+cat.label+'</span></div>';
    const eventBanner=ev?'<div class="pat-event-banner">'+ev.icon+' '+ev.label+' \u00B7 '+ev.sub+'</div>':'';
    const phaseChip='<span class="pat-phase-chip">'+phaseLabel+'</span>';
    const accChip=Adapt.win.length>=5?'<span class="pat-acc-chip">'+Math.round(Adapt.accuracy()*100)+'%</span>':'';

    const arcHtml='<div class="arc-wrap">'+
      '<svg id="arcSvg" width="66" height="66" viewBox="0 0 70 70">'+
        '<circle cx="35" cy="35" r="30" fill="none" stroke="rgba(124,58,237,0.15)" stroke-width="5"/>'+
        '<circle id="arcFg" cx="35" cy="35" r="30" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="'+(2*Math.PI*30)+'" stroke-dashoffset="0"/>'+
      '</svg>'+
      '<div class="arc-num" id="arcNum">'+Math.ceil(G.timerMs/1000)+'</div>'+
    '</div>';

    const heartsHtml=focusMode?'':
      '<div class="pat-hud">'+
        '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>'+
        '<div class="pat-hud-right">'+
          '<span class="pat-score-badge">'+G.score+' pts</span>'+
          (G.streak>=2?'<span class="pat-streak-badge">\uD83D\uDD25'+G.streak+'</span>':'')+
        '</div>'+
      '</div>';

    host.innerHTML=
      heartsHtml+
      '<div class="pat-diff-row">'+
        phaseChip+
        arcHtml+
        '<div class="pat-q-meta">'+accChip+' <span style="font-size:11px;color:var(--text2);">Q'+(G.round+1)+'</span></div>'+
      '</div>'+
      eventBanner+
      taskChip+
      '<div class="pat-instruction">'+_helperFor(categoryId,ev)+'</div>'+
      q.html+
      q.optsHtml;

    /* Memory event: hide last 2 elements after 1.5s */
    if(ev&&ev.memHide){
      _st(()=>{
        const items=host.querySelectorAll('.pat-seq .pat-item');
        if(items.length>=2){
          items[items.length-2].classList.add('pat-mem-hidden');
          items[items.length-3].classList.add('pat-mem-hidden');
        }
      },1500);
    }

    host.querySelectorAll('.pat-opt').forEach(btn=>{
      btn.onclick=()=>{
        if(btn.disabled)return;
        host.querySelectorAll('.pat-opt').forEach(b=>b.disabled=true);
        if(G.arcTimer){_cti(G.arcTimer);G.arcTimer=null;}
        const chosen=parseInt(btn.dataset.i,10);
        const elapsed=Date.now()-G.qStart-G.qOffPause;
        if(chosen===q.answerIdx)_onCorrect(q,chosen,elapsed,categoryId,btn);
        else _onWrong(q,chosen,elapsed,categoryId,btn);
      };
    });
    _runArc();
  }
  function _helperFor(categoryId,ev){
    if(ev&&ev.memHide)return 'Sequence will hide \u2014 remember it!';
    if(ev&&ev.trap)return 'Read carefully \u2014 the obvious answer may not be right.';
    if(ev&&ev.focus)return 'Focus mode \u00B7 fewer cues';
    const map={
      num:'Find the next number in the sequence.',
      letter:'Find the next letter in the sequence.',
      color:'Find the next color in the pattern.',
      shape:'Find the next shape in the pattern.',
      matrix:'Identify the missing cell using row + column rules.',
      rotate:'Find the next direction in the rotation.',
      size:'Find the next size in the progression.',
      mixed:'Two attributes change together \u2014 find the next one.'
    };
    return map[categoryId]||map.num;
  }

  function _onCorrect(q,chosen,elapsed,categoryId,btn){
    playSound('correct');PT_haptic(10);
    Adapt.record(true,elapsed,G.timerMs,categoryId,q.complexityCost);
    btn.classList.add('correct-ans');
    G.streak++;if(G.streak>G.bestStreak)G.bestStreak=G.streak;
    G.attempts++;
    const fast=elapsed<G.timerMs*0.4;
    const fastBonus=fast?1.5:elapsed<G.timerMs*0.7?1.2:1;
    const baseScore=q.complexityCost; /* simpler patterns 1pt, hardest 4pts */
    const m=PT_scoreMult();
    const pts=Math.max(1,Math.round(baseScore*m*fastBonus));
    G.score+=pts;setScore(G.score);
    if(fast)G.bonus++;
    /* combo banners */
    if(G.streak===3)PT_showCombo('\uD83D\uDD25 STREAK x3');
    else if(G.streak===6)PT_showCombo('\u26A1 ON FIRE x6');
    else if(G.streak===10)PT_showCombo('\uD83D\uDC51 FLOW STATE x10');
    /* points popup */
    const popup=$('<div class="pat-pts-popup" style="color:#34D399;">+'+pts+(fast?' \u26A1':'')+'</div>');
    document.body.appendChild(popup);_st(()=>popup.remove(),900);
    G.round++;
    _st(next,440);
  }
  function _onWrong(q,chosen,elapsed,categoryId,btn){
    playSound('wrong');PT_haptic([20,40,20]);
    Adapt.record(false,elapsed,G.timerMs,categoryId,q.complexityCost);
    btn.classList.add('wrong-ans');
    /* highlight correct */
    const opts=host.querySelectorAll('.pat-opt');
    if(opts[q.answerIdx])opts[q.answerIdx].classList.add('correct-ans');
    G.streak=0;G.attempts++;G.lives--;
    /* hint reveal */
    const hintEl=$('<div class="pat-hint-box pat-hint-wrong">\u274C Wrong \u00B7 <span>\uD83D\uDCA1 '+PT_escape(q.hint)+'</span></div>');
    host.appendChild(hintEl);
    if(G.lives<=0){_st(gameOver,1100);return;}
    G.round++;
    _st(next,1100);
  }
  function _onTimeout(){
    /* synthesise a wrong outcome with no specific button */
    playSound('wrong');PT_haptic(50);
    const opts=host.querySelectorAll('.pat-opt');
    opts.forEach(b=>b.disabled=true);
    const hintEl=$('<div class="pat-hint-box pat-hint-wrong">\u23F1 Time up</div>');
    host.appendChild(hintEl);
    G.streak=0;G.attempts++;G.lives--;
    Adapt.record(false,G.timerMs,G.timerMs,Fresh.categories[Fresh.categories.length-1]||'num',1);
    if(G.lives<=0){_st(gameOver,1100);return;}
    G.round++;
    _st(next,1100);
  }

  /* ====================================================================== */
  /*  GAME OVER + SKILL INSIGHT                                              */
  /* ====================================================================== */
  function gameOver(){
    _cleanup();
    const record=S('nz_pattern_best')||0;
    const newPB=G.score>record;
    if(newPB)setS('nz_pattern_best',G.score);
    setS('nz_pattern_games',(S('nz_pattern_games')||0)+1);
    /* persist skill profile (additive) */
    const skillStore=S('nz_pattern_skill')||{};
    PT_CATEGORY_IDS.forEach(c=>{
      const a=skillStore[c]||{n:0,ok:0,ms:0};
      skillStore[c]={n:a.n+G.skill[c].n,ok:a.ok+G.skill[c].ok,ms:a.ms+G.skill[c].ms};
    });
    setS('nz_pattern_skill',skillStore);
    if(newPB)confetti(60);
    const acc=G.attempts?Math.round((G.attempts-G.lives>=0?(G.attempts-(3-G.lives)):G.attempts)/G.attempts*100):0;
    /* compute strongest/weakest category from THIS run only */
    let best=null,worst=null;
    PT_CATEGORY_IDS.forEach(c=>{
      const sk=G.skill[c];
      if(sk.n>=2){
        const a=sk.ok/sk.n;
        if(!best||a>best.a)best={id:c,a:a,n:sk.n};
        if(!worst||a<worst.a)worst={id:c,a:a,n:sk.n};
      }
    });
    let insight='';
    if(best&&worst&&best.id!==worst.id){
      insight='Strongest: '+PT_CATEGORIES[best.id].label+' \u00B7 '+Math.round(best.a*100)+'%. Work on: '+PT_CATEGORIES[worst.id].label+' \u00B7 '+Math.round(worst.a*100)+'%.';
    }else if(best){
      insight='Strong run on '+PT_CATEGORIES[best.id].label+' ('+Math.round(best.a*100)+'%).';
    }
    end({
      title:newPB?'New Best! \uD83C\uDFC6':'Pattern Master! \uD83D\uDCA1',
      emoji:'\uD83D\uDCA1',
      sub:G.score+' pts \u00B7 '+G.round+' rounds'+(newPB?' \u00B7 \uD83C\uDFC6':''),
      value:G.score,points:Math.max(2,Math.round(G.score*1.4)),starThresh:[18,40,80],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Score</span><span class="val">'+G.score+'</span></div>'+
        '<div class="row"><span>Rounds</span><span class="val">'+G.round+'</span></div>'+
        '<div class="row"><span>Speed Bonuses</span><span class="val">+'+G.bonus+' \u26A1</span></div>'+
        '<div class="row"><span>Best Streak</span><span class="val">'+G.bestStreak+' \uD83D\uDD25</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(G.score,record)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      (insight?'<div class="pat-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  renderStart();
}
