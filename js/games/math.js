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
  easy   :{label:'Easy',          emoji:'\uD83D\uDFE2',sub:'Add / subtract \u00B7 missing',  baseTime:4500,minTime:2500,decay:120,lives:3,zen:false,families:['arith','missing'],         opMix:['+','-'],         eventRate:1.0},
  medium :{label:'Medium',        emoji:'\uD83D\uDFE1',sub:'All 4 ops \u00B7 balance + reverse',baseTime:3000,minTime:1800,decay:60, lives:3,zen:false,families:['arith','missing','balance','reverse'],opMix:['+','-','\u00D7','\u00F7'],eventRate:1.0},
  hard   :{label:'Hard',          emoji:'\uD83D\uDD34',sub:'Multi-step \u00B7 compare',     baseTime:2500,minTime:1500,decay:50, lives:3,zen:false,families:['arith','multistep','balance','reverse','compare'],opMix:['+','-','\u00D7','\u00F7'],eventRate:1.1},
  algebra:{label:'Algebra',       emoji:'\u26A1',         sub:'Solve for x \u00B7 reverse',  baseTime:3200,minTime:2000,decay:55, lives:3,zen:false,families:['algebra','reverse','balance'],opMix:['+','-','\u00D7'],eventRate:0.8},
  zen    :{label:'Zen',           emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 explanations',baseTime:0,   minTime:0,   decay:0,  lives:99,zen:true, families:['arith','missing','balance','reverse','multistep'],opMix:['+','-','\u00D7','\u00F7'],eventRate:0},
  blitz  :{label:'Speed Blitz',   emoji:'\uD83D\uDCA8',sub:'1.4s arithmetic only',         baseTime:1400,minTime:1000,decay:0,  lives:3,zen:false,families:['arith'],                    opMix:['+','-','\u00D7'],eventRate:0.6},
  memory :{label:'Memory Math',   emoji:'\uD83E\uDDE0',sub:'Question hides \u2014 answer from memory',baseTime:4000,minTime:2400,decay:80,lives:3,zen:false,families:['arith','multistep'], opMix:['+','-','\u00D7','\u00F7'],eventRate:0.5,alwaysHide:true},
  chaos  :{label:'Survival Chaos',emoji:'\uD83C\uDF2A\uFE0F',sub:'Mixed \u00B7 events frequent',baseTime:3000,minTime:1700,decay:60,lives:3,zen:false,families:['arith','missing','balance','reverse','multistep','compare','sense','algebra'],opMix:['+','-','\u00D7','\u00F7'],eventRate:2.5}
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
    /* (a,b) = max-operand by phase */
    const tiers=[{a:9,b:9,big:12},{a:25,b:11,big:30},{a:90,b:13,big:80},{a:200,b:14,big:160},{a:500,b:15,big:300}];
    return tiers[QM_clamp(p,0,4)];
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
      let a,b,correct,disp;
      if(op==='+'){a=QM_rrand(2,sc.a);b=QM_rrand(2,sc.a);correct=a+b;disp=a+' + '+b;}
      else if(op==='-'){a=QM_rrand(3,sc.a)+QM_rrand(0,sc.a);b=QM_rrand(2,Math.max(3,Math.floor(a*0.9)));correct=a-b;disp=a+' \u2212 '+b;}
      else if(op==='\u00D7'){a=QM_rrand(2,Math.min(sc.b,12));b=QM_rrand(2,Math.min(sc.b,12));correct=a*b;disp=a+' \u00D7 '+b;}
      else{ /* ÷ */ const d=QM_rrand(2,Math.min(sc.b,12)),q=QM_rrand(2,Math.min(sc.b,12));a=d*q;b=d;correct=q;disp=a+' \u00F7 '+d;}
      const cost=op==='\u00D7'||op==='\u00F7'?2:1;
      return{display:disp,correct:correct,sig:'arith|'+op+'|'+a+'|'+b,family:'arith',complexityCost:cost,distrStyle:'numNear',answerKind:'number',hint:disp+' = '+correct};
    },
    missing(){
      const sc=QM_scale();
      const op=QM_pick(['+','-','\u00D7']);
      let a,b,res,disp;
      if(op==='+'){a=QM_rrand(2,sc.a);b=QM_rrand(2,sc.a);res=a+b;disp=a+' + ? = '+res;}
      else if(op==='-'){a=QM_rrand(5,sc.a)+QM_rrand(0,sc.a);b=QM_rrand(2,Math.max(3,Math.floor(a*0.7)));res=a-b;disp=a+' \u2212 ? = '+res;}
      else{a=QM_rrand(2,Math.min(sc.b,11));b=QM_rrand(2,Math.min(sc.b,11));res=a*b;disp=a+' \u00D7 ? = '+res;}
      return{display:disp,correct:b,sig:'missing|'+op+'|'+a+'|='+res,family:'missing',complexityCost:2,distrStyle:'numNear',answerKind:'number',hint:'? = '+b};
    },
    balance(){
      const sc=QM_scale();
      /* form: ax + b = c → solve x; or ? + a = b */
      const variant=QM_rand(2);
      if(variant===0){
        const a=QM_rrand(2,Math.min(sc.b,9)),x=QM_rrand(2,Math.min(sc.b,9)),b=QM_rrand(1,Math.min(sc.b,9));
        return{display:a+'x + '+b+' = '+(a*x+b)+', x = ?',correct:x,sig:'balance|'+a+'x+'+b+'='+(a*x+b),family:'balance',complexityCost:3,distrStyle:'numNear',answerKind:'number',hint:'x = '+x};
      }else{
        const a=QM_rrand(2,Math.min(sc.a,12)),target=QM_rrand(a+2,a+sc.a);
        return{display:'? + '+a+' = '+target,correct:target-a,sig:'balance|?+'+a+'='+target,family:'balance',complexityCost:2,distrStyle:'numNear',answerKind:'number',hint:'? = '+(target-a)};
      }
    },
    reverse(){
      const sc=QM_scale();
      const op=QM_pick(['+','-','\u00D7']);
      if(op==='\u00D7'){
        const a=QM_rrand(3,Math.min(sc.b,12)),b=QM_rrand(3,Math.min(sc.b,12));
        return{display:(a*b)+' = '+a+' \u00D7 ?',correct:b,sig:'reverse|'+(a*b)+'|x|'+a,family:'reverse',complexityCost:2,distrStyle:'numNear',answerKind:'number',hint:'? = '+b};
      }
      if(op==='+'){
        const a=QM_rrand(2,sc.a),b=QM_rrand(2,sc.a);
        return{display:(a+b)+' = '+a+' + ?',correct:b,sig:'reverse|'+(a+b)+'|+|'+a,family:'reverse',complexityCost:2,distrStyle:'numNear',answerKind:'number',hint:'? = '+b};
      }
      const a=QM_rrand(5,sc.a)+QM_rrand(0,sc.a),b=QM_rrand(2,Math.max(3,Math.floor(a*0.6)));
      return{display:(a-b)+' = '+a+' \u2212 ?',correct:b,sig:'reverse|'+(a-b)+'|-|'+a,family:'reverse',complexityCost:2,distrStyle:'numNear',answerKind:'number',hint:'? = '+b};
    },
    multistep(){
      const sc=QM_scale();
      const a=QM_rrand(2,Math.min(sc.b,11)),b=QM_rrand(2,Math.min(sc.b,11)),c=QM_rrand(1,Math.min(sc.b,11));
      const op2=QM_pick(['+','-']);
      const correct=op2==='+'?a*b+c:a*b-c;
      return{display:a+' \u00D7 '+b+' '+(op2==='+'?'+':'\u2212')+' '+c,correct:correct,sig:'multistep|'+a+'x'+b+op2+c,family:'multistep',complexityCost:3,distrStyle:'wrongOp',answerKind:'number',hint:a+'\u00D7'+b+'='+(a*b)+', then '+(op2==='+'?'+':'-')+c};
    },
    compare(){
      const sc=QM_scale();
      const variant=QM_rand(2);
      if(variant===0){
        /* which is larger? two arithmetic results */
        const exprs=[];
        for(let i=0;i<2;i++){
          const a=QM_rrand(2,Math.min(sc.b,12)),b=QM_rrand(2,Math.min(sc.b,12)),op=QM_pick(['+','\u00D7']);
          const v=op==='+'?a+b:a*b;
          exprs.push({txt:a+' '+op+' '+b,v:v});
        }
        if(exprs[0].v===exprs[1].v)exprs[1].v++;
        const winner=exprs[0].v>exprs[1].v?'A':'B';
        return{display:'Larger?<br><span class="qm-cmp">A: '+exprs[0].txt+' \u00B7 B: '+exprs[1].txt+'</span>',correct:winner,sig:'compare|larger|'+exprs[0].v+'|'+exprs[1].v,family:'compare',complexityCost:2,distrStyle:'closeOption',answerKind:'choice',choices:['A','B','Equal'],hint:'A='+exprs[0].v+', B='+exprs[1].v};
      }
      /* closer to target */
      const target=QM_rrand(20,80);
      const a=target+QM_rrand(1,9)*(QM_rand(2)?1:-1);
      const b=target+QM_rrand(10,25)*(QM_rand(2)?1:-1);
      const winner=Math.abs(a-target)<Math.abs(b-target)?'A':'B';
      return{display:'Closer to '+target+'?<br><span class="qm-cmp">A: '+a+' \u00B7 B: '+b+'</span>',correct:winner,sig:'compare|closer|'+target+'|'+a+'|'+b,family:'compare',complexityCost:2,distrStyle:'closeOption',answerKind:'choice',choices:['A','B','Equal'],hint:'A diff='+Math.abs(a-target)+', B diff='+Math.abs(b-target)};
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
        return{display:'Odd one out: '+arr.join(' \u00B7 '),correct:String(odd),sig:'sense|odd|'+arr.join(','),family:'sense',complexityCost:1,distrStyle:'closeOption',answerKind:'pick',choices:arr.map(String),fixedAnswerIdx:oddIdx,hint:odd+' is '+(useEvens?'odd':'even')};
      }
      if(variant===1){
        /* highest */
        const arr=[QM_rrand(11,99),QM_rrand(11,99),QM_rrand(11,99),QM_rrand(11,99)];
        const max=Math.max.apply(null,arr);
        const idx=arr.indexOf(max);
        return{display:'Highest:',correct:String(max),sig:'sense|max|'+arr.join(','),family:'sense',complexityCost:1,distrStyle:'closeOption',answerKind:'pick',choices:arr.map(String),fixedAnswerIdx:idx,hint:max+' is the max'};
      }
      /* divisibility by 3 */
      const arr=[];
      while(arr.length<4){const v=QM_rrand(11,99);if(arr.indexOf(v)<0)arr.push(v);}
      let target=arr.find(v=>v%3===0);
      if(target===undefined){target=arr[0]-(arr[0]%3);if(target<10)target=12;arr[0]=target;}
      const idx=arr.indexOf(target);
      return{display:'Divisible by 3:',correct:String(target),sig:'sense|div3|'+arr.join(','),family:'sense',complexityCost:2,distrStyle:'closeOption',answerKind:'pick',choices:arr.map(String),fixedAnswerIdx:idx,hint:target+' \u00F7 3 = '+(target/3)};
    },
    algebra(){
      const sc=QM_scale();
      const a=QM_rrand(2,Math.min(sc.b,9)),x=QM_rrand(2,Math.min(sc.b,12)),b=QM_rrand(1,Math.min(sc.b,12));
      return{display:a+'x + '+b+' = '+(a*x+b)+', x = ?',correct:x,sig:'algebra|'+a+'x+'+b+'='+(a*x+b),family:'algebra',complexityCost:3,distrStyle:'numNear',answerKind:'number',hint:'x = '+x};
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
    /* numeric distractors: smart mix */
    const tryAdd=(v)=>{if(typeof v==='number'&&isFinite(v)&&v>=0&&!set.has(v))set.add(v);};
    const cv=Math.abs(correct)||1;
    const nearDelta=cv<10?1:cv<50?2:cv<200?5:10;
    /* numeric near */
    tryAdd(correct+nearDelta);tryAdd(correct-nearDelta);
    /* off-by-magnitude */
    if(Adapt.bias>=1){tryAdd(correct*2);tryAdd(Math.floor(correct/2));}
    /* digit swap */
    if(correct>=10){
      const s=String(correct);
      if(s.length>=2){const swap=parseInt(s[1]+s[0]+s.slice(2),10);tryAdd(swap);}
    }
    while(set.size<4)tryAdd(correct+QM_rrand(-7,7));
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
  function QM_computeTimerMs(cost){
    const m=QM_MODES[mode];
    if(m.zen)return 0;
    const ev=G.activeEvent;
    if(ev&&ev.timer)return ev.timer;
    let t=m.baseTime+(cost-1)*600-G.q*m.decay-Adapt.bias*200;
    if(ev&&ev.timerMul)t*=ev.timerMul;
    return QM_clamp(Math.round(t),m.minTime,m.baseTime+1500);
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
      const card=$('<button class="qm-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid">'+(m.zen?'No timer':((m.baseTime/1000).toFixed(1)+'s base'))+'</div>'+
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
    while(!q&&tries<6){
      tries++;
      const cand=Gen[famId]?Gen[famId]():null;
      if(!cand)continue;
      /* freshness gates (relax after 3 tries) */
      const stem=QM_sigStem(cand.sig);
      const tooSoon=tries<=3&&(Fresh.has(Fresh.sigs,cand.sig)||Fresh.countIn(Fresh.sigStems,stem,5)>=2);
      const sameAns =tries<=3&&typeof cand.correct==='number'&&Fresh.countIn(Fresh.answers,cand.correct,5)>=2;
      const sameDistr=tries<=3&&Fresh.countIn(Fresh.distrStyles,cand.distrStyle,4)>=3;
      if(tooSoon||sameAns||sameDistr)continue;
      q=cand;
    }
    if(!q){q=Gen.arith();}
    /* Chain Round: if active and we have a carry, splice it into an arith question */
    if(G.activeEvent&&G.activeEvent.chain&&G.chainCarry!==null&&q.family==='arith'){
      const a=G.chainCarry,b=QM_rrand(2,9);
      q={display:a+' + '+b+' (chain)',correct:a+b,sig:'chain|'+a+'+'+b,family:'arith',complexityCost:1,distrStyle:'numNear',answerKind:'number',hint:'Carry was '+a};
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
    G.timerMs=QM_computeTimerMs(q.complexityCost);
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
      if(m.zen){
        const exp=$('<div class="qm-explain">\uD83D\uDCA1 '+q.hint+'</div>');
        host.appendChild(exp);
        _st(next,1500);
        return;
      }
      G.lives--;
      host.classList.add('shake-anim');
      _st(()=>{if(host)host.classList.remove('shake-anim');},450);
      if(G.lives<=0){_st(gameOver,800);return;}
      _st(next,900);
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
    setScore(G.score);
    end({
      title:rank.em+' '+rank.txt,emoji:rank.em,
      sub:'Score '+G.score+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
      value:G.score,points:Math.max(2,G.score+Math.round(G.bestStreak/3)),starThresh:[10,22,40],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Questions Answered</span><span class="val">'+G.q+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'% ('+G.correctCount+'/'+G.attempts+')</span></div>'+
        '<div class="row"><span>Best Streak</span><span class="val">'+G.bestStreak+' \uD83D\uDD25</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(G.score,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      (insight?'<div class="qm-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  renderStart();
}
