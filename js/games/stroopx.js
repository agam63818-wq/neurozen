/* ===================== STROOP X v3 — premium redesign =====================
 *  Entry:  playStroopX(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed with SX_ to avoid collisions.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
 *  CSS prefix preserved: .sx-
 *  localStorage keys preserved: nz_stroop_best, nz_stroop_games
 *  New keys (additive): nz_stroop_best_combo, nz_stroop_v3_seen
 * ========================================================================= */

/* ---------- STATIC DATA (module-scope, prefixed) ------------------------- */
const SX_COLORS=[
  {name:'Red',hex:'#EF4444',letter:'R'},
  {name:'Blue',hex:'#3B82F6',letter:'B'},
  {name:'Green',hex:'#22C55E',letter:'G'},
  {name:'Yellow',hex:'#EAB308',letter:'Y'},
  {name:'Purple',hex:'#A855F7',letter:'P'},
  {name:'Orange',hex:'#F97316',letter:'O'},
  {name:'Cyan',hex:'#06B6D4',letter:'C'},
  {name:'Pink',hex:'#EC4899',letter:'K'}
];
const SX_COLOR_BY_NAME=new Map(SX_COLORS.map(c=>[c.name,c]));
/* perceptual-confusion pairs for medium distractors */
const SX_HUE_NEIGHBORS={Red:'Pink',Pink:'Red',Blue:'Cyan',Cyan:'Blue',Green:'Yellow',Yellow:'Green',Purple:'Pink',Orange:'Yellow'};
const SX_SHAPES=[{name:'Circle',sym:'\u25CF'},{name:'Square',sym:'\u25A0'},{name:'Triangle',sym:'\u25B2'},{name:'Star',sym:'\u2605'}];
const SX_DIRS=[{name:'Up',sym:'\u2191'},{name:'Down',sym:'\u2193'},{name:'Left',sym:'\u2190'},{name:'Right',sym:'\u2192'}];
const SX_DIR_OPP={Up:'Down',Down:'Up',Left:'Right',Right:'Left'};

/* Variant defs — taskChip is the bold short verb phrase; question is helper text. */
const SX_VARIANTS={
  wordink   :{id:'wordink',   chipIcon:'\uD83C\uDFA8',chipText:'TAP INK COLOR',  hue:'#7C3AED',helper:'Word ka color, INK ka rang tap karo',weight:1.0,phaseMin:0,answerKind:'color'},
  reverse   :{id:'reverse',   chipIcon:'\uD83D\uDD24',chipText:'TAP THE WORD',   hue:'#22C55E',helper:'INK ignore — jo LIKHA hai woh tap karo',weight:1.0,phaseMin:0,answerKind:'color'},
  shape     :{id:'shape',     chipIcon:'\uD83D\uDD37',chipText:'TAP THE SHAPE',  hue:'#4F8EF7',helper:'Shape pick karo, label ignore',weight:0.9,phaseMin:1,answerKind:'shape'},
  arrow     :{id:'arrow',     chipIcon:'\u27A1\uFE0F',chipText:'TAP DIRECTION',  hue:'#F472B6',helper:'Arrow kidhar point kar raha?',weight:0.9,phaseMin:1,answerKind:'dir'},
  position  :{id:'position',  chipIcon:'\uD83D\uDC40',chipText:'TAP POSITION',   hue:'#34D399',helper:'Word screen pe upar ya neeche?',weight:0.85,phaseMin:1,answerKind:'pos'},
  number    :{id:'number',    chipIcon:'\uD83D\uDD22',chipText:'TAP DIGIT COUNT',hue:'#F97316',helper:'Kitne digits dikh rahe hain?',weight:0.85,phaseMin:2,answerKind:'count'},
  dual      :{id:'dual',      chipIcon:'\u26A1',       chipText:'SAME OR DIFF',  hue:'#EF4444',helper:'Dono words ka INK same hai ya different?',weight:0.9,phaseMin:2,answerKind:'bool'},
  oddball   :{id:'oddball',   chipIcon:'\uD83D\uDD0E',chipText:'TAP ODD ONE',    hue:'#0EA5E9',helper:'Teen mein se ALAG kaunsa?',weight:0.8,phaseMin:1,answerKind:'odd'},
  seqmem    :{id:'seqmem',    chipIcon:'\uD83E\uDDE0',chipText:'WAS IT IN LIST?',hue:'#A78BFA',helper:'Sequence dekho, fir bolo probe tha ya nahi',weight:0.7,phaseMin:2,answerKind:'bool'},
  split     :{id:'split',     chipIcon:'\uD83D\uDD00',chipText:'LEFT vs RIGHT',  hue:'#06B6D4',helper:'Dono halves ka INK same ya different?',weight:0.7,phaseMin:2,answerKind:'bool'},
  echoprev  :{id:'echoprev',  chipIcon:'\uD83D\uDD01',chipText:'MATCH PREVIOUS', hue:'#8B5CF6',helper:'Pichla answer wahi tha?',weight:0.6,phaseMin:3,answerKind:'bool'}
};
const SX_VARIANT_IDS=Object.keys(SX_VARIANTS);

const SX_MODES={
  classic :{label:'Classic', emoji:'\uD83C\uDFA8',sub:'Balanced \u00B7 3 lives \u00B7 all variants',  lives:3,baseTime:3000,minTime:1100,timeDecay:55,scoreMult:1.0,colorsStart:5,colorsIncEvery:8,waveLen:0,events:true,zen:false,combo:'std'},
  speed   :{label:'Speed',   emoji:'\u26A1',         sub:'2s timer \u00B7 1.5\u00D7 \u00B7 combo amp',  lives:3,baseTime:2000,minTime:800, timeDecay:35,scoreMult:1.5,colorsStart:5,colorsIncEvery:6,waveLen:0,events:true,zen:false,combo:'amp'},
  marathon:{label:'Marathon',emoji:'\uD83C\uDFC3',sub:'5 lives \u00B7 waves \u00B7 checkpoints',     lives:5,baseTime:3500,minTime:1000,timeDecay:45,scoreMult:1.2,colorsStart:5,colorsIncEvery:10,waveLen:8,events:true,zen:false,combo:'std'},
  zen     :{label:'Zen',     emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 explanations \u00B7 practice', lives:99,baseTime:0,   minTime:0,   timeDecay:0, scoreMult:0.5,colorsStart:5,colorsIncEvery:99,waveLen:0,events:false,zen:true,combo:'soft'}
};

const SX_EVENTS={
  lightning :{id:'lightning', icon:'\uD83C\uDF29\uFE0F',label:'LIGHTNING ROUND',sub:'1.0s \u00B7 4\u00D7 pts',timer:1000,mult:4,minRound:8, weight:1.0,modes:['classic','speed','marathon']},
  reverse   :{id:'reverse',   icon:'\uD83D\uDD04',         label:'REVERSE WAVE', sub:'INK \u2192 WORD flip \u00B7 2\u00D7',timer:0,mult:2,minRound:6, weight:0.9,modes:['classic','speed','marathon'],forceVariant:'reverse'},
  rainbow   :{id:'rainbow',   icon:'\uD83C\uDF08',         label:'RAINBOW CHAOS',sub:'All 8 colors \u00B7 2\u00D7',           timer:0,mult:2,minRound:10,weight:0.8,modes:['classic','speed','marathon'],allColors:true},
  ghost     :{id:'ghost',     icon:'\uD83D\uDC7B',         label:'GHOST ROUND',  sub:'Stimulus fades \u00B7 3\u00D7',         timer:0,mult:3,minRound:14,weight:0.7,modes:['classic','speed','marathon'],ghost:true},
  focuslock :{id:'focuslock', icon:'\uD83C\uDFAF',         label:'FOCUS LOCK',   sub:'One cue only \u00B7 2.5\u00D7',         timer:0,mult:2.5,minRound:12,weight:0.7,modes:['classic','speed','marathon'],focus:true},
  immunity  :{id:'immunity',  icon:'\uD83D\uDEE1\uFE0F',label:'IMMUNITY',     sub:'Next wrong \u2192 no life',            timer:0,mult:1,minRound:5, weight:0.6,modes:['classic','marathon'],noLife:true}
};
const SX_EVENT_IDS=Object.keys(SX_EVENTS);

/* ---------- helpers ------------------------------------------------------ */
function SX_shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
function SX_pick(a){return a[Math.floor(Math.random()*a.length)];}
function SX_clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
function SX_haptic(p){try{if(navigator&&navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function SX_weightedPick(items){
  let total=0;for(let i=0;i<items.length;i++)total+=items[i].w;
  if(total<=0)return items[0].v;
  let r=Math.random()*total;
  for(let i=0;i<items.length;i++){r-=items[i].w;if(r<=0)return items[i].v;}
  return items[items.length-1].v;
}
function SX_hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function SX_escape(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));}

/* ========================================================================= */
function playStroopX(body,setScore,end,wrap,startClock){

  /* ---------- per-game state (closure) ---------------------------------- */
  const G={
    mode:'classic',
    round:0,score:0,lives:3,maxLives:3,
    combo:0,maxCombo:0,
    wave:1,roundsInWave:0,
    activeEvent:null,eventCooldown:0,
    prevAnswer:null,prevVariant:null,prevQ:null,
    qData:null,timerMs:0,mult:1,roundStart:0,roundOffPause:0,
    barT:null,ghostT:null,roundT:null,
    pending:false,recoveryRoundsLeft:0
  };

  /* anti-repetition rings */
  const Fresh={
    variants:[],   maxV:5,
    answers:[],    maxA:6,
    sigs:[],       maxSig:14,
    pairs:[],      maxP:5,
    posIdx:[],     maxPos:6,
    add(buf,key,cap){buf.push(key);if(buf.length>cap)buf.shift();},
    countIn(buf,key,n){let c=0;const start=Math.max(0,buf.length-n);for(let i=start;i<buf.length;i++)if(buf[i]===key)c++;return c;},
    clear(){this.variants=[];this.answers=[];this.sigs=[];this.pairs=[];this.posIdx=[];}
  };

  /* adaptive difficulty (rolling window) */
  const Adapt={
    win:[],winSize:8,bias:0,
    record(correct,ms,timerMs){
      this.win.push({c:correct?1:0,ms:ms,t:timerMs||3000});
      if(this.win.length>this.winSize)this.win.shift();
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(const e of this.win){acc+=e.c;rt+=e.ms;tref+=e.t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.55)this.bias=SX_clamp(this.bias+1,-2,2);
      else if(acc<0.6)this.bias=SX_clamp(this.bias-1,-2,2);
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(const e of this.win)a+=e.c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(const e of this.win)r+=e.ms;return r/this.win.length;},
    reset(){this.win=[];this.bias=0;}
  };

  /* ---------- visibility-pause (don't penalise tab-backgrounding) ------- */
  let _hidTs=0;
  const _onVis=()=>{
    if(document.hidden){_hidTs=Date.now();if(G.barT){_cti(G.barT);G.barT=null;}}
    else if(_hidTs){G.roundOffPause+=Date.now()-_hidTs;_hidTs=0;_resumeTimer();}
  };
  document.addEventListener('visibilitychange',_onVis);

  /* ---------- cleanup --------------------------------------------------- */
  function _cleanup(){
    document.removeEventListener('visibilitychange',_onVis);
    if(G.barT){_cti(G.barT);G.barT=null;}
    if(G.ghostT){_cti(G.ghostT);G.ghostT=null;}
    if(G.roundT){_cti(G.roundT);G.roundT=null;}
  }
  wrap.addEventListener('remove_game',_cleanup);

  let host=null;

  /* ====================================================================== */
  /*  COLOR / OPTION HELPERS                                                */
  /* ====================================================================== */
  function SX_getColors(){
    if(G.activeEvent&&G.activeEvent.allColors)return SX_COLORS.slice();
    const def=SX_MODES[G.mode];
    let n=def.colorsStart+Math.floor(G.round/def.colorsIncEvery);
    n+=Adapt.bias;
    n=SX_clamp(n,4,SX_COLORS.length);
    return SX_COLORS.slice(0,n);
  }
  function SX_pickFreshColor(pool){
    /* avoid same answer 3-in-a-row */
    const recent=Fresh.answers.slice(-3);
    const filtered=pool.filter(c=>recent.filter(r=>r===c.name).length<2);
    return SX_pick(filtered.length?filtered:pool);
  }
  function SX_buildColorChoices(pool,target,wordName){
    /* target: correct color name. wordName: the written word (for strong distractor). */
    const out=[SX_COLOR_BY_NAME.get(target)];
    if(wordName&&wordName!==target&&SX_COLOR_BY_NAME.has(wordName))out.push(SX_COLOR_BY_NAME.get(wordName));
    const neighborName=SX_HUE_NEIGHBORS[target];
    const neighbor=neighborName&&SX_COLOR_BY_NAME.get(neighborName);
    if(neighbor&&pool.find(c=>c.name===neighbor.name)&&!out.find(c=>c.name===neighbor.name))out.push(neighbor);
    /* fill from pool */
    const remaining=pool.filter(c=>!out.find(o=>o.name===c.name));
    const shuf=SX_shuffle(remaining);
    while(out.length<4&&shuf.length)out.push(shuf.shift());
    /* trim to 4, ensure target present */
    let final=out.slice(0,4);
    if(!final.find(c=>c.name===target))final[0]=SX_COLOR_BY_NAME.get(target);
    /* shuffle but bias correct away from over-used position */
    final=SX_shuffle(final);
    final=SX_avoidStalePosition(final,c=>c.name===target);
    return final;
  }
  function SX_avoidStalePosition(arr,isCorrect){
    const idx=arr.findIndex(isCorrect);
    if(idx<0)return arr;
    const recent=Fresh.posIdx.slice(-4);
    if(recent.filter(p=>p===idx).length>=2&&arr.length>1){
      /* swap to a less-used slot */
      let bestSlot=idx,bestCount=99;
      for(let i=0;i<arr.length;i++){
        const c=recent.filter(p=>p===i).length;
        if(c<bestCount){bestCount=c;bestSlot=i;}
      }
      if(bestSlot!==idx){const t=arr[idx];arr[idx]=arr[bestSlot];arr[bestSlot]=t;}
    }
    return arr;
  }

  /* ====================================================================== */
  /*  VARIANT GENERATORS                                                    */
  /*  Each returns: { html, answer, choices, sig, answerKind, pair? }      */
  /* ====================================================================== */
  const Gen={
    wordink(colors){
      const word=SX_pick(colors);
      const inkPool=colors.filter(c=>c.name!==word.name);
      const ink=SX_pickFreshColor(inkPool.length?inkPool:colors);
      const choices=SX_buildColorChoices(colors,ink.name,word.name);
      return{
        html:'<div class="sx-stim"><div class="sx-word" style="color:'+ink.hex+'">'+word.name+'</div></div>',
        answer:ink.name,choices:choices,answerKind:'color',
        pair:word.name+'/'+ink.name,
        sig:'wi:'+word.name+':'+ink.name
      };
    },
    reverse(colors){
      const word=SX_pickFreshColor(colors);
      const inkPool=colors.filter(c=>c.name!==word.name);
      const ink=inkPool.length?SX_pick(inkPool):colors[0];
      const choices=SX_buildColorChoices(colors,word.name,word.name); /* answer = word */
      return{
        html:'<div class="sx-stim"><div class="sx-word" style="color:'+ink.hex+'">'+word.name+'</div><div class="sx-shape-word">INK ignore karo</div></div>',
        answer:word.name,choices:choices,answerKind:'color',
        pair:'rev:'+word.name+'/'+ink.name,
        sig:'rv:'+word.name+':'+ink.name
      };
    },
    shape(colors){
      const ink=SX_pick(colors);
      const disp=SX_pick(SX_SHAPES);
      const others=SX_SHAPES.filter(s=>s.name!==disp.name);
      const lblShape=others[Math.floor(Math.random()*others.length)];
      const choices=SX_avoidStalePosition(SX_shuffle(SX_SHAPES.slice()),s=>s.name===disp.name);
      return{
        html:'<div class="sx-stim"><div class="sx-shape" style="color:'+ink.hex+'">'+disp.sym+'</div></div><div class="sx-shape-word">Label: <strong>"'+lblShape.name+'"</strong> \u2014 ignore</div>',
        answer:disp.name,choices:choices,answerKind:'shape',
        sig:'sh:'+disp.name+':'+ink.name+':'+lblShape.name
      };
    },
    arrow(colors){
      const dir=SX_pick(SX_DIRS);
      const others=SX_DIRS.filter(d=>d.name!==dir.name);
      const lbl=others[Math.floor(Math.random()*others.length)];
      const ink=SX_pick(colors);
      const choices=SX_avoidStalePosition(SX_shuffle(SX_DIRS.slice()),d=>d.name===dir.name);
      return{
        html:'<div class="sx-stim"><div class="sx-arrow" style="color:'+ink.hex+'">'+dir.sym+'</div></div><div class="sx-shape-word">Label: <strong>"'+lbl.name+'"</strong></div>',
        answer:dir.name,choices:choices,answerKind:'dir',
        sig:'ar:'+dir.name+':'+lbl.name
      };
    },
    position(colors){
      const isUp=Math.random()>0.5;
      const wordText=isUp?'UP':'DOWN';
      const realPos=isUp?'Down':'Up'; /* word "UP" placed at bottom = answer is "Down" position */
      /* actually: place word at TOP if isUp truly, but the trick: text says one thing, pos says other */
      const placeTop=Math.random()>0.5;
      const ink=SX_pick(colors);
      const answerName=placeTop?'Up':'Down';
      const choices=SX_shuffle([{name:'Up',sym:'\u2191'},{name:'Down',sym:'\u2193'}]);
      const finalChoices=SX_avoidStalePosition(choices,d=>d.name===answerName);
      return{
        html:'<div class="sx-stimulus" style="flex-direction:column;min-height:120px;position:relative;"><div class="sx-pos-word '+(placeTop?'sx-top':'sx-bottom')+'" style="background:'+ink.hex+';color:#fff;border-color:'+ink.hex+';">'+wordText+'</div></div>',
        answer:answerName,choices:finalChoices,answerKind:'pos',
        sig:'po:'+wordText+':'+answerName
      };
    },
    number(colors){
      const digits=[2,3,4,5][Math.floor(Math.random()*4)];
      const ch=String(Math.floor(Math.random()*9)+1);
      const numStr=ch.repeat(digits);
      const ink=SX_pick(colors);
      const ans=String(digits);
      const distractorVals=new Set([ans]);
      while(distractorVals.size<4){
        const v=String(SX_clamp(digits+(Math.floor(Math.random()*5)-2),1,8));
        distractorVals.add(v);
      }
      let choices=Array.from(distractorVals).map(v=>({name:v}));
      choices=SX_avoidStalePosition(SX_shuffle(choices),c=>c.name===ans);
      return{
        html:'<div class="sx-stim"><div class="sx-number" style="color:'+ink.hex+'">'+numStr+'</div></div>',
        answer:ans,choices:choices,answerKind:'count',
        sig:'nu:'+digits+':'+ch
      };
    },
    dual(colors){
      const pool=colors.slice(0,Math.min(colors.length,5));
      const same=Math.random()>0.45;
      const w1=SX_pick(pool);
      const w2pool=pool.filter(c=>c.name!==w1.name);
      const w2=w2pool.length?SX_pick(w2pool):pool[0];
      let i1,i2;
      i1=SX_pick(pool);
      if(same){i2=i1;}
      else{const o=pool.filter(c=>c.name!==i1.name);i2=o.length?SX_pick(o):pool[0];}
      const ans=same?'SAME':'DIFFERENT';
      const choices=SX_avoidStalePosition([{name:'SAME'},{name:'DIFFERENT'}].sort(()=>Math.random()-0.5),c=>c.name===ans);
      return{
        html:'<div class="sx-dual"><div class="sx-dual-word" style="background:'+i1.hex+';color:#fff;">'+w1.name+'</div><div class="sx-dual-vs">VS</div><div class="sx-dual-word" style="background:'+i2.hex+';color:#fff;">'+w2.name+'</div></div>',
        answer:ans,choices:choices,answerKind:'bool',
        pair:'du:'+i1.name+'/'+i2.name,
        sig:'du:'+w1.name+':'+i1.name+':'+w2.name+':'+i2.name+':'+ans
      };
    },
    oddball(colors){
      const a=SX_pickFreshColor(colors);
      const others=colors.filter(c=>c.name!==a.name);
      const b=others.length?SX_pick(others):colors[0];
      const items=[a,a,b];
      const oddIdx=Math.floor(Math.random()*3);
      const arr=[items[0],items[1],items[2]];
      arr[2]=a;arr[oddIdx]=b;
      /* only 1 odd at oddIdx, others = a */
      const final=[a,a,a];final[oddIdx]=b;
      const html='<div class="sx-odd-wrap"><div class="sx-odd-row">'+
        final.map((it,i)=>'<button class="sx-odd-btn" data-odd="'+(i===oddIdx?'1':'0')+'" data-idx="'+i+'" style="background:'+it.hex+'">'+it.letter+'</button>').join('')+
        '</div></div>';
      return{
        html:html,answer:'ODD',choices:[],answerKind:'odd',
        oddIdx:oddIdx,
        sig:'od:'+a.name+':'+b.name+':'+oddIdx
      };
    },
    seqmem(colors){
      const len=2+Math.floor(Math.random()*2);
      const seq=[];
      for(let i=0;i<len;i++)seq.push(SX_pick(colors));
      const wasIn=Math.random()>0.5;
      let probe;
      if(wasIn){probe=SX_pick(seq);}
      else{const out=colors.filter(c=>!seq.find(s=>s.name===c.name));probe=out.length?SX_pick(out):colors[0];}
      const ans=wasIn?'YES':'NO';
      const seqHtml=seq.map(s=>'<span class="sx-seq-chip" style="background:'+s.hex+'">'+s.letter+'</span>').join('');
      const choices=SX_avoidStalePosition(SX_shuffle([{name:'YES'},{name:'NO'}]),c=>c.name===ans);
      return{
        html:'<div class="sx-seq-wrap"><div class="sx-seq-label">SEQUENCE</div><div class="sx-seq-row">'+seqHtml+'</div><div class="sx-seq-probe">Probe: <span class="sx-seq-chip" style="background:'+probe.hex+'">'+probe.letter+'</span></div></div>',
        answer:ans,choices:choices,answerKind:'bool',
        sig:'sq:'+seq.map(s=>s.letter).join('')+':'+probe.name+':'+ans
      };
    },
    split(colors){
      const pool=colors.slice(0,Math.min(colors.length,6));
      const same=Math.random()>0.5;
      const c1=SX_pick(pool);
      const c2=same?c1:(pool.filter(c=>c.name!==c1.name)[0]||pool[0]);
      const w1=SX_pick(pool),w2=SX_pick(pool);
      const ans=same?'SAME':'DIFFERENT';
      const choices=SX_avoidStalePosition(SX_shuffle([{name:'SAME'},{name:'DIFFERENT'}]),c=>c.name===ans);
      return{
        html:'<div class="sx-split"><div class="sx-split-half" style="border-color:'+c1.hex+'"><div class="sx-split-label">LEFT</div><div class="sx-split-word" style="background:'+c1.hex+'">'+w1.name+'</div></div><div class="sx-split-vs">VS</div><div class="sx-split-half" style="border-color:'+c2.hex+'"><div class="sx-split-label">RIGHT</div><div class="sx-split-word" style="background:'+c2.hex+'">'+w2.name+'</div></div></div>',
        answer:ans,choices:choices,answerKind:'bool',
        sig:'sp:'+c1.name+':'+c2.name+':'+ans
      };
    },
    echoprev(colors){
      if(!G.prevAnswer||!SX_COLOR_BY_NAME.get(G.prevAnswer))return Gen.wordink(colors);
      const prevCol=SX_COLOR_BY_NAME.get(G.prevAnswer);
      const same=Math.random()>0.5;
      const cur=same?prevCol:(colors.filter(c=>c.name!==prevCol.name)[0]||prevCol);
      const ans=same?'SAME':'DIFFERENT';
      const choices=SX_avoidStalePosition(SX_shuffle([{name:'SAME'},{name:'DIFFERENT'}]),c=>c.name===ans);
      return{
        html:'<div class="sx-compare"><div class="sx-compare-prev">Previous answer: <span class="sx-seq-chip" style="background:'+prevCol.hex+'">'+prevCol.letter+'</span></div><div class="sx-stim" style="margin-top:10px"><div class="sx-word" style="color:'+cur.hex+'">'+cur.name+'</div></div></div>',
        answer:ans,choices:choices,answerKind:'bool',
        sig:'ep:'+prevCol.name+':'+cur.name+':'+ans
      };
    }
  };

  /* ====================================================================== */
  /*  VARIANT SELECTION                                                     */
  /* ====================================================================== */
  function SX_phase(){
    if(G.round<5)return 0;
    if(G.round<15)return 1;
    if(G.round<30)return 2;
    return 3;
  }
  function SX_eligibleVariants(){
    const phase=SX_phase()+Math.max(0,Adapt.bias);
    return SX_VARIANT_IDS.filter(id=>SX_VARIANTS[id].phaseMin<=phase);
  }
  function SX_pickVariant(){
    /* event override */
    if(G.activeEvent&&G.activeEvent.forceVariant)return G.activeEvent.forceVariant;
    const elig=SX_eligibleVariants();
    /* hard rule: cannot equal last variant */
    const last=Fresh.variants[Fresh.variants.length-1];
    let candidates=elig.filter(v=>v!==last);
    if(!candidates.length)candidates=elig;
    /* recovery rounds: bias toward easy */
    if(G.recoveryRoundsLeft>0)candidates=candidates.filter(v=>SX_VARIANTS[v].phaseMin===0)||candidates;
    if(!candidates||!candidates.length)candidates=elig;
    /* weighted by base weight × recency penalty */
    const items=candidates.map(v=>{
      const recent=Fresh.countIn(Fresh.variants,v,3);
      const w=SX_VARIANTS[v].weight*(1/(1+recent*3));
      return{v:v,w:w};
    });
    return SX_weightedPick(items);
  }

  /* ====================================================================== */
  /*  EVENT SCHEDULER                                                       */
  /* ====================================================================== */
  function SX_maybeEvent(){
    G.activeEvent=null;
    const def=SX_MODES[G.mode];
    if(!def.events)return;
    if(G.eventCooldown>0){G.eventCooldown--;return;}
    if(G.round<5)return;
    /* probability scales with mode */
    let p=G.mode==='speed'?0.18:G.mode==='marathon'?0.13:0.11;
    /* slight uplift if accuracy high */
    if(Adapt.accuracy()>0.85)p+=0.04;
    if(Math.random()>p)return;
    const eligible=SX_EVENT_IDS
      .map(k=>SX_EVENTS[k])
      .filter(e=>e.modes.indexOf(G.mode)>=0&&G.round>=e.minRound);
    if(!eligible.length)return;
    const items=eligible.map(e=>({v:e,w:e.weight}));
    const ev=SX_weightedPick(items);
    G.activeEvent=ev;
    G.eventCooldown=4+Math.floor(Math.random()*3); /* 4-6 round gap */
    SX_haptic([20,40,20]);
    toast(ev.icon+' '+ev.label+' \u2014 '+ev.sub);
  }

  /* ====================================================================== */
  /*  TIMER / SCORE                                                         */
  /* ====================================================================== */
  function SX_timerMs(){
    const def=SX_MODES[G.mode];
    if(def.zen)return 0;
    let t=def.baseTime-G.round*def.timeDecay;
    /* adaptive: bias narrows or widens timer slightly (max ±10%) */
    t*=1-Adapt.bias*0.05;
    if(G.mode==='marathon'&&G.wave>1)t-=G.wave*70;
    if(G.recoveryRoundsLeft>0)t+=400;
    if(G.activeEvent&&G.activeEvent.timer)return Math.min(t,G.activeEvent.timer);
    return SX_clamp(Math.round(t),def.minTime,def.baseTime);
  }
  function SX_scoreMult(){
    let m=SX_MODES[G.mode].scoreMult;
    /* combo curve — fixed (no unreachable branches) */
    if(G.combo>=10)m*=2.0;
    else if(G.combo>=7)m*=1.6;
    else if(G.combo>=4)m*=1.3;
    else if(G.combo>=2)m*=1.1;
    /* speed-mode amp: extra +50% above streak 5 */
    if(SX_MODES[G.mode].combo==='amp'&&G.combo>=5)m*=1.5;
    if(SX_MODES[G.mode].combo==='soft')m=Math.min(m,1);
    if(G.activeEvent&&G.activeEvent.mult)m*=G.activeEvent.mult;
    return m;
  }

  /* ====================================================================== */
  /*  RENDER: START SCREEN                                                  */
  /* ====================================================================== */
  function renderStart(){
    body.innerHTML='';
    const best=S('nz_stroop_best')||0;
    const games=S('nz_stroop_games')||0;
    const bestCombo=S('nz_stroop_best_combo')||0;
    const screen=$('<div class="sx-start">'+
      '<div class="sx-hero">'+
        '<div class="sx-hero-em">\uD83C\uDFA8</div>'+
        '<h2 style="margin:4px 0 4px;font-size:22px;">Color Stroop Xtreme</h2>'+
        '<p class="sx-hero-sub">'+SX_VARIANT_IDS.length+' variants \u00B7 6 events \u00B7 adaptive engine</p>'+
        (best?'<div class="sx-best-chip">\uD83C\uDFC6 Best: '+best+' pts \u00B7 \uD83D\uDD25 '+bestCombo+'x combo</div>':'')+
      '</div>'+
      '<div class="sx-sel-title">Choose mode</div>'+
      '<div class="sx-modes" id="sxModes"></div>'+
      '<div class="sx-rules-card"><div class="sx-rules-title">\uD83D\uDCD6 How to Play</div>'+
        '<div class="sx-rules-text" id="sxRulesText">Top chip ko padho \u2014 turant samajh aa jayega kya tap karna hai. Streak banakar combo multiplier badhao!</div>'+
      '</div>'+
      '<button class="sx-start-btn" id="sxGo">Start Game \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#sxModes');
    Object.keys(SX_MODES).forEach(k=>{
      const m=SX_MODES[k];
      const card=$('<button class="sx-mode-card '+(k===G.mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sx-mode-em">'+m.emoji+'</div>'+
        '<div class="sx-mode-info"><div class="sx-mode-name">'+m.label+'</div><div class="sx-mode-sub">'+m.sub+'</div></div>'+
        '<div class="sx-mode-check">'+(k===G.mode?'\u2713':'')+'</div>'+
      '</button>');
      card.onclick=()=>{
        playSound('tap');G.mode=k;
        modesEl.querySelectorAll('.sx-mode-card').forEach(c=>{
          c.classList.toggle('sel',c.dataset.m===k);
          const chk=c.querySelector('.sx-mode-check');
          if(chk)chk.textContent=c.dataset.m===k?'\u2713':'';
        });
        const rules={
          classic:'Classic Stroop training. 3 lives, balanced events, all variants unlock gradually.',
          speed:'Fast 2s timer, 1.5\u00D7 base score, combo amp at streak 5+. Lightning more frequent.',
          marathon:'5 lives, 8-round waves. Checkpoints reward +1 life and a recovery dip.',
          zen:'No timer, no fail. Per-answer explanations. Hard events disabled.'
        };
        screen.querySelector('#sxRulesText').textContent=rules[k]||rules.classic;
      };
      modesEl.appendChild(card);
    });
    screen.querySelector('#sxGo').onclick=()=>{
      playSound('tap');
      setS('nz_stroop_v3_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ====================================================================== */
  /*  GAME LIFECYCLE                                                        */
  /* ====================================================================== */
  function startGame(){
    const def=SX_MODES[G.mode];
    G.round=0;G.score=0;G.lives=def.lives;G.maxLives=def.lives;
    G.combo=0;G.maxCombo=0;
    G.wave=1;G.roundsInWave=0;
    G.activeEvent=null;G.eventCooldown=0;
    G.prevAnswer=null;G.prevVariant=null;G.prevQ=null;
    G.pending=false;G.recoveryRoundsLeft=0;
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="sx-host" id="sxHost"></div>');
    body.appendChild(host);
    setScore(0);
    nextRound();
  }

  function _waveTick(){
    if(G.mode!=='marathon')return;
    G.roundsInWave++;
    const wl=SX_MODES.marathon.waveLen;
    if(G.roundsInWave>=wl){
      G.wave++;G.roundsInWave=0;
      const checkpoints=[2,4,7,11];
      const isCheck=checkpoints.indexOf(G.wave)>=0;
      if(G.lives<G.maxLives)G.lives++;
      if(isCheck){
        G.recoveryRoundsLeft=2;
        toast('\uD83C\uDF0A Wave '+G.wave+' \u00B7 Checkpoint! +1 life, recovery x2');
      }else{
        toast('\uD83C\uDF0A Wave '+G.wave+' begins \u2014 +1 life');
      }
      SX_haptic([15,40,15,40]);
    }
  }

  function nextRound(){
    if(G.lives<=0||G.pending)return;
    G.pending=false;
    _waveTick();
    SX_maybeEvent();
    const colors=SX_getColors();
    let variantId=SX_pickVariant();
    let qData=Gen[variantId]?Gen[variantId](colors):Gen.wordink(colors);
    /* signature collision check — regenerate up to 4 times */
    let tries=0;
    while(Fresh.sigs.indexOf(qData.sig)>=0&&tries<4){
      qData=Gen[variantId]?Gen[variantId](colors):Gen.wordink(colors);
      tries++;
    }
    /* color-pair dedupe (soft): if pair seen recently, regenerate once */
    if(qData.pair&&Fresh.countIn(Fresh.pairs,qData.pair,3)>=1){
      const alt=Gen[variantId]?Gen[variantId](colors):null;
      if(alt&&alt.pair!==qData.pair)qData=alt;
    }
    Fresh.add(Fresh.variants,variantId,Fresh.maxV);
    Fresh.add(Fresh.answers,qData.answer,Fresh.maxA);
    Fresh.add(Fresh.sigs,qData.sig,Fresh.maxSig);
    if(qData.pair)Fresh.add(Fresh.pairs,qData.pair,Fresh.maxP);
    /* track correct-answer position for stale-position avoidance */
    if(qData.choices&&qData.choices.length){
      const idx=qData.choices.findIndex(c=>c.name===qData.answer);
      if(idx>=0)Fresh.add(Fresh.posIdx,idx,Fresh.maxPos);
    }else if(typeof qData.oddIdx==='number'){
      Fresh.add(Fresh.posIdx,qData.oddIdx,Fresh.maxPos);
    }
    G.qData=qData;G.prevVariant=variantId;
    G.timerMs=SX_timerMs();
    G.mult=SX_scoreMult();
    G.roundStart=Date.now();G.roundOffPause=0;
    if(G.recoveryRoundsLeft>0)G.recoveryRoundsLeft--;
    renderRound(variantId,qData);
  }

  /* ====================================================================== */
  /*  RENDER: ROUND                                                         */
  /* ====================================================================== */
  function renderRound(variantId,qData){
    const v=SX_VARIANTS[variantId];
    const ev=G.activeEvent;
    const optCount=qData.choices?qData.choices.length:0;
    const optGrid=optCount<=2?'sx-opts-2':optCount===3?'sx-opts-3':'sx-opts-4';
    const heartsHtml=renderHearts();
    const eventHtml=ev?'<div class="sx-event-banner" style="background:linear-gradient(135deg,'+v.hue+',#F59E0B);">'+ev.icon+' '+ev.label+' \u00B7 <span class="sx-event-sub">'+ev.sub+'</span></div>':'';
    const taskChipHtml='<div class="sx-task-chip" style="background:'+v.hue+';"><span class="sx-task-icon">'+v.chipIcon+'</span><span class="sx-task-text">'+v.chipText+'</span></div>';
    const waveHtml=G.mode==='marathon'?'<span class="sx-wave-badge">\uD83C\uDF0A W'+G.wave+'</span>':'';
    const comboHtml=G.combo>=3?'<span class="sx-combo-badge">\uD83D\uDD25 '+G.combo+'x</span>':'';
    const accBadge=Adapt.win.length>=5?'<span class="sx-acc-mini">'+Math.round(Adapt.accuracy()*100)+'%</span>':'';

    let optsHtml='';
    if(qData.choices&&qData.choices.length){
      optsHtml='<div class="sx-opts '+optGrid+'" id="sxOpts">'+
        qData.choices.map(c=>{
          const colorRef=SX_COLOR_BY_NAME.get(c.name);
          if(colorRef){
            return '<button class="sx-opt sx-opt-color" data-name="'+SX_escape(c.name)+'" style="background:'+colorRef.hex+';color:#fff;border:none;text-shadow:0 2px 8px rgba(0,0,0,.3);box-shadow:0 4px 14px '+colorRef.hex+'55;"><span class="sx-opt-letter-cb">'+colorRef.letter+'</span> '+SX_escape(c.name)+'</button>';
          }
          const sym=c.sym?c.sym+' ':'';
          return '<button class="sx-opt" data-name="'+SX_escape(c.name)+'">'+sym+SX_escape(c.name)+'</button>';
        }).join('')+
      '</div>';
    }

    host.innerHTML=
      (G.timerMs>0?'<div class="timer-bar"><div class="timer-fill timer-green" id="sBar" style="width:100%"></div></div>':'')+
      '<div class="sx-hud">'+
        '<div class="sx-hud-left">'+waveHtml+'</div>'+
        '<div class="sx-hud-right">'+comboHtml+accBadge+'<span class="sx-round-num">R'+(G.round+1)+'</span></div>'+
      '</div>'+
      heartsHtml+
      eventHtml+
      taskChipHtml+
      '<div class="sx-helper">'+v.helper+'</div>'+
      '<div class="sx-stim-wrap" id="sxStimWrap">'+qData.html+'</div>'+
      optsHtml+
      '<div class="sx-score-line">Score <strong>'+G.score+'</strong>'+(G.mult>1?' \u00B7 \u00D7'+G.mult.toFixed(1)+' pts':'')+'</div>';

    /* Ghost event: fade stimulus after 1s */
    if(ev&&ev.ghost){
      const stim=host.querySelector('#sxStimWrap');
      if(stim){
        if(G.ghostT){_cti(G.ghostT);G.ghostT=null;}
        G.ghostT=_st(()=>{stim.classList.add('sx-ghost-fade');},1000);
      }
    }
    /* Focus Lock: dim helper */
    if(ev&&ev.focus){
      const helper=host.querySelector('.sx-helper');
      if(helper)helper.classList.add('sx-helper-dim');
    }

    _bindAnswers(variantId,qData);
    _startTimer(qData);
  }

  function _bindAnswers(variantId,qData){
    if(variantId==='oddball'){
      host.querySelectorAll('.sx-odd-btn').forEach(b=>{
        b.onclick=()=>{
          if(b.disabled)return;
          host.querySelectorAll('.sx-odd-btn').forEach(x=>x.disabled=true);
          if(G.barT){_cti(G.barT);G.barT=null;}
          const ms=Date.now()-G.roundStart-G.roundOffPause;
          if(b.dataset.odd==='1')onCorrect(qData,ms,b);
          else onWrong(qData,b);
        };
      });
      return;
    }
    host.querySelectorAll('.sx-opt').forEach(b=>{
      b.onclick=()=>{
        if(b.disabled)return;
        host.querySelectorAll('.sx-opt').forEach(x=>x.disabled=true);
        if(G.barT){_cti(G.barT);G.barT=null;}
        const ms=Date.now()-G.roundStart-G.roundOffPause;
        if(b.dataset.name===qData.answer)onCorrect(qData,ms,b);
        else onWrong(qData,b);
      };
    });
  }

  function _startTimer(qData){
    if(G.timerMs<=0)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    G.barT=_si(()=>{
      const elapsed=Date.now()-G.roundStart-G.roundOffPause;
      const pct=Math.max(0,100-elapsed/G.timerMs*100);
      const bar=wrap.querySelector('#sBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=G.timerMs){_cti(G.barT);G.barT=null;onTimeout(qData);}
    },80);
  }
  function _resumeTimer(){
    if(G.timerMs>0&&!G.barT&&!G.pending&&host)_startTimer(G.qData);
  }

  function renderHearts(){
    if(SX_MODES[G.mode].zen)return '<div class="sx-zen-badge">\uD83E\uDDD8 Zen \u2014 no pressure</div>';
    const max=G.maxLives;
    if(G.mode==='marathon'){
      return '<div class="sx-hearts-row">'+Array.from({length:max},(_,i)=>'<span class="wx-heart '+(i>=G.lives?'lost':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'<span class="sx-lives-count">'+G.lives+'/'+max+'</span></div>';
    }
    return '<div class="wc-hearts">'+Array.from({length:Math.min(max,3)},(_,i)=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';
  }

  /* ====================================================================== */
  /*  RESPONSE HANDLERS                                                     */
  /* ====================================================================== */
  function onCorrect(qData,ms,btn){
    playSound('correct');SX_haptic(10);
    if(btn)btn.classList.add('sx-correct');
    Adapt.record(true,ms,G.timerMs||3000);
    const tref=G.timerMs||3000;
    const fast=ms<tref*0.30?1.5:ms<tref*0.55?1.25:1;
    const pts=Math.max(1,Math.round(2*G.mult*fast));
    G.combo++;if(G.combo>G.maxCombo)G.maxCombo=G.combo;
    G.score+=pts;setScore(G.score);
    G.prevAnswer=qData.answer;G.prevQ=qData;
    const popup=$('<div class="sx-pts-popup" style="color:#22C55E;">+'+pts+(fast>1?' \u26A1':'')+'</div>');
    document.body.appendChild(popup);_st(()=>popup.remove(),900);
    if(G.combo===3)SX_showCombo('\uD83D\uDD25 HOT STREAK x3');
    else if(G.combo===5)SX_showCombo('\u26A1 BRAIN ON FIRE x5');
    else if(G.combo===8)SX_showCombo('\uD83C\uDF1F UNSTOPPABLE x8');
    else if(G.combo===10)SX_showCombo('\uD83D\uDC51 FLOW STATE x10');
    else if(G.combo===15)SX_showCombo('\uD83D\uDCA5 GODLIKE x15');
    G.round++;
    _st(nextRound,SX_MODES[G.mode].zen?700:430);
  }

  function onWrong(qData,btn){
    playSound('wrong');SX_haptic([20,40,20]);
    Adapt.record(false,Date.now()-G.roundStart-G.roundOffPause,G.timerMs||3000);
    if(btn)btn.classList.add('sx-wrong');
    G.combo=0;
    /* mark correct */
    host.querySelectorAll('.sx-opt').forEach(x=>{
      if(x.dataset.name===qData.answer)x.classList.add('sx-correct');
    });
    if(qData.answerKind==='odd'){
      host.querySelectorAll('.sx-odd-btn').forEach(x=>{
        if(x.dataset.odd==='1')x.style.outline='3px solid #22C55E';
      });
    }
    /* Zen explanation */
    if(SX_MODES[G.mode].zen){
      const exp=$('<div class="sx-explain sx-explain-wrong">\uD83D\uDCA1 Sahi answer: <strong>'+SX_escape(qData.answer)+'</strong></div>');
      host.appendChild(exp);
      G.round++;_st(nextRound,1500);
      return;
    }
    host.appendChild($('<div class="sx-last-hint" style="color:#EF4444;">\u274C Answer: '+SX_escape(qData.answer)+'</div>'));
    const dead=_loseLife();
    if(!dead){G.round++;_st(nextRound,800);}
  }

  function onTimeout(qData){
    playSound('wrong');SX_haptic(50);
    Adapt.record(false,G.timerMs,G.timerMs||3000);
    G.combo=0;
    host.querySelectorAll('.sx-opt').forEach(x=>{
      if(x.dataset.name===qData.answer)x.classList.add('sx-correct');
      x.disabled=true;
    });
    host.querySelectorAll('.sx-odd-btn').forEach(x=>x.disabled=true);
    host.appendChild($('<div class="sx-last-hint">\u23F1 Time! Answer: '+SX_escape(qData.answer)+'</div>'));
    const dead=_loseLife();
    if(!dead){G.round++;_st(nextRound,900);}
  }

  function _loseLife(){
    if(SX_MODES[G.mode].zen)return false;
    if(G.activeEvent&&G.activeEvent.noLife){G.activeEvent=null;toast('\uD83D\uDEE1\uFE0F Immunity used \u2014 no life lost'); return false;}
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    if(G.lives<=0){_st(gameOver,700);return true;}
    return false;
  }

  /* ====================================================================== */
  /*  COMBO BANNER                                                          */
  /* ====================================================================== */
  function SX_showCombo(text){
    const banner=$('<div class="sx-combo-banner">'+text+'</div>');
    document.body.appendChild(banner);
    _st(()=>{banner.classList.add('sx-combo-out');},900);
    _st(()=>banner.remove(),1450);
  }

  /* ====================================================================== */
  /*  GAME OVER                                                             */
  /* ====================================================================== */
  function gameOver(){
    _cleanup();
    const record=S('nz_stroop_best')||0;
    const recordCombo=S('nz_stroop_best_combo')||0;
    const newPB=G.score>record;
    const newComboPB=G.maxCombo>recordCombo;
    if(newPB)setS('nz_stroop_best',G.score);
    if(newComboPB)setS('nz_stroop_best_combo',G.maxCombo);
    setS('nz_stroop_games',(S('nz_stroop_games')||0)+1);
    if(newPB)confetti(50);
    const def=SX_MODES[G.mode];
    const acc=Adapt.win.length?Math.round(Adapt.accuracy()*100):0;
    const avgRT=Adapt.win.length?Math.round(Adapt.avgRT()):0;
    end({
      title:newPB?'New Best! \uD83C\uDFC6':'Game Over',
      emoji:def.emoji,
      sub:G.score+' pts \u00B7 '+G.round+' rounds \u00B7 '+def.emoji+' '+def.label,
      value:G.score,
      points:G.score>=35?45:G.score>=22?30:G.score>=10?18:8,
      starThresh:G.mode==='marathon'?[60,140,280]:G.mode==='speed'?[50,110,200]:[40,80,140],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Score</span><span class="val">'+G.score+'</span></div>'+
        '<div class="row"><span>Rounds</span><span class="val">'+G.round+'</span></div>'+
        '<div class="row"><span>Max Combo</span><span class="val">'+G.maxCombo+'x'+(newComboPB?' \uD83C\uDFC6':'')+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+acc+'%</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+avgRT+' ms</span></div>'+
        '<div class="row"><span>Mode</span><span class="val">'+def.emoji+' '+def.label+'</span></div>'+
        (G.mode==='marathon'?'<div class="row"><span>Waves Survived</span><span class="val">'+G.wave+'</span></div>':'')+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(G.score,record)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+(newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  /* ---------- BOOT ------------------------------------------------------ */
  renderStart();
}
