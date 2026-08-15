/* ===================== QUICK MATH v3 — procedural mental-math engine =====================
 *  Entry: playMath(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed QM_ to avoid collisions with the other 9 games.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
 *  CSS prefix preserved: .qm- (and reuses .math-opt for compatibility).
 *  localStorage keys preserved: nz_qm_best_score, nz_qm_games, nz_qm_best_streak,
 *                               nz_qm_accuracy, nz_qm_daily_date, nz_qm_daily_done
 *  New additive keys: nz_qm_skill, nz_qm_v3_seen
 * ============================================================================ */

/* ---------- MODES (data) ---------- */
const QM_MODES={
  easy   :{label:'Easy',          emoji:'\uD83D\uDFE2',sub:'Add / subtract \u00B7 missing',  baseTime:4500,minTime:2500,decay:40,lives:3,zen:false,budget:[0.9,1.1,1.3,1.5,1.7],pace:1.25,families:['arith','missing'],         opMix:['+','-'],         eventRate:1.0},
  medium :{label:'Medium',        emoji:'\uD83D\uDFE1',sub:'All 4 ops \u00B7 balance + reverse',baseTime:3000,minTime:1800,decay:25, lives:3,zen:false,budget:[1.2,1.5,1.8,2.0,2.2],pace:1.1,families:['arith','missing','balance','reverse'],opMix:['+','-','\u00D7','\u00F7'],eventRate:1.0},
  hard   :{label:'Hard',          emoji:'\uD83D\uDD34',sub:'Multi-step \u00B7 compare',     baseTime:2500,minTime:1500,decay:20, lives:3,zen:false,budget:[1.6,1.9,2.2,2.5,2.8],pace:0.95,families:['arith','multistep','balance','reverse','compare'],opMix:['+','-','\u00D7','\u00F7'],eventRate:1.1},
  algebra:{label:'Algebra',       emoji:'\u26A1',         sub:'Solve for x \u00B7 reverse',  baseTime:3200,minTime:2000,decay:20, lives:3,zen:false,budget:[1.8,2.1,2.4,2.7,3.0],pace:1.1,families:['algebra','reverse','balance'],opMix:['+','-','\u00D7'],eventRate:0.8},
  zen    :{label:'Zen',           emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 explanations',baseTime:0,   minTime:0,   decay:0,  lives:99,zen:true, budget:[1.3,1.7,2.1,2.5,2.9],pace:1.0,families:['arith','missing','balance','reverse','multistep'],opMix:['+','-','\u00D7','\u00F7'],eventRate:0},
  blitz  :{label:'Speed Blitz',   emoji:'\uD83D\uDCA8',sub:'1.4s arithmetic only',         baseTime:1400,minTime:1000,decay:0,  lives:3,zen:false,budget:[0.8,0.9,1.0,1.1,1.2],pace:0.8,families:['arith'],                    opMix:['+','-','\u00D7'],eventRate:0.6},
  memory :{label:'Memory Math',   emoji:'\uD83E\uDDE0',sub:'Question hides \u2014 answer from memory',baseTime:4000,minTime:2400,decay:25,lives:3,zen:false,budget:[1.0,1.2,1.4,1.6,1.8],pace:1.35,families:['arith','multistep'], opMix:['+','-','\u00D7','\u00F7'],eventRate:0.5,alwaysHide:true},
  chaos  :{label:'Survival Chaos',emoji:'\uD83C\uDF2A\uFE0F',sub:'Mixed \u00B7 events frequent',baseTime:3000,minTime:1700,decay:25,lives:3,zen:false,budget:[1.4,1.7,2.0,2.3,2.6],pace:1.05,families:['arith','missing','balance','reverse','multistep','compare','sense','algebra'],opMix:['+','-','\u00D7','\u00F7'],eventRate:2.5}
};
const QM_MODE_ORDER=['easy','medium','hard','algebra','zen','blitz','memory','chaos'];

/* ---------- FAMILIES (data) ---------- */
const QM_FAMILIES={
  arith    :{id:'arith',    label:'ARITHMETIC', icon:'\u2795',       hue:'#4F8EF7',weight:1.0,phaseMin:0,minBoost:1.0},
  missing  :{id:'missing',  label:'MISSING NUM',icon:'\u2754',       hue:'#7C3AED',weight:0.9,phaseMin:0,minBoost:1.1},
  balance  :{id:'balance',  label:'BALANCE',    icon:'\u2696\uFE0F',hue:'#F472B6',weight:0.85,phaseMin:1,minBoost:1.2},
  reverse  :{id:'reverse',  label:'REVERSE',    icon:'\u21BA',       hue:'#34D399',weight:0.85,phaseMin:1,minBoost:1.2},
  multistep:{id:'multistep',label:'MULTI-STEP', icon:'\uD83D\uDD22',hue:'#F97316',weight:0.85,phaseMin:1,minBoost:1.4},
  compare  :{id:'compare',  label:'COMPARE',    icon:'\u2696',       hue:'#06B6D4',weight:0.7, phaseMin:1,minBoost:1.0},
  sense    :{id:'sense',    label:'NUMBER SENSE',icon:'\uD83C\uDFAF',hue:'#A855F7',weight:0.65,phaseMin:1,minBoost:1.0},
  algebra  :{id:'algebra',  label:'ALGEBRA',    icon:'\uD835\uDC65', hue:'#EF4444',weight:0.75,phaseMin:2,minBoost:1.5}
};
const QM_FAMILY_IDS=Object.keys(QM_FAMILIES);

/* ---------- EVENTS (data) ---------- */
const QM_EVENTS={
  lightning:{id:'lightning',icon:'\u26A1',         label:'LIGHTNING',     sub:'1.2s \u00B7 3\u00D7 pts',timer:1200,mult:3,minQ:8, force:['arith']},
  comboBoost:{id:'comboBoost',icon:'\uD83D\uDD25',label:'COMBO BOOST',   sub:'2\u00D7 pts',mult:2,minQ:6},
  mem      :{id:'mem',      icon:'\uD83E\uDDE0',   label:'MEMORY MATH',   sub:'Hide & recall \u00B7 2.5\u00D7',mult:2.5,minQ:10,memHide:true},
  precision:{id:'precision',icon:'\uD83C\uDFAF',   label:'PRECISION',     sub:'Smaller \u00B7 trickier \u00B7 2\u00D7',mult:2,minQ:12,force:['missing','balance']},
  reverse  :{id:'reverse',  icon:'\u21BA',          label:'REVERSE ROUND', sub:'Solve backward \u00B7 2\u00D7',mult:2,minQ:10,force:['reverse']},
  chain    :{id:'chain',    icon:'\uD83D\uDD17',   label:'CHAIN ROUND',   sub:'Result feeds next \u00B7 2\u00D7',mult:2,minQ:12,chain:true,force:['arith']},
  suddenSolve:{id:'suddenSolve',icon:'\uD83D\uDCA5',label:'SUDDEN SOLVE',sub:'Half timer \u00B7 +5 pts \u00B7 -1 life on miss',timerMul:0.5,fixedReward:5,minQ:15,bounded:true}
};
const QM_EVENT_IDS=Object.keys(QM_EVENTS);

/* ---------- MENTAL-LOAD MODEL ----------
 * Single source of truth for "how hard is this question, really?".
 * Returns an estimate, in SECONDS, of how long a competent mental-math
 * player needs. Both the question generators and the timer read from
 * this, which is what keeps the two in sync.
 *
 * Why it exists: difficulty used to be an accident of unbounded operand
 * growth. Numbers grew every phase while the timer shrank every question,
 * so late rounds served things like "128 = 200 - ?" (a 3-digit double-borrow
 * subtraction, ~4s of work) inside a 1.9s window. Digit count alone is a
 * bad proxy -- 200-142 is far harder than 250-120 despite identical size --
 * so the model charges for the things that actually cost thought: carries,
 * borrows, and factors outside the times table.
 */
function QM_digits(n){return String(Math.abs(n)).length;}
function QM_carries(a,b){
  let c=0,carry=0;a=Math.abs(a);b=Math.abs(b);
  while(a>0||b>0){const s=(a%10)+(b%10)+carry;carry=s>=10?1:0;if(carry)c++;a=Math.floor(a/10);b=Math.floor(b/10);}
  return c;
}
function QM_borrows(a,b){
  let c=0,borrow=0;a=Math.abs(a);b=Math.abs(b);
  while(b>0||borrow){const d=(a%10)-(b%10)-borrow;borrow=d<0?1:0;if(borrow)c++;a=Math.floor(a/10);b=Math.floor(b/10);}
  return c;
}
/* Round operands (10, 50, 100...) are nearly free to work with. */
function QM_roundBonus(n){return n%100===0?-0.35:n%10===0?-0.25:n%5===0?-0.1:0;}
function QM_costAdd(a,b){
  return Math.max(0.4,0.5+0.3*(QM_digits(a)+QM_digits(b)-2)+0.5*QM_carries(a,b)
    +QM_roundBonus(a)+QM_roundBonus(b));
}
function QM_costSub(a,b){
  return Math.max(0.4,0.55+0.3*(QM_digits(a)+QM_digits(b)-2)+0.7*QM_borrows(a,b)
    +QM_roundBonus(a)+QM_roundBonus(b));
}
function QM_costMul(a,b){
  const hi=Math.max(Math.abs(a),Math.abs(b)),lo=Math.min(Math.abs(a),Math.abs(b));
  if(lo<=1||hi<=1)return 0.35;
  if(lo<=10&&hi<=10)return 0.7;                     /* times table */
  if(lo<=12&&hi<=12)return 0.95;                    /* extended table */
  if(lo<=5&&hi<=20)return 1.2;                      /* small x teen */
  if(lo<=9&&hi<=20)return 1.5+(hi%10>5?0.25:0);
  if(lo<=9)return 1.8+0.45*(QM_digits(hi)-2)+QM_roundBonus(hi);
  return 3.4;                                        /* 2-digit x 2-digit */
}
function QM_costDiv(a,b){
  const q=Math.abs(a)/Math.abs(b);
  if(b<=10&&q<=10)return 0.85;
  if(b<=12&&q<=12)return 1.2;
  if(b<=12)return 1.7+QM_roundBonus(a);
  return 2.4;
}

/* ---------- helpers (top-level, all QM_-prefixed) ---------- */
function QM_rand(n){return Math.floor(Math.random()*n);}
function QM_rrand(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function QM_pick(a){return a[Math.floor(Math.random()*a.length)];}
function QM_clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;}
function QM_shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=QM_rand(i+1);const t=x[i];x[i]=x[j];x[j]=t;}return x;}
function QM_haptic(p){try{if(navigator&&navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function QM_weightedPick(items){
  let total=0;for(let i=0;i<items.length;i++)total+=items[i].w;
  if(total<=0)return items[0]&&items[0].v;
  let r=Math.random()*total;
  for(let i=0;i<items.length;i++){r-=items[i].w;if(r<=0)return items[i].v;}
  return items[items.length-1].v;
}
function QM_sigStem(sig){
  /* strip variable operand values, keep family/operator stem */
  return sig.replace(/=[-+]?\d+/g,'=_').replace(/\|\d+/g,'|_').replace(/[?]?\d+/g,'_');
}
function QM_dailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Answer 20 questions correctly',target:20},
    {label:'Reach a 10 answer streak',target:10,streak:true},
    {label:'Answer 30 questions correctly',target:30},
    {label:'Score 25+ in one run',target:25},
    {label:'Reach a 12 answer streak',target:12,streak:true}
  ];
  return defs[dayN%defs.length];
}
function QM_dailyDone(){return S('nz_qm_daily_date')===todayKey()&&!!S('nz_qm_daily_done');}
function QM_rank(score){
  if(score>=40)return{em:'\uD83D\uDC51',txt:'Math Legend'};
  if(score>=30)return{em:'\u26A1',         txt:'Lightning Brain'};
  if(score>=20)return{em:'\uD83E\uDDE0',txt:'Math Wizard'};
  if(score>=10)return{em:'\uD83D\uDCAA',txt:'Getting Sharper'};
  return{em:'\uD83C\uDF31',txt:'Keep Practicing'};
}

/* ====================================================================== */
function playMath(body,setScore,end,wrap,startClock){
  let mode='easy';

  /* per-game state */
  const G={
    q:0,score:0,attempts:0,correctCount:0,
    lives:3,streak:0,bestStreak:0,combo:1,
    barT:null,qStart:0,qOffPause:0,timerMs:0,
    activeEvent:null,eventCooldown:0,
    chainCarry:null, /* numeric value forwarded to next round when Chain event active */
    skill:Object.fromEntries(QM_FAMILY_IDS.map(f=>[f,{n:0,ok:0,ms:0}])),
    pending:false
  };

  const Fresh={
    families:[],   maxF:8,
    sigs:[],       maxSig:30,
    sigStems:[],   maxStem:6,
    answers:[],    maxA:8,
    correctPos:[], maxPos:8,
    distrStyles:[],maxDS:6,
    add(buf,k,cap){buf.push(k);if(buf.length>cap)buf.shift();},
    countIn(buf,k,n){let c=0;const start=Math.max(0,buf.length-n);for(let i=start;i<buf.length;i++)if(buf[i]===k)c++;return c;},
    has(buf,k){return buf.indexOf(k)>=0;},
    clear(){this.families=[];this.sigs=[];this.sigStems=[];this.answers=[];this.correctPos=[];this.distrStyles=[];}
  };

  const Adapt={
    win:[],winSize:8,bias:0,recoveryRoundsLeft:0,
    record(correct,ms,timerMs,familyId,cost){
      this.win.push({c:correct?1:0,ms:ms||0,t:timerMs||3000,fam:familyId,cost:cost||1});
      if(this.win.length>this.winSize)this.win.shift();
      G.skill[familyId].n++;
      if(correct)G.skill[familyId].ok++;
      G.skill[familyId].ms+=(ms||0);
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(const e of this.win){acc+=e.c;rt+=e.ms;tref+=e.t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.55)this.bias=QM_clamp(this.bias+1,-2,2);
      else if(acc<0.6){this.bias=QM_clamp(this.bias-1,-2,2);if(this.recoveryRoundsLeft<=0)this.recoveryRoundsLeft=2;}
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(const e of this.win)a+=e.c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(const e of this.win)r+=e.ms;return r/this.win.length;},
    reset(){this.win=[];this.bias=0;this.recoveryRoundsLeft=0;}
  };

  /* visibility pause */
  let _hidTs=0;
  const _onVis=()=>{
    if(document.hidden){_hidTs=Date.now();if(G.barT){_cti(G.barT);G.barT=null;}}
    else if(_hidTs){G.qOffPause+=Date.now()-_hidTs;_hidTs=0;_resumeBar();}
  };
  document.addEventListener('visibilitychange',_onVis);
  function _cleanup(){
    document.removeEventListener('visibilitychange',_onVis);
    if(G.barT){_cti(G.barT);G.barT=null;}
    if(wrap)wrap.classList.remove('fire-glow');
  }
  wrap.addEventListener('remove_game',_cleanup);

  /* ====================================================================== */
  /*  SCALING                                                               */
  /* ====================================================================== */
  function QM_phase(){
    if(G.score<5)return 0;
    if(G.score<12)return 1;
    if(G.score<22)return 2;
    if(G.score<35)return 3;
    return 4;
  }
  function QM_scale(){
    const p=QM_phase()+QM_clamp(Adapt.bias,-1,2); /* small recovery, larger growth */
    /* (a,b) = max-operand by phase. Operand growth is deliberately gentle:
       the real difficulty knob is QM_budget() below, not raw digit count.
       Capped at 99 so a question is never a 3-digit borrow chain. */
    const tiers=[{a:9,b:9,big:12},{a:18,b:9,big:22},{a:30,b:10,big:40},{a:50,b:11,big:60},{a:75,b:12,big:90}];
    return tiers[QM_clamp(p,0,4)];
  }

  /* ----------------------------------------------------------------------
   * DIFFICULTY BUDGET
   * The maximum estimated mental-work time (seconds) a question may cost
   * in the current mode + phase. Generators sample against this, so a
   * question can never outgrow the timer that will be shown with it.
   * -------------------------------------------------------------------- */
  function QM_budget(){
    const m=QM_MODES[mode];
    const p=QM_clamp(QM_phase()+QM_clamp(Adapt.bias,-1,1),0,4);
    const base=m.budget||[1.1,1.5,1.9,2.2,2.5];
    let b=base[p];
    /* Struggling players get an easier pool immediately. */
    if(Adapt.bias<=-1)b*=0.8;
    if(Adapt.recoveryRoundsLeft>0)b*=0.8;
    return b;
  }

  /* Reject-and-resample a generator until it produces a question inside
     the budget. Falls back to the cheapest candidate seen, so this can
     never fail to return a question. */
  function QM_fit(genFn,budget){
    let cheapest=null;
    for(let i=0;i<14;i++){
      const q=genFn();
      if(!q)continue;
      const c=typeof q.cost==='number'?q.cost:1.5;
      if(c<=budget)return q;
      if(!cheapest||c<cheapest.cost)cheapest=q;
    }
    return cheapest;
  }

  /* ====================================================================== */
  /*  GENERATORS                                                            */
  /*  Each returns: { display, correct, sig, family, complexityCost,        */
  /*    distrStyle, answerKind, hint, memHide?, opts?, answerIdx? }         */
  /*  opts/answerIdx are filled in by buildOptions() unless the gen owns it */
  /* ====================================================================== */
  const Gen={
    arith(){
      const sc=QM_scale();
      const m=QM_MODES[mode];
      const op=QM_pick(m.opMix);
      let a,b,correct,disp,cost;
      if(op==='+'){
        a=QM_rrand(2,sc.a);b=QM_rrand(2,sc.a);correct=a+b;disp=a+' + '+b;
        cost=QM_costAdd(a,b);
      }
      else if(op==='-'){
        /* Minuend stays within the tier instead of stacking two rolls,
           which is what used to produce 3-digit borrow chains. */
        a=QM_rrand(5,sc.a);b=QM_rrand(2,Math.max(3,a-1));correct=a-b;disp=a+' \u2212 '+b;
        cost=QM_costSub(a,b);
      }
      else if(op==='\u00D7'){
        /* keep one factor ≤9 so it's mentally tractable; cap big factor at 12 max */
        const big=QM_rrand(2,Math.min(sc.b,12));
        const small=QM_rrand(2,Math.min(9,sc.b));
        a=big;b=small;correct=a*b;disp=a+' \u00D7 '+b;
        cost=QM_costMul(a,b);
      }
      else{ /* ÷ — always exact, divisor ≤9, quotient ≤12 */
        const d=QM_rrand(2,Math.min(9,sc.b)),q=QM_rrand(2,Math.min(sc.b,12));
        a=d*q;b=d;correct=q;disp=a+' \u00F7 '+d;
        cost=QM_costDiv(a,d);
      }
      const tier=op==='\u00D7'||op==='\u00F7'?2:1;
      return{display:disp,correct:correct,sig:'arith|'+op+'|'+a+'|'+b,family:'arith',complexityCost:tier,cost:cost,distrStyle:'numNear',answerKind:'number',hint:disp+' = '+correct};
    },
    missing(){
      const sc=QM_scale();
      const op=QM_pick(['+','-','\u00D7']);
      let a,b,res,disp,cost;
      if(op==='+'){
        a=QM_rrand(2,sc.a);b=QM_rrand(2,sc.a);res=a+b;disp=a+' + ? = '+res;
        cost=QM_costSub(res,a)+0.25;        /* solved as res - a */
      }
      else if(op==='-'){
        a=QM_rrand(6,sc.a);b=QM_rrand(2,Math.max(3,a-2));res=a-b;disp=a+' \u2212 ? = '+res;
        cost=QM_costSub(a,res)+0.35;        /* solved as a - res */
      }
      else{
        /* cap to keep mental load reasonable */
        a=QM_rrand(2,Math.min(sc.b,9));b=QM_rrand(2,Math.min(sc.b,9));res=a*b;disp=a+' \u00D7 ? = '+res;
        cost=QM_costDiv(res,a)+0.35;
      }
      const mHint=op==='+'?(res+' \u2212 '+a+' = '+b):op==='-'?(a+' \u2212 '+res+' = '+b):(res+' \u00F7 '+a+' = '+b);
      return{display:disp,correct:b,sig:'missing|'+op+'|'+a+'|='+res,family:'missing',complexityCost:2,cost:cost,distrStyle:'numNear',answerKind:'number',hint:mHint};
    },
    balance(){
      const sc=QM_scale();
      /* form: ax + b = c → solve x; or ? + a = b */
      const variant=QM_rand(2);
      if(variant===0){
        /* ax + b = c — keep a ≤6, x ≤9, b ≤9 to keep mental math achievable in ~3s */
        const a=QM_rrand(2,Math.min(sc.b,6)),x=QM_rrand(2,Math.min(sc.b,9)),b=QM_rrand(1,Math.min(sc.b,9));
        const c=a*x+b;
        return{display:a+'x + '+b+' = '+c+', x = ?',correct:x,sig:'balance|'+a+'x+'+b+'='+c,family:'balance',complexityCost:3,
          cost:QM_costSub(c,b)+QM_costDiv(c-b,a)+0.7,distrStyle:'numNear',answerKind:'number',hint:c+' \u2212 '+b+' = '+(c-b)+', then \u00F7'+a+' \u2192 x = '+x};
      }else{
        const a=QM_rrand(2,Math.min(sc.a,12)),target=QM_rrand(a+2,a+sc.a);
        return{display:'? + '+a+' = '+target,correct:target-a,sig:'balance|?+'+a+'='+target,family:'balance',complexityCost:2,
          cost:QM_costSub(target,a)+0.25,distrStyle:'numNear',answerKind:'number',hint:target+' \u2212 '+a+' = '+(target-a)};
      }
    },
    reverse(){
      const sc=QM_scale();
      const op=QM_pick(['+','-','\u00D7']);
      if(op==='\u00D7'){
        /* keep both factors ≤9 for fast mental reverse */
        const a=QM_rrand(3,Math.min(sc.b,9)),b=QM_rrand(3,Math.min(sc.b,9));
        return{display:(a*b)+' = '+a+' \u00D7 ?',correct:b,sig:'reverse|'+(a*b)+'|x|'+a,family:'reverse',complexityCost:2,
          cost:QM_costDiv(a*b,a)+0.4,distrStyle:'numNear',answerKind:'number',hint:(a*b)+' \u00F7 '+a+' = '+b};
      }
      if(op==='+'){
        const a=QM_rrand(2,sc.a),b=QM_rrand(2,sc.a);
        return{display:(a+b)+' = '+a+' + ?',correct:b,sig:'reverse|'+(a+b)+'|+|'+a,family:'reverse',complexityCost:2,
          cost:QM_costSub(a+b,a)+0.35,distrStyle:'numNear',answerKind:'number',hint:(a+b)+' \u2212 '+a+' = '+b};
      }
      /* "c = a − ?" is solved as a − c. The old version rolled the minuend
         twice (up to 2x the tier cap), which is what produced brutal
         3-digit double-borrow questions like "128 = 200 − ?". */
      const a=QM_rrand(6,sc.a),b=QM_rrand(2,Math.max(3,a-2));
      return{display:(a-b)+' = '+a+' \u2212 ?',correct:b,sig:'reverse|'+(a-b)+'|-|'+a,family:'reverse',complexityCost:2,
        cost:QM_costSub(a,a-b)+0.4,distrStyle:'numNear',answerKind:'number',hint:a+' \u2212 '+(a-b)+' = '+b};
    },
    multistep(){
      const sc=QM_scale();
      /* keep a×b achievable in ~2s: cap factors at 9, c small (1-9). */
      const a=QM_rrand(2,Math.min(sc.b,9)),b=QM_rrand(2,Math.min(sc.b,9)),c=QM_rrand(1,Math.min(sc.b,9));
      const op2=QM_pick(['+','-']);
      let correct=op2==='+'?a*b+c:a*b-c;
      /* ensure non-negative for subtraction (always true since a*b≥4 > c≤9 sometimes) */
      if(correct<0){correct=a*b+c;}
      const finalOp=correct===a*b+c?'+':'-';
      const prod=a*b;
      const cost=QM_costMul(a,b)+(finalOp==='+'?QM_costAdd(prod,c):QM_costSub(prod,c))+0.35;
      return{display:a+' \u00D7 '+b+' '+(finalOp==='+'?'+':'\u2212')+' '+c,correct:correct,sig:'multistep|'+a+'x'+b+finalOp+c,family:'multistep',complexityCost:3,
        cost:cost,distrStyle:'wrongOp',answerKind:'number',hint:a+'\u00D7'+b+'='+(a*b)+', then '+(finalOp==='+'?'+':'-')+c};
    },
    compare(){
      const sc=QM_scale();
      const variant=QM_rand(2);
      if(variant===0){
        /* which is larger? two arithmetic results — ensure a clear gap (≥3) so it doesn't feel ambiguous */
        let exprs=null;
        for(let attempt=0;attempt<6;attempt++){
          const tmp=[];
          for(let i=0;i<2;i++){
            const a=QM_rrand(2,Math.min(sc.b,9)),b=QM_rrand(2,Math.min(sc.b,9)),op=QM_pick(['+','\u00D7']);
            const v=op==='+'?a+b:a*b;
            tmp.push({txt:a+' '+op+' '+b,v:v,cost:op==='+'?QM_costAdd(a,b):QM_costMul(a,b)});
          }
          if(Math.abs(tmp[0].v-tmp[1].v)>=3){exprs=tmp;break;}
        }
        if(!exprs){
          /* guaranteed fallback */
          exprs=[{txt:'4 + 5',v:9},{txt:'3 \u00D7 5',v:15}];
        }
        const winner=exprs[0].v>exprs[1].v?'A':'B';
        return{display:'Larger?<br><span class="qm-cmp">A: '+exprs[0].txt+' \u00B7 B: '+exprs[1].txt+'</span>',correct:winner,sig:'compare|larger|'+exprs[0].v+'|'+exprs[1].v,family:'compare',complexityCost:2,
          cost:(exprs[0].cost||1)+(exprs[1].cost||1)+0.3,distrStyle:'closeOption',answerKind:'choice',choices:['A','B','Equal'],hint:'A='+exprs[0].v+', B='+exprs[1].v};
      }
      /* closer to target */
      const target=QM_rrand(20,80);
      const a=target+QM_rrand(1,9)*(QM_rand(2)?1:-1);
      const b=target+QM_rrand(10,25)*(QM_rand(2)?1:-1);
      const winner=Math.abs(a-target)<Math.abs(b-target)?'A':'B';
      return{display:'Closer to '+target+'?<br><span class="qm-cmp">A: '+a+' \u00B7 B: '+b+'</span>',correct:winner,sig:'compare|closer|'+target+'|'+a+'|'+b,family:'compare',complexityCost:2,
        cost:1.4,distrStyle:'closeOption',answerKind:'choice',choices:['A','B','Equal'],hint:'A diff='+Math.abs(a-target)+', B diff='+Math.abs(b-target)};
    },
    sense(){
      const variant=QM_rand(3);
      if(variant===0){
        /* odd one out (parity) */
        const evens=[2,4,6,8,10,12,14,16,18,20,22];
        const odds=[3,5,7,9,11,13,15,17,19,21];
        const useEvens=QM_rand(2)===0;
        const pool=useEvens?evens:odds;
        const odd=useEvens?QM_pick(odds):QM_pick(evens);
        const picks=QM_shuffle(pool).slice(0,3);
        const arr=QM_shuffle(picks.concat([odd]));
        const oddIdx=arr.indexOf(odd);
        return{display:'Odd one out: '+arr.join(' \u00B7 '),correct:String(odd),sig:'sense|odd|'+arr.join(','),family:'sense',complexityCost:1,cost:1.0,distrStyle:'closeOption',answerKind:'pick',choices:arr.map(String),fixedAnswerIdx:oddIdx,hint:odd+' is '+(useEvens?'odd':'even')};
      }
      if(variant===1){
        /* highest */
        const arr=[QM_rrand(11,99),QM_rrand(11,99),QM_rrand(11,99),QM_rrand(11,99)];
        const max=Math.max.apply(null,arr);
        const idx=arr.indexOf(max);
        return{display:'Highest:',correct:String(max),sig:'sense|max|'+arr.join(','),family:'sense',complexityCost:1,cost:1.1,distrStyle:'closeOption',answerKind:'pick',choices:arr.map(String),fixedAnswerIdx:idx,hint:max+' is the max'};
      }
      /* divisibility by 3 — exactly ONE multiple of 3, no duplicates */
      const multiplesOf3=[12,15,18,21,24,27,33,36,39,42,45,48,51,54,57,63,66,69,72,75,78,81,84,87,93,96];
      const nonMultiples=[];
      for(let v=11;v<=99;v++){if(v%3!==0)nonMultiples.push(v);}
      const target=multiplesOf3[QM_rand(multiplesOf3.length)];
      const arr=[target];
      const shufNon=QM_shuffle(nonMultiples);
      for(let i=0;i<shufNon.length&&arr.length<4;i++){
        if(arr.indexOf(shufNon[i])<0)arr.push(shufNon[i]);
      }
      const shuffled=QM_shuffle(arr);
      const idx=shuffled.indexOf(target);
      return{display:'Divisible by 3:',correct:String(target),sig:'sense|div3|'+shuffled.join(','),family:'sense',complexityCost:2,cost:1.6,distrStyle:'closeOption',answerKind:'pick',choices:shuffled.map(String),fixedAnswerIdx:idx,hint:'Digits of '+target+' add to '+String(target).split('').reduce((s,d)=>s+ +d,0)+', divisible by 3'};
    },
    algebra(){
      const sc=QM_scale();
      /* keep coefficient ≤6 and operands ≤9 — solvable in ~3s mentally */
      const a=QM_rrand(2,Math.min(sc.b,6)),x=QM_rrand(2,Math.min(sc.b,9)),b=QM_rrand(1,Math.min(sc.b,9));
      const c=a*x+b;
      return{display:a+'x + '+b+' = '+c+', x = ?',correct:x,sig:'algebra|'+a+'x+'+b+'='+c,family:'algebra',complexityCost:3,
        cost:QM_costSub(c,b)+QM_costDiv(c-b,a)+0.7,distrStyle:'numNear',answerKind:'number',hint:'Take away '+b+', then \u00F7'+a+' \u2192 x = '+x};
    }
  };

  /* ====================================================================== */
  /*  OPTION BUILDER (numeric / pick / choice)                              */
  /* ====================================================================== */
  function QM_buildOptions(q){
    if(q.choices){
      const opts=q.choices.slice();
      let ai=typeof q.fixedAnswerIdx==='number'?q.fixedAnswerIdx:opts.indexOf(q.correct);
      if(ai<0){opts[0]=q.correct;ai=0;}
      q.opts=opts;q.answerIdx=ai;
      return q;
    }
    const correct=q.correct;
    const set=new Set([correct]);
    /* Distractors model real mistakes (off-by-one, dropped carry, wrong
       operation) and stay close to the answer, so the question is decided
       by the maths rather than by spotting the one plausible number.
       They are also kept tight enough that no option is obviously absurd. */
    const tryAdd=(v)=>{if(typeof v==='number'&&isFinite(v)&&v>=0&&v!==correct&&!set.has(v))set.add(v);};
    const cv=Math.abs(correct)||1;
    const nearDelta=cv<10?1:cv<50?2:cv<200?5:10;
    /* off-by-a-little — the classic slip */
    tryAdd(correct+nearDelta);tryAdd(correct-nearDelta);
    /* dropped/extra carry (±10) reads as a genuine mental slip */
    if(cv>=15){tryAdd(correct+10);tryAdd(correct-10);}
    /* digit swap */
    if(correct>=10){
      const s=String(correct);
      if(s.length>=2){const swap=parseInt(s[1]+s[0]+s.slice(2),10);tryAdd(swap);}
    }
    /* keep filling from a tight band so options stay plausible */
    let guard=40;
    while(set.size<4&&guard-->0){
      const jitter=Math.max(1,Math.round(cv*0.15));
      tryAdd(correct+QM_rrand(-jitter-2,jitter+2));
    }
    while(set.size<4)tryAdd(correct+QM_rrand(1,9));
    /* take 4, shuffle */
    const opts=QM_shuffle(Array.from(set)).slice(0,4);
    let ai=opts.indexOf(correct);
    if(ai<0){opts[0]=correct;ai=0;}
    q.opts=opts;q.answerIdx=ai;
    return q;
  }

  function QM_avoidStalePos(q){
    const recent=Fresh.correctPos.slice(-5);
    const cur=q.answerIdx;
    if(recent.filter(p=>p===cur).length<2)return q;
    let bestSlot=cur,bestC=99;
    for(let i=0;i<q.opts.length;i++){
      const c=recent.filter(p=>p===i).length;
      if(c<bestC){bestC=c;bestSlot=i;}
    }
    if(bestSlot===cur)return q;
    const tmp=q.opts[cur];q.opts[cur]=q.opts[bestSlot];q.opts[bestSlot]=tmp;
    q.answerIdx=bestSlot;
    return q;
  }

  /* ====================================================================== */
  /*  FAMILY SELECTION                                                      */
  /* ====================================================================== */
  function QM_pickFamily(){
    const m=QM_MODES[mode];
    if(G.activeEvent&&G.activeEvent.force){
      const f=QM_pick(G.activeEvent.force);
      if(m.families.indexOf(f)>=0)return f;
      /* mode doesn't include this family; force it anyway during the event */
      return f;
    }
    const phase=QM_phase()+Math.max(0,Adapt.bias);
    let elig=m.families.filter(f=>QM_FAMILIES[f]&&QM_FAMILIES[f].phaseMin<=phase);
    if(!elig.length)elig=['arith'];
    /* recovery: bias toward arith */
    if(Adapt.recoveryRoundsLeft>0){
      Adapt.recoveryRoundsLeft--;
      if(elig.indexOf('arith')>=0)return 'arith';
    }
    /* no two in a row */
    const last=Fresh.families[Fresh.families.length-1];
    let cands=elig.filter(f=>f!==last);
    if(!cands.length)cands=elig;
    const items=cands.map(f=>{
      const recent=Fresh.countIn(Fresh.families,f,3);
      let w=QM_FAMILIES[f].weight*(1/(1+recent*3));
      if(Adapt.bias>=1&&(f==='multistep'||f==='algebra'||f==='reverse'))w*=1.5;
      if(Adapt.bias<=-1&&(f==='multistep'||f==='algebra'))w*=0.5;
      return{v:f,w:w};
    });
    return QM_weightedPick(items);
  }

  /* ====================================================================== */
  /*  EVENT SCHEDULER                                                       */
  /* ====================================================================== */
  function QM_maybeEvent(){
    G.activeEvent=null;
    const m=QM_MODES[mode];
    if(m.zen||!m.eventRate)return;
    if(G.eventCooldown>0){G.eventCooldown--;return;}
    if(G.q<5)return;
    let p=0.04*m.eventRate;
    if(Adapt.accuracy()>0.85)p+=0.02;
    if(Math.random()>p)return;
    const elig=QM_EVENT_IDS.map(k=>QM_EVENTS[k]).filter(e=>G.q>=e.minQ);
    if(!elig.length)return;
    const ev=QM_pick(elig);
    G.activeEvent=ev;
    G.eventCooldown=5+QM_rand(3);
    QM_haptic([20,40,20]);
    toast(ev.icon+' '+ev.label+' \u2014 '+ev.sub);
  }

  /* ====================================================================== */
  /*  TIMER + SCORING                                                       */
  /* ====================================================================== */
  function QM_computeTimerMs(cost,workSec){
    const m=QM_MODES[mode];
    if(m.zen)return 0;
    const ev=G.activeEvent;
    const work=typeof workSec==='number'&&isFinite(workSec)?workSec:(cost>=3?2.4:cost>=2?1.6:1.0);
    /* Read the question, scan 4 options, move the thumb. */
    const overhead=1.25;
    /* pace: 1.0 = comfortable, <1 = brisk. Never drops below 0.75. */
    const pace=m.pace||1.0;
    let t=(work+overhead)*1000*pace;
    /* Gentle ramp: questions tighten slightly as the run goes on, but the
       floor below always wins, so this can't create impossible rounds. */
    t-=Math.min(G.q*(m.decay||0),900);
    t-=Adapt.bias*150;
    /* Events override or scale, but still respect the hard floor. */
    if(ev&&ev.timer)t=Math.min(t,ev.timer);
    if(ev&&ev.timerMul)t*=ev.timerMul;
    /* HARD FLOOR — the player must always have their thinking time plus
       0.8s to read and tap, even under Lightning or Sudden Solve. */
    const floor=(work+0.8)*1000;
    return Math.round(Math.max(floor,Math.min(t,m.baseTime+2500)));
  }
  function QM_scoreFor(q,fast){
    const ev=G.activeEvent;
    if(ev&&typeof ev.fixedReward==='number')return ev.fixedReward;
    let base=q.complexityCost; /* 1..3 */
    if(QM_FAMILIES[q.family])base*=QM_FAMILIES[q.family].minBoost;
    let m=1;
    if(G.streak>=10)m*=2.0;
    else if(G.streak>=6)m*=1.5;
    else if(G.streak>=3)m*=1.25;
    if(fast)m*=1.3;
    if(ev&&ev.mult)m*=ev.mult;
    return Math.max(1,Math.round(base*m));
  }

  function QM_showCombo(text){
    const banner=$('<div class="qm-combo-banner">'+text+'</div>');
    document.body.appendChild(banner);
    _st(()=>{banner.classList.add('qm-combo-out');},900);
    _st(()=>banner.remove(),1450);
  }

  /* ====================================================================== */
  /*  RENDER — START SCREEN                                                */
  /* ====================================================================== */
  function renderStart(){
    body.innerHTML='';
    const best=S('nz_qm_best_score')||0;
    const games=S('nz_qm_games')||0;
    const bestStreak=S('nz_qm_best_streak')||0;
    const accH=S('nz_qm_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=QM_dailyChallenge();
    const dcDone=QM_dailyDone();
    const screen=$('<div class="qm-start">'+
      '<div class="qm-stats">'+
        '<div class="qm-stat"><div class="v">'+best+'</div><div class="l">Best Score</div></div>'+
        '<div class="qm-stat"><div class="v">'+games+'</div><div class="l">Games</div></div>'+
        '<div class="qm-stat"><div class="v">'+bestStreak+'</div><div class="l">Best Streak</div></div>'+
        '<div class="qm-stat"><div class="v">'+avgAcc+'%</div><div class="l">Accuracy</div></div>'+
      '</div>'+
      '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;">'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="dc-ico">'+(dcDone?'\u2705':'\uD83C\uDFAF')+'</div>'+
          '<div style="flex:1;"><div class="dc-name">Daily: '+dc.label+'</div><div class="dc-sub">'+(dcDone?'Completed today!':'Complete for 2x XP')+'</div></div>'+
          '<span class="dc-badge">2x XP</span>'+
        '</div>'+
      '</div>'+
      '<div class="qm-mode-title">Choose a Mode</div>'+
      '<div class="qm-modes qm-modes-v3" id="qmModes"></div>'+
      '<button class="btn-primary" id="qmGo" style="margin-top:18px;width:100%;">Start \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#qmModes');
    QM_MODE_ORDER.forEach(k=>{
      const m=QM_MODES[k];
      /* Difficulty read-out comes from the mode's own budget, so the card
         can never drift out of sync with how the mode actually plays. */
      const lvl=m.zen?0:QM_clamp(Math.round(((m.budget?m.budget[2]:1.8)/(m.pace||1))*1.6),1,5);
      const dots=m.zen?'Relaxed':('\u25CF'.repeat(lvl)+'\u25CB'.repeat(5-lvl));
      const card=$('<button class="qm-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid qm-diff-dots">'+dots+'</div>'+
        '<div class="sm-sub">'+m.sub+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.qm-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#qmGo').onclick=()=>{
      playSound('tap');
      setS('nz_qm_v3_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ====================================================================== */
  /*  GAME LOOP                                                              */
  /* ====================================================================== */
  let host=null,curQ=null;
  function startGame(){
    const m=QM_MODES[mode];
    G.q=0;G.score=0;G.attempts=0;G.correctCount=0;
    G.lives=m.zen?Infinity:m.lives;G.streak=0;G.bestStreak=0;G.combo=1;
    G.activeEvent=null;G.eventCooldown=0;G.chainCarry=null;
    G.skill=Object.fromEntries(QM_FAMILY_IDS.map(f=>[f,{n:0,ok:0,ms:0}]));
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="qm-play" style="position:relative;"></div>');
    body.appendChild(host);
    setScore(0);
    next();
  }
  function _resumeBar(){if(host&&G.timerMs&&!G.barT&&!G.pending)_runBar();}
  function _runBar(){
    const m=QM_MODES[mode];
    if(m.zen||!G.timerMs)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    G.barT=_si(()=>{
      const elapsed=Date.now()-G.qStart-G.qOffPause;
      const pct=Math.max(0,100-elapsed/G.timerMs*100);
      const bar=wrap.querySelector('#mBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=G.timerMs){_cti(G.barT);G.barT=null;_resolve(-1,true);}
    },80);
  }

  function next(){
    if(G.lives<=0){_st(gameOver,500);return;}
    if(G.barT){_cti(G.barT);G.barT=null;}
    QM_maybeEvent();
    const m=QM_MODES[mode];
    let famId=QM_pickFamily();
    let q=null,tries=0;
    const budget=QM_budget();
    while(!q&&tries<6){
      tries++;
      const cand=Gen[famId]?QM_fit(Gen[famId],budget):null;
      if(!cand)continue;
      /* freshness gates (relax after 3 tries) */
      const stem=QM_sigStem(cand.sig);
      const tooSoon=tries<=3&&(Fresh.has(Fresh.sigs,cand.sig)||Fresh.countIn(Fresh.sigStems,stem,5)>=2);
      const sameAns =tries<=3&&typeof cand.correct==='number'&&Fresh.countIn(Fresh.answers,cand.correct,5)>=2;
      const sameDistr=tries<=3&&Fresh.countIn(Fresh.distrStyles,cand.distrStyle,4)>=3;
      if(tooSoon||sameAns||sameDistr)continue;
      q=cand;
    }
    if(!q){q=QM_fit(Gen.arith,budget)||Gen.arith();}
    /* Chain Round: if active and we have a carry, splice it into an arith question */
    if(G.activeEvent&&G.activeEvent.chain&&G.chainCarry!==null&&q.family==='arith'){
      const a=G.chainCarry,b=QM_rrand(2,9);
      q={display:a+' + '+b+' (chain)',correct:a+b,sig:'chain|'+a+'+'+b,family:'arith',complexityCost:1,cost:QM_costAdd(a,b),distrStyle:'numNear',answerKind:'number',hint:'Carry was '+a};
    }
    QM_buildOptions(q);
    QM_avoidStalePos(q);
    /* memory hide: mode-level always or event-level for this round */
    const memHide=(m.alwaysHide||(G.activeEvent&&G.activeEvent.memHide))&&!m.zen;
    q.memHide=memHide;
    /* record freshness AFTER acceptance */
    Fresh.add(Fresh.families,q.family,Fresh.maxF);
    Fresh.add(Fresh.sigs,q.sig,Fresh.maxSig);
    Fresh.add(Fresh.sigStems,QM_sigStem(q.sig),Fresh.maxStem);
    if(typeof q.correct==='number')Fresh.add(Fresh.answers,q.correct,Fresh.maxA);
    Fresh.add(Fresh.distrStyles,q.distrStyle,Fresh.maxDS);
    Fresh.add(Fresh.correctPos,q.answerIdx,Fresh.maxPos);
    curQ=q;
    G.q++;
    G.timerMs=QM_computeTimerMs(q.complexityCost,q.cost);
    G.qStart=Date.now();G.qOffPause=0;
    renderRound(q);
  }

  function renderRound(q){
    const m=QM_MODES[mode];
    const zen=m.zen;
    const ev=G.activeEvent;
    const famDef=QM_FAMILIES[q.family];
    const taskChip='<div class="qm-task-chip" style="background:'+famDef.hue+';"><span class="qm-task-icon">'+famDef.icon+'</span><span class="qm-task-text">'+famDef.label+'</span></div>';
    const eventBanner=ev?'<div class="qm-event-banner">'+ev.icon+' '+ev.label+' \u00B7 '+ev.sub+'</div>':'';
    const heartsHtml=zen?'<span class="qm-zen-tag">\uD83E\uDDD8 Zen \u2014 practice freely</span>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';
    const comboLabel=G.streak>=10?'\uD83D\uDC51 FLOW x10':G.streak>=6?'\u26A1 FIRE x6':G.streak>=3?'\uD83D\uDD25 STREAK '+G.streak:'';
    const comboHtml=comboLabel?'<span class="qm-combo">'+comboLabel+'</span>':'<span>\uD83D\uDD25 '+G.streak+'</span>';
    const accChip=Adapt.win.length>=5?'<span class="qm-acc-mini">'+Math.round(Adapt.accuracy()*100)+'%</span>':'';

    /* options HTML */
    const optsHtml='<div class="math-opts">'+q.opts.map((v,i)=>'<button class="math-opt" data-i="'+i+'">'+v+'</button>').join('')+'</div>';

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="mBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="qm-info">'+
        '<span>Q'+G.q+'</span>'+
        accChip+
        comboHtml+
      '</div>'+
      eventBanner+
      taskChip+
      '<div class="qm-question" id="qmQ">'+q.display+'</div>'+
      optsHtml;

    /* memory hide: question disappears after 1.2s */
    if(q.memHide){
      _st(()=>{
        const qe=host.querySelector('#qmQ');
        if(qe){qe.classList.add('qm-question-hidden');qe.textContent='\uD83E\uDDE0 from memory';}
      },1200);
    }

    host.querySelectorAll('.math-opt').forEach(btn=>{
      btn.onclick=()=>{
        if(btn.disabled)return;
        host.querySelectorAll('.math-opt').forEach(b=>b.disabled=true);
        if(G.barT){_cti(G.barT);G.barT=null;}
        const i=parseInt(btn.dataset.i,10);
        _resolve(i,false,btn);
      };
    });
    _runBar();
  }

  function _resolve(pickedIdx,timedOut,btn){
    const q=curQ;if(!q)return;
    const ms=Date.now()-G.qStart-G.qOffPause;
    G.attempts++;
    const isCorrect=!timedOut&&pickedIdx===q.answerIdx;
    Adapt.record(isCorrect,ms,G.timerMs||3000,q.family,q.complexityCost);
    const opts=host.querySelectorAll('.math-opt');
    const m=QM_MODES[mode];
    if(isCorrect){
      playSound('correct');QM_haptic(10);
      if(btn)btn.classList.add('correct-ans');
      G.correctCount++;G.streak++;if(G.streak>G.bestStreak)G.bestStreak=G.streak;
      const fast=ms<G.timerMs*0.45;
      const pts=QM_scoreFor(q,fast);
      G.score+=pts;setScore(G.score);
      /* combo banners */
      if(G.streak===3)QM_showCombo('\uD83D\uDD25 HOT HANDS x3');
      else if(G.streak===6){QM_showCombo('\u26A1 BRAIN ON FIRE x6');wrap.classList.add('fire-glow');}
      else if(G.streak===10)QM_showCombo('\uD83D\uDC51 FLOW STATE x10');
      /* points popup */
      const popup=$('<div class="qm-pts-popup" style="color:#34D399;">+'+pts+(fast?' \u26A1':'')+'</div>');
      document.body.appendChild(popup);_st(()=>popup.remove(),900);
      /* chain carry: if Chain event active, save the answer for next round */
      if(G.activeEvent&&G.activeEvent.chain){G.chainCarry=q.correct;}
      else G.chainCarry=null;
      _st(next,m.zen?320:430);
    }else{
      playSound('wrong');QM_haptic([20,40,20]);
      if(btn)btn.classList.add('wrong-ans');
      if(opts[q.answerIdx])opts[q.answerIdx].classList.add('correct-ans');
      /* Sudden Solve event: only -1 life regardless of streak; no all-or-nothing */
      G.streak=0;wrap.classList.remove('fire-glow');
      /* Always show the working, not just in Zen — a miss you don't
         understand teaches nothing. Timeouts get a nudge about pace. */
      const why=timedOut?'\u23F1 Time\u2019s up \u2014 '+q.hint:'\uD83D\uDCA1 '+q.hint;
      const exp=$('<div class="qm-explain">'+why+'</div>');
      host.appendChild(exp);
      if(m.zen){_st(next,1600);return;}
      G.lives--;
      host.classList.add('shake-anim');
      _st(()=>{if(host)host.classList.remove('shake-anim');},450);
      if(G.lives<=0){_st(gameOver,1100);return;}
      _st(next,1500);
    }
  }

  /* ====================================================================== */
  /*  GAME OVER + INSIGHT                                                    */
  /* ====================================================================== */
  function gameOver(){
    _cleanup();
    const accuracy=G.attempts?Math.round(G.correctCount/G.attempts*100):0;
    const prevBest=S('nz_qm_best_score')||0;
    const newPB=G.score>prevBest;
    if(newPB)setS('nz_qm_best_score',G.score);
    setS('nz_qm_games',(S('nz_qm_games')||0)+1);
    if(G.bestStreak>(S('nz_qm_best_streak')||0))setS('nz_qm_best_streak',G.bestStreak);
    const accH=S('nz_qm_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_qm_accuracy',accH);
    const dc=QM_dailyChallenge();
    if(!QM_dailyDone()){
      const pass=dc.streak?G.bestStreak>=dc.target:(G.correctCount>=dc.target||G.score>=dc.target);
      if(pass){setS('nz_qm_daily_date',todayKey());setS('nz_qm_daily_done',true);_st(()=>toast('\uD83C\uDFAF Daily Challenge complete! 2x XP'),700);}
    }
    /* persist skill profile (additive) */
    const skillStore=S('nz_qm_skill')||{};
    QM_FAMILY_IDS.forEach(f=>{
      const a=skillStore[f]||{n:0,ok:0,ms:0};
      skillStore[f]={n:a.n+G.skill[f].n,ok:a.ok+G.skill[f].ok,ms:a.ms+G.skill[f].ms};
    });
    setS('nz_qm_skill',skillStore);
    if(newPB)confetti(60);
    const rank=QM_rank(G.score);
    /* run-only insight: best/worst family */
    let best=null,worst=null;
    QM_FAMILY_IDS.forEach(f=>{const sk=G.skill[f];if(sk.n>=2){const a=sk.ok/sk.n;if(!best||a>best.a)best={id:f,a:a};if(!worst||a<worst.a)worst={id:f,a:a};}});
    let insight='';
    if(best&&worst&&best.id!==worst.id)insight='Strongest: '+QM_FAMILIES[best.id].label+' \u00B7 '+Math.round(best.a*100)+'%. Work on: '+QM_FAMILIES[worst.id].label+' \u00B7 '+Math.round(worst.a*100)+'%.';
    else if(best)insight='Strong run on '+QM_FAMILIES[best.id].label+' ('+Math.round(best.a*100)+'%).';
    /* One concrete next step, based on how the run actually went. */
    const avgRT=Adapt.avgRT();
    let coach='';
    if(accuracy>=85&&G.score>=20)coach='\uD83D\uDE80 You\u2019re cruising \u2014 try '+(mode==='easy'?'Medium':mode==='medium'?'Hard':mode==='hard'?'Speed Blitz':'Survival Chaos')+' for a real test.';
    else if(accuracy<55)coach='\uD83E\uDDD8 Accuracy first, speed later \u2014 a few rounds in Zen mode (no timer, full explanations) will make this click.';
    else if(G.bestStreak<=2&&G.attempts>=6)coach='\uD83C\uDFAF Streaks are where the points are \u2014 slow down slightly and bank 3 in a row for the multiplier.';
    else if(avgRT>0&&avgRT<900&&accuracy<75)coach='\u26A1 You\u2019re answering fast but missing \u2014 take one extra beat to read the whole question.';
    else if(worst)coach='\uD83D\uDCDA Weakest area was '+QM_FAMILIES[worst.id].label+'. It\u2019ll show up again \u2014 watch the explanation when you miss one.';
    setScore(G.score);
    end({
      title:rank.em+' '+rank.txt,emoji:rank.em,
      sub:'Score '+G.score+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
      value:G.score,points:G.score>=40?13:G.score>=22?10:G.score>=10?7:4,starThresh:[10,22,40],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Questions Answered</span><span class="val">'+G.q+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'% ('+G.correctCount+'/'+G.attempts+')</span></div>'+
        '<div class="row"><span>Best Streak</span><span class="val">'+G.bestStreak+' \uD83D\uDD25</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(G.score,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      (insight?'<div class="qm-insight">'+insight+'</div>':'')+
      (coach?'<div class="qm-coach">'+coach+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  renderStart();
}
