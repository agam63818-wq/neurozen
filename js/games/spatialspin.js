/* ===================== SPATIAL SPIN v4 — 4 modes × 8 challenge types =====================
 *  Entry: playSpatialSpin(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed SS_ to avoid collisions with other games.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
 *  CSS prefix preserved: .ss-
 *  localStorage keys preserved: nz_ss_best_round, nz_ss_games, nz_ss_accuracy,
 *                               nz_ss_daily_date, nz_ss_daily_done
 *  New keys (additive): nz_ss_v4_seen, nz_ss_skill
 *
 *  Rotation/reflection convention (used IDENTICALLY at generation + validation):
 *    cells = [[row,col], ...] integer grid
 *    rotateCW : [r,c] -> [c, maxR - r], then normalize
 *    mirrorH  : [r,c] -> [r, maxC - c], then normalize
 *    rotation set of shape T = { T, CW(T), CW2(T), CW3(T) } deduped by hash
 *    mirror   set of shape T = { mirrorH(R) | R in rotation set } deduped, minus rotation set
 * ============================================================================ */

/* ---------- MODE DEFS (4 modes) ---------- */
const SS_MODES={
  classic:{label:'Classic',     emoji:'\uD83C\uDFAF', sub:'Mixed challenges \u00B7 All types',          time:8000,minTime:4000,decay:200,nMin:4,nMax:7,zen:false,lives:3,combo:false},
  speed  :{label:'Speed',       emoji:'\u26A1',         sub:'3.5s flat \u00B7 Chain reflexes',             time:3500,minTime:3500,decay:0,  nMin:4,nMax:5,zen:false,lives:3,combo:true},
  expert :{label:'Expert',      emoji:'\uD83D\uDD25',sub:'Hard challenges \u00B7 Mirror traps',         time:6000,minTime:3500,decay:150,nMin:6,nMax:8,zen:false,lives:3,combo:false},
  zen    :{label:'Zen',         emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 Learn with explanations',     time:0,   minTime:0,   decay:0,  nMin:4,nMax:6,zen:true, lives:Infinity,combo:false}
};
const SS_PALETTE=['#7C3AED','#4F8EF7','#34D399','#F97316','#EC4899','#06B6D4','#A855F7','#EF4444'];

/* ---------- CHALLENGE TYPE WEIGHTS ---------- */
const SS_CHALLENGE_WEIGHTS={
  classic:{rotation:35,mirror:15,missing:15,memory:10,angle:10,oddoneout:10,completion:5,chain:0},
  speed:  {rotation:50,mirror:0, missing:0, memory:0, angle:30,oddoneout:20,completion:0,chain:0},
  expert: {rotation:20,mirror:20,missing:10,memory:20,oddoneout:15,completion:0,chain:15,angle:0},
  zen:    {rotation:12.5,mirror:12.5,missing:12.5,memory:12.5,angle:12.5,oddoneout:12.5,completion:12.5,chain:12.5}
};

/* ---------- CHALLENGE TYPE BADGE DEFS ---------- */
const SS_BADGES={
  rotation:  {emoji:'\uD83D\uDFE3',name:'ROTATION',   color:'#7C3AED',instruction:'Tap the correct rotation'},
  mirror:    {emoji:'\uD83D\uDD34',name:'MIRROR',      color:'#EC4899',instruction:'Find the MIRROR image'},
  missing:   {emoji:'\uD83D\uDFE2',name:'MISSING',     color:'#34D399',instruction:'Place the missing block'},
  memory:    {emoji:'\uD83D\uDFE0',name:'MEMORY',      color:'#F97316',instruction:'What was the shape?'},
  angle:     {emoji:'\uD83D\uDFE1',name:'ANGLE',       color:'#EAB308',instruction:'How much did it rotate?'},
  oddoneout: {emoji:'\uD83D\uDD35',name:'ODD ONE',     color:'#3B82F6',instruction:'Find the shape that doesn\u2019t belong'},
  chain:     {emoji:'\u26AB',       name:'SEQUENCE',    color:'#6B7280',instruction:'Select the missing step'},
  completion:{emoji:'\uD83D\uDD3A',name:'COMPLETE',    color:'#8B5CF6',instruction:'Complete the shape'}
};

/* ---------- SHAPE MATH (KEPT EXACTLY) ---------- */
function SS_norm(cells){
  let mr=Infinity,mc=Infinity;
  for(let i=0;i<cells.length;i++){if(cells[i][0]<mr)mr=cells[i][0];if(cells[i][1]<mc)mc=cells[i][1];}
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][0]-mr,cells[i][1]-mc];
  out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return out;
}
function SS_hash(cells){let s='';for(let i=0;i<cells.length;i++){if(i)s+='|';s+=cells[i][0]+','+cells[i][1];}return s;}
function SS_rotateCW(cells){
  let mr=0;for(let i=0;i<cells.length;i++)if(cells[i][0]>mr)mr=cells[i][0];
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][1],mr-cells[i][0]];
  return SS_norm(out);
}
function SS_mirrorH(cells){
  let mc=0;for(let i=0;i<cells.length;i++)if(cells[i][1]>mc)mc=cells[i][1];
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][0],mc-cells[i][1]];
  return SS_norm(out);
}
function SS_rotationSet(cells){
  const set=new Map();
  let cur=SS_norm(cells);
  for(let i=0;i<4;i++){const h=SS_hash(cur);if(!set.has(h))set.set(h,cur);cur=SS_rotateCW(cur);}
  return set;
}
function SS_mirrorSet(cells){
  const rot=SS_rotationSet(cells);
  const set=new Map();
  rot.forEach((c)=>{
    let m=SS_mirrorH(c);
    for(let i=0;i<4;i++){const h=SS_hash(m);if(!rot.has(h)&&!set.has(h))set.set(h,m);m=SS_rotateCW(m);}
  });
  return set;
}
function SS_canonicalHash(cells){
  const rot=SS_rotationSet(cells);
  const mir=SS_mirrorSet(cells);
  let best=null;
  rot.forEach((_,h)=>{if(best===null||h<best)best=h;});
  mir.forEach((_,h)=>{if(best===null||h<best)best=h;});
  return best;
}
function SS_bbox(cells){
  let mr=0,mc=0;
  for(let i=0;i<cells.length;i++){if(cells[i][0]>mr)mr=cells[i][0];if(cells[i][1]>mc)mc=cells[i][1];}
  return{rows:mr+1,cols:mc+1};
}
function SS_isConnected(cells){
  if(!cells.length)return false;
  const set=new Set(cells.map(c=>c[0]+','+c[1]));
  const seen=new Set();const stack=[cells[0]];seen.add(cells[0][0]+','+cells[0][1]);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(stack.length){
    const cur=stack.pop();
    for(let i=0;i<4;i++){
      const nr=cur[0]+dirs[i][0],nc=cur[1]+dirs[i][1],k=nr+','+nc;
      if(set.has(k)&&!seen.has(k)){seen.add(k);stack.push([nr,nc]);}
    }
  }
  return seen.size===cells.length;
}
function SS_frontier(cells){
  const inShape=new Set(cells.map(c=>c[0]+','+c[1]));
  const front=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<cells.length;i++){
    for(let j=0;j<4;j++){
      const nr=cells[i][0]+dirs[j][0],nc=cells[i][1]+dirs[j][1],k=nr+','+nc;
      if(!inShape.has(k))front.add(k);
    }
  }
  return Array.from(front).map(k=>{const p=k.split(',');return[parseInt(p[0],10),parseInt(p[1],10)];});
}
function SS_genShape(n,opts){
  const branching=opts&&typeof opts.branching==='number'?opts.branching:0.5;
  const cells=[[0,0]];
  while(cells.length<n){
    const front=SS_frontier(cells);
    if(!front.length)break;
    let pick;
    if(Math.random()<branching){
      const last=cells[cells.length-1];
      front.sort((a,b)=>(Math.abs(a[0]-last[0])+Math.abs(a[1]-last[1]))-(Math.abs(b[0]-last[0])+Math.abs(b[1]-last[1])));
      pick=front[0];
    }else{pick=front[Math.floor(Math.random()*front.length)];}
    cells.push(pick);
  }
  return SS_norm(cells);
}
function SS_isDegenerate(cells,opts){
  if(cells.length<3)return true;
  const bb=SS_bbox(cells);
  if(cells.length>=4&&(bb.rows===1||bb.cols===1))return true;
  const rotSet=SS_rotationSet(cells);
  const mirSet=SS_mirrorSet(cells);
  if(rotSet.size===1&&mirSet.size===0&&opts&&opts.banFullSym)return true;
  return false;
}
function SS_silhouetteKey(cells){const bb=SS_bbox(cells);return cells.length+'x'+bb.rows+'x'+bb.cols;}

/* ====================================================================== */
function playSpatialSpin(body,setScore,end,wrap,startClock){
  let mode='classic';

  const G={
    round:0,lives:3,correctCount:0,attempts:0,comboCount:0,comboMax:0,
    barT:null,roundStart:0,roundOffPause:0,timerMs:0,
    pending:false,
    challengeHistory:[],/* last 5 challenge types for anti-repeat */
    skill:{rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},
           memory:{ok:0,n:0},angle:{ok:0,n:0},oddoneout:{ok:0,n:0},completion:{ok:0,n:0},
           mirrorErrors:0,nearErrors:0}
  };

  const Fresh={
    canon:[],maxCanon:50,
    silhouettes:[],maxSil:12,
    distrStyles:[],maxStyle:6,
    correctPos:[],maxPos:8,
    perNCount:{},perNMax:{3:1,4:2,5:5,6:12,7:25,8:40},
    addCanon(h,n){
      this.perNCount[n]=(this.perNCount[n]||0)+1;
      this.canon.push({h:h,n:n});
      const limit=this.perNMax[n]||50;
      if(this.perNCount[n]>limit){
        const idx=this.canon.findIndex(e=>e.n===n);
        if(idx>=0){this.canon.splice(idx,1);this.perNCount[n]--;}
      }
      while(this.canon.length>this.maxCanon){
        const e=this.canon.shift();this.perNCount[e.n]--;
      }
    },
    hasCanon(h){return this.canon.some(e=>e.h===h);},
    add(buf,k,cap){buf.push(k);if(buf.length>cap)buf.shift();},
    countIn(buf,k,n){let c=0;const start=Math.max(0,buf.length-n);for(let i=start;i<buf.length;i++)if(buf[i]===k)c++;return c;},
    clear(){this.canon=[];this.silhouettes=[];this.distrStyles=[];this.correctPos=[];this.perNCount={};}
  };

  const Adapt={
    win:[],winSize:8,bias:0,
    record(correct,ms,timerMs,corrStyle,pickedStyle){
      this.win.push({c:correct?1:0,ms:ms||0,t:timerMs||5000});
      if(this.win.length>this.winSize)this.win.shift();
      if(!correct&&pickedStyle&&pickedStyle.indexOf('mirror')===0)G.skill.mirrorErrors++;
      if(!correct&&pickedStyle==='nearMatch')G.skill.nearErrors++;
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(const e of this.win){acc+=e.c;rt+=e.ms;tref+=e.t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.5)this.bias=Math.min(2,this.bias+1);
      else if(acc<0.6)this.bias=Math.max(-2,this.bias-1);
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(const e of this.win)a+=e.c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(const e of this.win)r+=e.ms;return r/this.win.length;},
    reset(){this.win=[];this.bias=0;}
  };

  /* visibility pause */
  let _hidTs=0;
  const _onVis=()=>{
    if(document.hidden){_hidTs=Date.now();if(G.barT){_cti(G.barT);G.barT=null;}}
    else if(_hidTs){G.roundOffPause+=Date.now()-_hidTs;_hidTs=0;_resumeTimer();}
  };
  document.addEventListener('visibilitychange',_onVis);
  function _cleanup(){
    document.removeEventListener('visibilitychange',_onVis);
    if(G.barT){_cti(G.barT);G.barT=null;}
  }
  wrap.addEventListener('remove_game',_cleanup);

  /* ---------- shape factory ---------- */
  function SS_shapeOkForChallenge(cells,challengeType){
    if(challengeType==='mirror'&&SS_mirrorSet(cells).size===0)return false;
    if(challengeType==='missing'){
      const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(let i=0;i<cells.length;i++){let nb=0;for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}if(nb<=1)return true;}
      return false;
    }
    if(challengeType==='completion'&&cells.length<4)return false;
    return true;
  }
  function SS_makeFreshShape(n,opts){
    let attempts=0;
    while(attempts<10){
      attempts++;
      const branching=opts&&opts.branching!=null?opts.branching:(0.3+Math.random()*0.5);
      const cells=SS_genShape(n,{branching:branching});
      if(cells.length<n)continue;
      if(SS_isDegenerate(cells,{banFullSym:true}))continue;
      const canon=SS_canonicalHash(cells);
      if(Fresh.hasCanon(canon))continue;
      const sil=SS_silhouetteKey(cells);
      if(Fresh.countIn(Fresh.silhouettes,sil,4)>=2)continue;
      return{cells:cells,canon:canon,sil:sil};
    }
    while(attempts<20){
      attempts++;
      const cells=SS_genShape(n,{branching:0.5});
      if(cells.length<n)continue;
      if(SS_isDegenerate(cells,{banFullSym:true}))continue;
      return{cells:cells,canon:SS_canonicalHash(cells),sil:SS_silhouetteKey(cells)};
    }
    const fb=SS_norm([[0,0],[1,0],[1,1]]);
    return{cells:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb)};
  }

  /* ---------- CHALLENGE TYPE PICKER ---------- */
  function SS_pickChallengeType(){
    const weights=SS_CHALLENGE_WEIGHTS[mode];
    const types=Object.keys(weights).filter(k=>weights[k]>0);
    const last5=G.challengeHistory.slice(-5);
    const lastType=last5.length?last5[last5.length-1]:null;

    /* weighted random with anti-repeat */
    let pool=types.filter(t=>t!==lastType);
    if(!pool.length)pool=types;

    /* reduce weight if appeared in last 3 */
    const adjusted=pool.map(t=>{
      let w=weights[t];
      const recentCount=last5.filter(x=>x===t).length;
      if(recentCount>=2)w*=0.3;
      else if(recentCount>=1)w*=0.7;
      /* harder types less frequent early */
      if(G.round<5&&(t==='chain'||t==='memory'||t==='completion'))w*=0.4;
      return{type:t,w:w};
    });
    const total=adjusted.reduce((s,e)=>s+e.w,0);
    let r=Math.random()*total,cum=0;
    for(const e of adjusted){cum+=e.w;if(r<=cum)return e.type;}
    return adjusted[adjusted.length-1].type;
  }

  /* ---------- distractor generators ---------- */
  function SS_shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function SS_avoidStalePos(opts){
    const idx=opts.findIndex(o=>o.correct);
    if(idx<0)return;
    const recent=Fresh.correctPos.slice(-5);
    if(recent.filter(p=>p===idx).length>=2&&opts.length>1){
      let bestSlot=idx,bestC=99;
      for(let i=0;i<opts.length;i++){
        const c=recent.filter(p=>p===i).length;
        if(c<bestC){bestC=c;bestSlot=i;}
      }
      if(bestSlot!==idx){const t=opts[idx];opts[idx]=opts[bestSlot];opts[bestSlot]=t;}
    }
  }
  function SS_distRandom(target,banSet){
    const rot=SS_rotationSet(target);
    for(let t=0;t<8;t++){
      const sh=SS_makeFreshShape(target.length,{});
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      if(rot.has(h))continue;
      return{cells:sh.cells,style:'random'};
    }
    return null;
  }
  function SS_distMirror(target,banSet,extraRot){
    let m=SS_mirrorH(target);
    for(let i=0;i<(extraRot||0);i++)m=SS_rotateCW(m);
    const h=SS_hash(m);
    if(banSet.has(h))return null;
    const rot=SS_rotationSet(target);
    if(rot.has(h))return null;
    const style=extraRot===0?'mirror0':extraRot===1?'mirror90':extraRot===2?'mirror180':'mirror270';
    return{cells:m,style:style};
  }
  function SS_distOneBlockMod(target,banSet){
    const leaves=[];
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb<=1)leaves.push(i);
    }
    if(!leaves.length)return null;
    for(let t=0;t<6;t++){
      const idx=leaves[Math.floor(Math.random()*leaves.length)];
      const remaining=target.filter((_,i)=>i!==idx);
      if(!SS_isConnected(remaining))continue;
      const front=SS_frontier(remaining);
      const targetKey=target[idx][0]+','+target[idx][1];
      const candidates=front.filter(p=>p[0]+','+p[1]!==targetKey);
      if(!candidates.length)continue;
      const newCell=candidates[Math.floor(Math.random()*candidates.length)];
      const newCells=SS_norm(remaining.concat([newCell]));
      const h=SS_hash(newCells);
      if(banSet.has(h))continue;
      const rot=SS_rotationSet(target);if(rot.has(h))continue;
      const mir=SS_mirrorSet(target);if(mir.has(h))continue;
      return{cells:newCells,style:'oneBlockMod'};
    }
    return null;
  }
  function SS_distBranchSwap(target,banSet){
    const leaves=[];
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb===1)leaves.push(i);
    }
    if(leaves.length<2)return null;
    let bestPair=null,bestD=-1;
    for(let i=0;i<leaves.length;i++){
      for(let j=i+1;j<leaves.length;j++){
        const a=target[leaves[i]],b=target[leaves[j]];
        const d=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
        if(d>bestD){bestD=d;bestPair=[leaves[i],leaves[j]];}
      }
    }
    if(!bestPair)return null;
    const remIdx=bestPair[0],anchor=target[bestPair[1]];
    const remaining=target.filter((_,i)=>i!==remIdx);
    if(!SS_isConnected(remaining))return null;
    const front=SS_frontier(remaining);
    front.sort((a,b)=>(Math.abs(a[0]-anchor[0])+Math.abs(a[1]-anchor[1]))-(Math.abs(b[0]-anchor[0])+Math.abs(b[1]-anchor[1])));
    for(let i=0;i<front.length;i++){
      const newCells=SS_norm(remaining.concat([front[i]]));
      const h=SS_hash(newCells);
      if(banSet.has(h))continue;
      const rot=SS_rotationSet(target);if(rot.has(h))continue;
      const mir=SS_mirrorSet(target);if(mir.has(h))continue;
      return{cells:newCells,style:'branchSwap'};
    }
    return null;
  }
  function SS_distNearMatch(target,banSet){
    const targetBB=SS_bbox(target);
    for(let t=0;t<10;t++){
      const sh=SS_makeFreshShape(target.length,{branching:0.5+Math.random()*0.3});
      const bb=SS_bbox(sh.cells);
      if(Math.abs(bb.rows*bb.cols-targetBB.rows*targetBB.cols)>2)continue;
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      const rot=SS_rotationSet(target);if(rot.has(h))continue;
      const mir=SS_mirrorSet(target);if(mir.has(h))continue;
      return{cells:sh.cells,style:'nearMatch'};
    }
    return null;
  }

  /* ---------- RECIPE-BASED OPTION ASSEMBLY ---------- */
  function SS_recipeForDifficulty(){
    const acc=Adapt.accuracy();
    if(mode==='expert')return'hard';
    if(mode==='speed')return'easy';
    if(acc>=0.85&&Adapt.bias>=1)return'hard';
    if(acc>=0.7)return'medium';
    return'easy';
  }

  function SS_buildRotationOptions(target){
    const banSet=new Set();
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    let correctCells;
    if(rotList.length>1){
      const nonId=rotList.slice(1);
      correctCells=nonId[Math.floor(Math.random()*nonId.length)];
    }else{correctCells=rotList[0];}
    banSet.add(SS_hash(correctCells));
    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};
    const recipe=SS_recipeForDifficulty();
    if(recipe==='easy'){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distRandom(target,banSet));
      tryAdd(SS_distRandom(target,banSet));
    }else if(recipe==='medium'){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distNearMatch(target,banSet));
      tryAdd(SS_distOneBlockMod(target,banSet)||SS_distNearMatch(target,banSet));
    }else{
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distMirror(target,banSet,2));
      tryAdd(SS_distBranchSwap(target,banSet)||SS_distNearMatch(target,banSet));
    }
    while(wrong.length<3){const f=SS_distRandom(target,banSet);if(!f)break;banSet.add(SS_hash(f.cells));wrong.push(f);}
    if(wrong.length<3)return null;
    const opts=[{cells:correctCells,correct:true,style:'rotation'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'rotation',promptCells:promptCells,options:opts};
  }

  function SS_buildMirrorOptions(target){
    const banSet=new Set();
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    const mirSet=SS_mirrorSet(target);
    const mirList=Array.from(mirSet.values());
    if(!mirList.length)return null;
    const correctCells=mirList[Math.floor(Math.random()*mirList.length)];
    banSet.add(SS_hash(correctCells));
    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};
    /* use rotations as distractors for mirror mode */
    const fillers=rotList.filter(c=>SS_hash(c)!==SS_hash(promptCells));
    for(let i=0;i<fillers.length&&wrong.length<3;i++){
      const h=SS_hash(fillers[i]);
      if(!banSet.has(h)){banSet.add(h);wrong.push({cells:fillers[i],style:'rotationFiller'});}
    }
    while(wrong.length<3){const f=SS_distNearMatch(target,banSet)||SS_distRandom(target,banSet);if(!f)break;banSet.add(SS_hash(f.cells));wrong.push(f);}
    if(wrong.length<3)return null;
    const opts=[{cells:correctCells,correct:true,style:'mirrorAnswer'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'mirror',promptCells:promptCells,options:opts};
  }

  function SS_buildMissingOptions(target){
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const candidates=[];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb===1)candidates.push(i);
    }
    if(!candidates.length)return null;
    const removedIdx=candidates[Math.floor(Math.random()*candidates.length)];
    const removedCell=target[removedIdx];
    const partial=target.filter((_,i)=>i!==removedIdx);
    if(!SS_isConnected(partial))return null;
    let mr=Infinity,mc=Infinity;
    for(let i=0;i<partial.length;i++){if(partial[i][0]<mr)mr=partial[i][0];if(partial[i][1]<mc)mc=partial[i][1];}
    const partialNorm=SS_norm(partial);
    const removedShifted=[removedCell[0]-mr,removedCell[1]-mc];
    const front=SS_frontier(partialNorm);
    const correctPos=removedShifted;
    const targetCanon=SS_canonicalHash(target);
    const distractorPositions=[];
    const pool=front.filter(p=>!(p[0]===correctPos[0]&&p[1]===correctPos[1]));
    SS_shuffle(pool);
    for(let i=0;i<pool.length&&distractorPositions.length<3;i++){
      const candCells=SS_norm(partialNorm.concat([pool[i]]));
      if(SS_canonicalHash(candCells)===targetCanon)continue;
      distractorPositions.push(pool[i]);
    }
    if(distractorPositions.length<3)return null;
    const opts=[{pos:correctPos,correct:true,style:'missingCorrect'}]
      .concat(distractorPositions.map(p=>({pos:p,correct:false,style:'missingWrong'})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'missing',partial:partialNorm,options:opts};
  }

  function SS_buildMemoryOptions(target){
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    const banSet=new Set();
    banSet.add(SS_hash(promptCells));
    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};
    /* other rotations as wrong answers */
    for(let i=1;i<rotList.length&&wrong.length<3;i++){
      const h=SS_hash(rotList[i]);
      if(!banSet.has(h)){banSet.add(h);wrong.push({cells:rotList[i],style:'rotationFiller'});}
    }
    while(wrong.length<3){const f=SS_distNearMatch(target,banSet)||SS_distRandom(target,banSet);if(!f)break;banSet.add(SS_hash(f.cells));wrong.push(f);}
    if(wrong.length<3)return null;
    const opts=[{cells:promptCells,correct:true,style:'memoryCorrect'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'memory',promptCells:promptCells,options:opts,memoryDelay:2000};
  }

  function SS_buildAngleOptions(target){
    const angle=[90,180,270][Math.floor(Math.random()*3)];
    const promptCells=SS_norm(target);
    let afterCells=promptCells;
    const steps=angle/90;
    for(let i=0;i<steps;i++)afterCells=SS_rotateCW(afterCells);
    const allAngles=[90,180,270];
    const otherAngles=allAngles.filter(a=>a!==angle);
    /* build 4 options: correct + 2 wrong + 1 more */
    const opts=[{label:angle+'\u00B0',angle:angle,correct:true,style:'angle'+angle}];
    SS_shuffle(otherAngles);
    otherAngles.forEach(a=>opts.push({label:a+'\u00B0',angle:a,correct:false,style:'angle'+a}));
    /* add a "360°" option if only 3 */
    if(opts.length<4)opts.push({label:'360\u00B0',angle:360,correct:false,style:'angle360'});
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'angle',promptCells:promptCells,afterCells:afterCells,options:opts,angle:angle};
  }

  function SS_buildOddOneOutOptions(target){
    /* target = the base shape; 3 rotations of it + 1 different shape */
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    /* pick 3 from rotation family */
    let sameFamily=rotList.slice();
    while(sameFamily.length<3){sameFamily.push(rotList[Math.floor(Math.random()*rotList.length)]);}
    SS_shuffle(sameFamily);
    sameFamily=sameFamily.slice(0,3);
    /* generate 1 genuinely different shape (different canonical hash) */
    let oddShape=null;
    const targetCanon=SS_canonicalHash(target);
    for(let t=0;t<15;t++){
      const sh=SS_makeFreshShape(target.length,{branching:0.3+Math.random()*0.5});
      if(SS_canonicalHash(sh.cells)===targetCanon)continue;
      if(mode==='expert'){
        /* near-identical: only 1 block different */
        const bb1=SS_bbox(target),bb2=SS_bbox(sh.cells);
        if(Math.abs(bb1.rows*bb1.cols-bb2.rows*bb2.cols)>2)continue;
      }
      oddShape=sh.cells;
      break;
    }
    if(!oddShape)return null;
    const opts=sameFamily.map(c=>({cells:c,correct:false,style:'sameFamily'}));
    opts.push({cells:oddShape,correct:true,style:'oddOne'});
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'oddoneout',options:opts};
  }

  function SS_buildChainOptions(target){
    /* Show A → ?? → final. Player picks intermediate from 4 options */
    const rotList=Array.from(SS_rotationSet(target).values());
    if(rotList.length<3){
      /* need at least 3 distinct rotations for a chain */
      return null;
    }
    /* pick 3 sequential rotations: A, B=CW(A), C=CW(B) */
    const A=rotList[0];
    const B=SS_rotateCW(A);
    const C=SS_rotateCW(B);
    /* question: A → [?] → C  (answer is B) */
    const banSet=new Set();
    banSet.add(SS_hash(B));
    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};
    /* use mirror and random as wrong answers */
    tryAdd(SS_distMirror(target,banSet,0));
    tryAdd(SS_distNearMatch(target,banSet));
    while(wrong.length<3){const f=SS_distRandom(target,banSet);if(!f)break;banSet.add(SS_hash(f.cells));wrong.push(f);}
    if(wrong.length<3)return null;
    const opts=[{cells:B,correct:true,style:'chainCorrect'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'chain',promptA:A,promptC:C,options:opts};
  }

  function SS_buildCompletionOptions(target){
    /* show half the shape; player picks complete shape from 4 */
    if(target.length<4)return null;
    const halfN=Math.floor(target.length/2);
    const indices=target.map((_,i)=>i);
    SS_shuffle(indices);
    const visibleIdxs=indices.slice(0,halfN);
    const hiddenIdxs=indices.slice(halfN);
    const visible=visibleIdxs.map(i=>target[i]);
    if(!SS_isConnected(visible)){
      /* try to keep visible connected */
      return null;
    }
    const banSet=new Set();
    banSet.add(SS_hash(SS_norm(target)));
    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};
    for(let t=0;t<12&&wrong.length<3;t++){
      const sh=SS_makeFreshShape(target.length,{});
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      banSet.add(h);
      wrong.push({cells:sh.cells,style:'completionWrong'});
    }
    if(wrong.length<3)return null;
    const opts=[{cells:SS_norm(target),correct:true,style:'completionCorrect'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return{challengeType:'completion',visible:SS_norm(visible),hiddenCells:hiddenIdxs.map(i=>target[i]),options:opts};
  }

  /* ---------- master round builder ---------- */
  function SS_buildRound(challengeType,n){
    for(let attempt=0;attempt<8;attempt++){
      const sh=SS_makeFreshShape(n,{branching:0.25+Math.random()*0.5});
      if(!SS_shapeOkForChallenge(sh.cells,challengeType))continue;
      let built=null;
      switch(challengeType){
        case 'rotation':  built=SS_buildRotationOptions(sh.cells);break;
        case 'mirror':    built=SS_buildMirrorOptions(sh.cells);break;
        case 'missing':   built=SS_buildMissingOptions(sh.cells);break;
        case 'memory':    built=SS_buildMemoryOptions(sh.cells);break;
        case 'angle':     built=SS_buildAngleOptions(sh.cells);break;
        case 'oddoneout': built=SS_buildOddOneOutOptions(sh.cells);break;
        case 'chain':     built=SS_buildChainOptions(sh.cells);break;
        case 'completion':built=SS_buildCompletionOptions(sh.cells);break;
      }
      if(!built)continue;
      const round={
        challengeType:challengeType,
        rule:challengeType,/* compat for verifier */
        target:sh.cells,canon:sh.canon,sil:sh.sil,
        promptCells:built.promptCells||sh.cells,
        partial:built.partial,
        promptA:built.promptA,promptC:built.promptC,
        afterCells:built.afterCells,angle:built.angle,
        visible:built.visible,hiddenCells:built.hiddenCells,
        memoryDelay:built.memoryDelay,
        options:built.options
      };
      if(SS_verifyRound(round))return round;
    }
    return null;
  }

  /* ---------- correctness verifier ---------- */
  function SS_verifyRound(round){
    if(!round||!round.options||round.options.length!==4)return false;
    if(round.options.filter(o=>o.correct).length!==1)return false;
    const ct=round.challengeType||round.rule;
    if(ct==='rotation'||ct==='mirror'){
      const target=round.target;
      const rot=SS_rotationSet(target);
      const mir=SS_mirrorSet(target);
      const seen=new Set();
      for(let i=0;i<round.options.length;i++){
        const o=round.options[i];
        if(!o.cells)return false;
        const h=SS_hash(o.cells);
        if(seen.has(h))return false;
        seen.add(h);
        if(ct==='rotation'){
          if(o.correct&&!rot.has(h))return false;
          if(!o.correct&&rot.has(h))return false;
        }else{
          if(o.correct&&!mir.has(h))return false;
          if(!o.correct&&mir.has(h))return false;
        }
      }
      return true;
    }
    if(ct==='missing'){
      const seen=new Set();
      for(let i=0;i<round.options.length;i++){
        const o=round.options[i];
        const k=o.pos[0]+','+o.pos[1];
        if(seen.has(k))return false;
        seen.add(k);
      }
      const correct=round.options.find(o=>o.correct);
      if(!correct)return false;
      const reconstituted=SS_norm(round.partial.concat([correct.pos]));
      if(SS_canonicalHash(reconstituted)!==SS_canonicalHash(round.target))return false;
      return true;
    }
    if(ct==='memory'){
      const seen=new Set();
      for(let i=0;i<round.options.length;i++){
        if(!round.options[i].cells)return false;
        const h=SS_hash(round.options[i].cells);
        if(seen.has(h))return false;
        seen.add(h);
      }
      return true;
    }
    if(ct==='angle'){
      const ok=round.options.filter(o=>o.angle===round.angle&&o.correct);
      if(ok.length!==1)return false;
      return true;
    }
    if(ct==='oddoneout'){
      /* exactly 1 correct (the odd one) */
      return round.options.filter(o=>o.correct).length===1;
    }
    if(ct==='chain'){
      return round.options.filter(o=>o.correct).length===1;
    }
    if(ct==='completion'){
      return round.options.filter(o=>o.correct).length===1;
    }
    return false;
  }

  /* ---------- daily / rank ---------- */
  function SS_dailyChallenge(){
    const dayN=Math.floor(Date.now()/86400000);
    const defs=[
      {label:'Get 10 correct answers',target:10},
      {label:'Reach Round 15',target:15},
      {label:'Get 8 correct rotations',target:8},
      {label:'Reach Round 20',target:20},
      {label:'Get 12 correct answers',target:12}
    ];
    return defs[dayN%defs.length];
  }
  function SS_dailyDone(){return S('nz_ss_daily_date')===todayKey()&&!!S('nz_ss_daily_done');}
  function SS_rank(round){
    if(round>=21)return{em:'\uD83D\uDC51',txt:'Spatial Master'};
    if(round>=16)return{em:'\u26A1',         txt:'Rotation Expert'};
    if(round>=11)return{em:'\uD83E\uDDE0',txt:'Spatial Thinker'};
    if(round>=6) return{em:'\uD83D\uDCAA',txt:'Getting Oriented'};
    return{em:'\uD83C\uDF31',txt:'Spatial Beginner'};
  }

  /* ---------- complexity engine ---------- */
  function SS_blockCountForRound(rn){
    const def=SS_MODES[mode];
    let n;
    if(rn<10)n=def.nMin;
    else if(rn<20)n=def.nMin+1;
    else if(rn<30)n=def.nMin+2;
    else if(rn<50)n=def.nMin+3;
    else n=def.nMin+4;
    n+=Adapt.bias;
    if(n<def.nMin)n=def.nMin;
    if(n>def.nMax)n=def.nMax;
    return n;
  }
  function SS_timerForRound(rn){
    const def=SS_MODES[mode];
    if(def.zen)return 0;
    let t=def.time-rn*def.decay;
    t*=1-Adapt.bias*0.05;
    if(t<def.minTime)t=def.minTime;
    if(t>def.time)t=def.time;
    return Math.round(t);
  }

  /* ---------- rendering ---------- */
  function SS_drawShapeSvg(cells,cs,color,opts){
    const nc=SS_norm(cells);
    const bb=SS_bbox(nc);
    const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
    let inner='';
    for(let i=0;i<nc.length;i++){
      inner+='<rect x="'+(nc[i][1]*cs+p)+'" y="'+(nc[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
    }
    if(opts&&opts.ghostCell){
      const g=opts.ghostCell;
      inner+='<rect x="'+(g[1]*cs+p)+'" y="'+(g[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="'+(opts.stroke||'#A78BFA')+'" stroke-width="2" stroke-dasharray="4 3"/>';
    }
    if(opts&&opts.hiddenCells){
      for(let i=0;i<opts.hiddenCells.length;i++){
        const hc=opts.hiddenCells[i];
        inner+='<rect x="'+(hc[1]*cs+p)+'" y="'+(hc[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/>';
      }
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }
  function SS_drawMissingPrompt(partial,cs,color){
    const front=SS_frontier(partial);
    const all=partial.concat(front);
    let mr=Infinity,mc=Infinity,Mr=-Infinity,Mc=-Infinity;
    for(let i=0;i<all.length;i++){
      if(all[i][0]<mr)mr=all[i][0];if(all[i][1]<mc)mc=all[i][1];
      if(all[i][0]>Mr)Mr=all[i][0];if(all[i][1]>Mc)Mc=all[i][1];
    }
    const rows=Mr-mr+1,cols=Mc-mc+1,p=3;
    const w=cols*cs+p*2,h=rows*cs+p*2;
    let inner='';
    for(let i=0;i<partial.length;i++){
      inner+='<rect x="'+((partial[i][1]-mc)*cs+p)+'" y="'+((partial[i][0]-mr)*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
    }
    for(let i=0;i<front.length;i++){
      inner+='<rect x="'+((front[i][1]-mc)*cs+p)+'" y="'+((front[i][0]-mr)*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/>';
      inner+='<text x="'+((front[i][1]-mc)*cs+p+cs/2)+'" y="'+((front[i][0]-mr)*cs+p+cs/2+5)+'" text-anchor="middle" font-size="'+(cs*0.55)+'" fill="#94A3B8" font-weight="700">?</text>';
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }
  function SS_drawCompletionPrompt(visible,hiddenCells,cs,color){
    const all=visible.concat(hiddenCells);
    const nc=SS_norm(all);
    /* compute shift to normalize hidden cells too */
    let mr=Infinity,mc=Infinity;
    for(let i=0;i<all.length;i++){if(all[i][0]<mr)mr=all[i][0];if(all[i][1]<mc)mc=all[i][1];}
    const visNorm=visible.map(c=>[c[0]-mr,c[1]-mc]);
    const hidNorm=hiddenCells.map(c=>[c[0]-mr,c[1]-mc]);
    const bb=SS_bbox(nc);
    const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
    let inner='';
    for(let i=0;i<visNorm.length;i++){
      inner+='<rect x="'+(visNorm[i][1]*cs+p)+'" y="'+(visNorm[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
    }
    for(let i=0;i<hidNorm.length;i++){
      inner+='<rect x="'+(hidNorm[i][1]*cs+p)+'" y="'+(hidNorm[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/>';
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }

  /* ---------- BADGE RENDERER ---------- */
  function SS_renderBadge(challengeType){
    const b=SS_BADGES[challengeType]||SS_BADGES.rotation;
    return '<div class="ss-badge" style="background:'+b.color+';">'+
      '<div class="ss-badge-top"><span class="ss-badge-emoji">'+b.emoji+'</span><span class="ss-badge-name">'+b.name+'</span></div>'+
      '<div class="ss-badge-inst">'+b.instruction+'</div>'+
    '</div>';
  }

  /* ---------- start screen ---------- */
  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_ss_best_round')||0;
    const games=S('nz_ss_games')||0;
    const accH=S('nz_ss_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=SS_dailyChallenge();
    const dcDone=SS_dailyDone();
    const modeKeys=Object.keys(SS_MODES);
    const screen=$('<div class="ss-start">'+
      '<div class="ss-stats">'+
        '<div class="ss-stat"><div class="v">'+bestRound+'</div><div class="l">Best Round</div></div>'+
        '<div class="ss-stat"><div class="v">'+avgAcc+'%</div><div class="l">Accuracy</div></div>'+
        '<div class="ss-stat"><div class="v">'+games+'</div><div class="l">Games</div></div>'+
      '</div>'+
      '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;">'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="dc-ico">'+(dcDone?'\u2705':'\uD83C\uDFAF')+'</div>'+
          '<div style="flex:1;"><div class="dc-name">Daily: '+dc.label+'</div><div class="dc-sub">'+(dcDone?'Completed today!':'Complete for 2x XP')+'</div></div>'+
          '<span class="dc-badge">2x XP</span>'+
        '</div>'+
      '</div>'+
      '<div class="ss-mode-title">Choose a Mode</div>'+
      '<div class="ss-modes ss-modes-v4" id="ssModes"></div>'+
      '<button class="btn-primary" id="ssGo" style="margin-top:18px;width:100%;">Start \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#ssModes');
    modeKeys.forEach(k=>{
      const m=SS_MODES[k];
      const recBadge=k==='classic'?'<span class="ss-rec-badge">RECOMMENDED</span>':'';
      const card=$('<button class="ss-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+recBadge+'</div>'+
        '<div class="sm-grid">'+(m.zen?'No timer':((m.time/1000).toFixed(1)+'s'))+' \u00B7 '+m.nMin+'-'+m.nMax+' blocks</div>'+
        '<div class="sm-sub">'+m.sub+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.ss-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#ssGo').onclick=()=>{
      playSound('tap');
      setS('nz_ss_v4_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ---------- game loop ---------- */
  let host=null;
  let _curRound=null;
  function startGame(){
    G.round=0;G.lives=SS_MODES[mode].lives;G.correctCount=0;G.attempts=0;
    G.comboCount=0;G.comboMax=0;G.pending=false;
    G.challengeHistory=[];
    G.skill={rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},
             memory:{ok:0,n:0},angle:{ok:0,n:0},oddoneout:{ok:0,n:0},completion:{ok:0,n:0},
             mirrorErrors:0,nearErrors:0};
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="ss-play"></div>');
    body.appendChild(host);
    setScore(0);
    nextQ();
  }
  function _resumeTimer(){
    if(!host||SS_MODES[mode].zen||G.barT||!G.timerMs)return;
    _startBar();
  }
  function _startBar(){
    const def=SS_MODES[mode];
    if(def.zen||!G.timerMs)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    G.barT=_si(()=>{
      const elapsed=Date.now()-G.roundStart-G.roundOffPause;
      const pct=Math.max(0,100-elapsed/G.timerMs*100);
      const bar=wrap.querySelector('#ssBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=G.timerMs){_cti(G.barT);G.barT=null;_resolve(-1,true);}
    },80);
  }

  function nextQ(){
    if(G.lives<=0||G.pending)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    const n=SS_blockCountForRound(G.round);

    /* pick challenge type */
    let challengeType=SS_pickChallengeType();
    let round=null;

    /* try picked type first, fallback to rotation */
    round=SS_buildRound(challengeType,n);
    if(!round){
      /* fallback: try rotation */
      challengeType='rotation';
      round=SS_buildRound('rotation',n);
    }
    if(!round){
      /* ultimate fallback */
      const fb=SS_norm([[0,0],[1,0],[1,1]]);
      let built=null;
      try{built=SS_buildRotationOptions(fb);}catch(e){}
      if(built&&built.options&&built.options.length===4){
        round={challengeType:'rotation',rule:'rotation',target:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb),promptCells:built.promptCells,options:built.options};
      }else{
        const mc=SS_norm([[0,0],[1,0],[2,0],[2,1]]);
        const mw=[SS_norm([[0,0],[0,1],[0,2],[0,3]]),SS_norm([[0,0],[1,0],[1,1],[2,1]]),SS_norm([[0,0],[0,1],[1,0],[1,1]])];
        const opts=[{cells:mc,correct:true,style:'rotation'}].concat(mw.map(c=>({cells:c,correct:false,style:'random'})));
        SS_shuffle(opts);
        round={challengeType:'rotation',rule:'rotation',target:mc,canon:SS_canonicalHash(mc),sil:SS_silhouetteKey(mc),promptCells:mc,options:opts};
      }
      challengeType='rotation';
    }

    G.challengeHistory.push(challengeType);
    if(G.challengeHistory.length>10)G.challengeHistory.shift();

    Fresh.addCanon(round.canon,round.target.length);
    Fresh.add(Fresh.silhouettes,round.sil,Fresh.maxSil);
    const styleSummary=(round.options||[]).map(o=>o.style||'-').sort().join('+');
    Fresh.add(Fresh.distrStyles,styleSummary,Fresh.maxStyle);
    const correctIdx=(round.options||[]).findIndex(o=>o.correct);
    if(correctIdx>=0)Fresh.add(Fresh.correctPos,correctIdx,Fresh.maxPos);
    _curRound=round;
    G.timerMs=SS_timerForRound(G.round);
    G.roundStart=Date.now();G.roundOffPause=0;
    renderRound(round);
  }

  /* ---------- render round ---------- */
  function renderRound(round){
    const def=SS_MODES[mode];
    const zen=def.zen;
    const cs=24;
    const ct=round.challengeType;
    const promptColor=SS_PALETTE[G.round%SS_PALETTE.length];
    const optColors=[SS_PALETTE[(G.round+1)%SS_PALETTE.length],SS_PALETTE[(G.round+2)%SS_PALETTE.length],SS_PALETTE[(G.round+3)%SS_PALETTE.length],SS_PALETTE[(G.round+4)%SS_PALETTE.length]];
    const heartsHtml=zen?'<div class="qm-zen-tag">\uD83E\uDDD8 Zen \u2014 no timer / lives</div>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';
    const badge=SS_renderBadge(ct);
    const comboHtml=(def.combo&&G.comboCount>=2)?'<div class="ss-combo">\uD83D\uDD25 '+G.comboCount+'x Combo</div>':'';

    let promptSvg='';
    let optsHtml='';
    let mirrorLine='';

    if(ct==='rotation'){
      promptSvg=SS_drawShapeSvg(round.target,cs,promptColor);
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='mirror'){
      promptSvg=SS_drawShapeSvg(round.target,cs,promptColor);
      mirrorLine='<div class="ss-mirror-line"></div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='missing'){
      promptSvg=SS_drawMissingPrompt(round.partial,cs,promptColor);
      optsHtml=round.options.map((o,i)=>{
        const merged=SS_norm(round.partial.concat([o.pos]));
        return '<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(merged,20,optColors[i],{ghostCell:o.pos,stroke:'#fff'})+'</button>';
      }).join('');
    }else if(ct==='memory'){
      promptSvg=SS_drawShapeSvg(round.promptCells,cs,promptColor);
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='angle'){
      if(mode==='speed'){
        /* side by side, no animation */
        promptSvg=
          '<div class="ss-chain-pair">'+
            '<div class="ss-chain-card"><div class="ss-chain-lbl">BEFORE</div>'+SS_drawShapeSvg(round.promptCells,cs,promptColor)+'</div>'+
            '<div class="ss-chain-arrow">\u2192</div>'+
            '<div class="ss-chain-card"><div class="ss-chain-lbl">AFTER</div>'+SS_drawShapeSvg(round.afterCells,cs,SS_PALETTE[(G.round+2)%SS_PALETTE.length])+'</div>'+
          '</div>';
      }else{
        promptSvg=SS_drawShapeSvg(round.promptCells,cs,promptColor);
      }
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt ss-opt-text" data-i="'+i+'"><span class="ss-angle">'+o.label+'</span></button>').join('');
    }else if(ct==='oddoneout'){
      /* all 4 shapes in a 2×2 grid — each is an option */
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt ss-opt-odd" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='chain'){
      promptSvg=
        '<div class="ss-chain-pair">'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">START</div>'+SS_drawShapeSvg(round.promptA,cs,promptColor)+'</div>'+
          '<div class="ss-chain-arrow">\u2192 90\u00B0 \u2192</div>'+
          '<div class="ss-chain-card ss-chain-q"><div class="ss-chain-lbl">?</div></div>'+
          '<div class="ss-chain-arrow">\u2192 90\u00B0 \u2192</div>'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">END</div>'+SS_drawShapeSvg(round.promptC,cs,SS_PALETTE[(G.round+2)%SS_PALETTE.length])+'</div>'+
        '</div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='completion'){
      promptSvg=SS_drawCompletionPrompt(round.visible,round.hiddenCells,cs,promptColor);
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span>'+comboHtml+'<span>Correct <strong>'+G.correctCount+'</strong></span></div>'+
      badge+
      (ct==='oddoneout'?'':'<div class="ss-disp-wrap">'+mirrorLine+'<div id="ssDisp" class="ss-disp">'+promptSvg+'</div></div>')+
      '<div class="ss-opts'+(ct==='oddoneout'?' ss-opts-odd':'')+'" id="ssOpts">'+optsHtml+'</div>'+
      '<div id="ssFb" class="ss-fb"></div>';

    /* MEMORY: show shape, then hide after delay */
    if(ct==='memory'){
      const dispEl=host.querySelector('#ssDisp');
      const optsEl=host.querySelector('#ssOpts');
      if(optsEl)optsEl.style.visibility='hidden';
      _st(()=>{
        if(dispEl){
          dispEl.innerHTML='<div class="ss-memory-hidden">\uD83E\uDDE0 What was the shape?</div>';
        }
        if(optsEl)optsEl.style.visibility='visible';
      },round.memoryDelay||2000);
    }

    /* ANGLE: animate rotation (non-speed mode) */
    if(ct==='angle'&&mode!=='speed'){
      const dispEl=host.querySelector('#ssDisp');
      if(dispEl){
        _st(()=>{
          dispEl.style.transition='transform 0.6s ease-in-out';
          dispEl.style.transform='rotate('+round.angle+'deg)';
        },400);
      }
    }

    const optEls=host.querySelectorAll('.ss-opt');
    optEls.forEach(btn=>{
      btn.onclick=()=>{
        if(btn.disabled)return;
        if(G.barT){_cti(G.barT);G.barT=null;}
        optEls.forEach(b=>b.disabled=true);
        const i=parseInt(btn.dataset.i,10);
        _resolve(i,false);
      };
    });
    _startBar();
  }

  function _resolve(pickedIdx,timedOut){
    const round=_curRound;
    if(!round)return;
    G.attempts++;
    const ms=Date.now()-G.roundStart-G.roundOffPause;
    const optEls=host.querySelectorAll('.ss-opt');
    optEls.forEach(b=>b.disabled=true);
    const correctIdx=round.options.findIndex(o=>o.correct);
    const fb=host.querySelector('#ssFb');
    const def=SS_MODES[mode];
    const isCorrect=!timedOut&&pickedIdx===correctIdx;
    const pickedStyle=pickedIdx>=0?(round.options[pickedIdx]&&round.options[pickedIdx].style):null;
    const ct=round.challengeType;
    if(G.skill[ct]){G.skill[ct].n++;if(isCorrect)G.skill[ct].ok++;}
    Adapt.record(isCorrect,ms,G.timerMs||5000,round.options[correctIdx]&&round.options[correctIdx].style,pickedStyle);

    if(isCorrect){
      playSound('correct');try{navigator.vibrate&&navigator.vibrate(10);}catch(e){}
      G.correctCount++;
      G.comboCount++;
      if(G.comboCount>G.comboMax)G.comboMax=G.comboCount;
      if(optEls[pickedIdx])optEls[pickedIdx].classList.add('ss-correct');
      /* combo multiplier for speed mode */
      let pts=1;
      if(def.combo&&G.comboCount>=3)pts=Math.min(G.comboCount,5);
      if(fb){fb.style.color='#22C55E';fb.textContent='\u2705 Correct!'+(pts>1?' \u00D7'+pts:'');}
      if(def.combo&&G.comboCount===3){
        const cb=$('<div class="ss-combo-banner">\uD83D\uDD25 3x COMBO!</div>');
        host.appendChild(cb);
        _st(()=>cb.classList.add('ss-combo-out'),800);
        _st(()=>cb.remove(),1400);
      }
      G.round++;setScore(G.round);
      _st(nextQ,def.zen?500:520);
    }else{
      playSound('wrong');try{navigator.vibrate&&navigator.vibrate([20,40,20]);}catch(e){}
      G.comboCount=0;
      if(pickedIdx>=0&&optEls[pickedIdx])optEls[pickedIdx].classList.add('ss-wrong');
      if(optEls[correctIdx])optEls[correctIdx].classList.add('ss-correct');
      if(fb){fb.style.color='#EF4444';fb.textContent=timedOut?'\u23F1 Time\u2019s up!':'\u274C Wrong!';}
      /* on wrong in rotation: animate correct option spinning */
      if(ct==='rotation'&&optEls[correctIdx]){
        optEls[correctIdx].style.transition='transform 0.5s ease';
        optEls[correctIdx].style.transform='rotate(360deg)';
      }
      if(def.zen){
        const exp=$('<div class="ss-explain">'+SS_explainAnswer(round,pickedIdx)+'</div>');
        host.appendChild(exp);
        G.round++;_st(nextQ,1700);
        return;
      }
      const dead=_loseLife();
      if(dead){_st(gameOver,950);return;}
      G.round++;
      _st(nextQ,900);
    }
  }

  function SS_explainAnswer(round,pickedIdx){
    const ct=round.challengeType;
    if(pickedIdx<0)return '\u23F1 Time ran out. Correct answer highlighted.';
    const o=round.options[pickedIdx];
    if(!o)return 'Correct answer highlighted.';

    if(ct==='rotation'){
      if(o.style&&o.style.indexOf('mirror')===0)return '\uD83E\uDE9E That was a MIRROR image \u2014 you needed a rotation.';
      if(o.style==='oneBlockMod'||o.style==='branchSwap')return '\uD83D\uDD0D One block was in a different position \u2014 look carefully.';
      if(o.style==='nearMatch')return '\uD83C\uDFAF Very similar shape but not a rotation of the target.';
      return '\uD83D\uDCA1 That was a different shape entirely.';
    }
    if(ct==='mirror')return '\uD83E\uDE9E The correct answer is the mirror (flipped) version, not a rotation.';
    if(ct==='missing')return '\uD83E\uDDE9 The highlighted block completes the original shape.';
    if(ct==='memory')return '\uD83E\uDDE0 The correct shape was the one shown before it disappeared. Remember the orientation!';
    if(ct==='angle')return '\uD83D\uDD04 The shape rotated '+round.angle+'\u00B0. Count the 90\u00B0 steps.';
    if(ct==='oddoneout')return '\uD83D\uDD35 The highlighted one is from a completely different shape family.';
    if(ct==='chain')return '\u26AB The missing step is one 90\u00B0 rotation from START.';
    if(ct==='completion')return '\uD83D\uDD3A The highlighted option shows the fully completed shape.';
    return 'Correct answer highlighted.';
  }

  function _loseLife(){
    if(SS_MODES[mode].zen)return false;
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    return G.lives<=0;
  }

  /* ---------- game over ---------- */
  function gameOver(){
    _cleanup();
    const finalRound=G.round;
    const accuracy=G.attempts?Math.round(G.correctCount/G.attempts*100):0;
    const prevBest=S('nz_ss_best_round')||0;
    const newPB=finalRound>prevBest;
    if(newPB)setS('nz_ss_best_round',finalRound);
    setS('nz_ss_games',(S('nz_ss_games')||0)+1);
    const accH=S('nz_ss_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_ss_accuracy',accH);
    const dc=SS_dailyChallenge();
    if(!SS_dailyDone()){
      const pass=G.correctCount>=dc.target||finalRound>=dc.target;
      if(pass){setS('nz_ss_daily_date',todayKey());setS('nz_ss_daily_done',true);_st(()=>toast('\uD83C\uDFAF Daily Challenge complete! 2x XP'),700);}
    }
    const skillStore=S('nz_ss_skill')||{rotation:[0,0],mirror:[0,0],missing:[0,0],chain:[0,0],memory:[0,0],angle:[0,0],oddoneout:[0,0],completion:[0,0]};
    Object.keys(SS_BADGES).forEach(k=>{
      skillStore[k]=skillStore[k]||[0,0];
      skillStore[k][0]+=G.skill[k].ok;
      skillStore[k][1]+=G.skill[k].n;
    });
    setS('nz_ss_skill',skillStore);

    const rank=SS_rank(finalRound);
    const xp=Math.max(2,Math.round(finalRound*2.7));
    const insight=SS_buildInsight();
    /* challenge breakdown */
    let breakdownHtml='';
    const ctypes=Object.keys(SS_BADGES);
    const played=ctypes.filter(k=>G.skill[k]&&G.skill[k].n>0);
    if(played.length>1){
      breakdownHtml='<div class="ss-breakdown"><div class="ss-bd-title">Challenge Breakdown</div>';
      played.forEach(k=>{
        const s=G.skill[k];
        const acc=s.n?Math.round(s.ok/s.n*100):0;
        const b=SS_BADGES[k];
        breakdownHtml+='<div class="ss-bd-row"><span>'+b.emoji+' '+b.name+'</span><span>'+acc+'% ('+s.ok+'/'+s.n+')</span></div>';
      });
      breakdownHtml+='</div>';
    }

    setScore(finalRound);
    if(newPB)confetti(50);
    end({
      title:rank.em+' '+rank.txt,
      emoji:rank.em,
      sub:'Round '+finalRound+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
      value:finalRound,points:xp,starThresh:[6,12,20],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Round Reached</span><span class="val">'+finalRound+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'% ('+G.correctCount+'/'+G.attempts+')</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Mode</span><span class="val">'+SS_MODES[mode].emoji+' '+SS_MODES[mode].label+'</span></div>'+
        (SS_MODES[mode].combo?'<div class="row"><span>Max Combo</span><span class="val">\uD83D\uDD25 '+G.comboMax+'x</span></div>':'')+
        '<div class="row"><span>Challenge Types</span><span class="val">'+played.length+' types</span></div>'+
        '<div class="row"><span>XP Earned</span><span class="val">+'+xp+'</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(finalRound,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      breakdownHtml+
      (insight?'<div class="ss-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  function SS_buildInsight(){
    const total=G.attempts;
    if(total<5)return '';
    const mErr=G.skill.mirrorErrors,nErr=G.skill.nearErrors;
    if(mErr>=Math.max(2,total*0.25))return '\uD83E\uDE9E Mirrors tripped you up '+mErr+' times \u2014 practice in Zen mode with mirror challenges.';
    if(nErr>=Math.max(2,total*0.2))return '\uD83C\uDFAF Near-match traps got you '+nErr+' times \u2014 slow down and compare cell-by-cell.';
    const acc=G.correctCount/total;
    if(acc>=0.85&&Adapt.avgRT()<2000)return '\u26A1 Excellent speed AND accuracy! Try Expert or Speed mode.';
    if(acc>=0.85)return '\u2705 High accuracy \u2014 try a faster mode for more challenge.';
    if(acc<0.5)return '\uD83C\uDF31 Build your foundation in Zen mode \u2014 explanations help you learn.';
    return '';
  }

  /* ---------- dev simulation ---------- */
  function SS_runSimulation(){
    const TR=300;const r={};let ge=0;
    Object.keys(SS_MODES).forEach(mk=>{
      mode=mk;Fresh.clear();Adapt.reset();G.round=0;G.lives=SS_MODES[mk].lives;
      G.challengeHistory=[];
      G.skill={rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},
               memory:{ok:0,n:0},angle:{ok:0,n:0},oddoneout:{ok:0,n:0},completion:{ok:0,n:0},
               mirrorErrors:0,nearErrors:0};
      let em=0;const sc={};let vf=0;const types={};
      for(let i=0;i<TR;i++){
        const n=SS_blockCountForRound(G.round);
        const ct=SS_pickChallengeType();
        types[ct]=(types[ct]||0)+1;
        let rd=SS_buildRound(ct,n);
        if(!rd){rd=SS_buildRound('rotation',n);}
        if(!rd){em++;
          const fb=SS_norm([[0,0],[1,0],[1,1]]);
          let bu=null;try{bu=SS_buildRotationOptions(fb);}catch(e){}
          if(bu&&bu.options&&bu.options.length===4)
            rd={challengeType:'rotation',rule:'rotation',target:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb),promptCells:bu.promptCells,options:bu.options};
          else{const mc=SS_norm([[0,0],[1,0],[2,0],[2,1]]);const mw=[SS_norm([[0,0],[0,1],[0,2],[0,3]]),SS_norm([[0,0],[1,0],[1,1],[2,1]]),SS_norm([[0,0],[0,1],[1,0],[1,1]])];
            rd={challengeType:'rotation',rule:'rotation',target:mc,canon:SS_canonicalHash(mc),sil:SS_silhouetteKey(mc),promptCells:mc,
              options:[{cells:mc,correct:true,style:'rotation'}].concat(mw.map(c=>({cells:c,correct:false,style:'random'})))};
            SS_shuffle(rd.options);}
        }
        G.challengeHistory.push(ct);if(G.challengeHistory.length>10)G.challengeHistory.shift();
        Fresh.addCanon(rd.canon,rd.target.length);
        Fresh.add(Fresh.silhouettes,rd.sil,Fresh.maxSil);
        sc[rd.canon]=(sc[rd.canon]||0)+1;
        if(!SS_verifyRound(rd))vf++;
        G.round++;
      }
      r[mk]={emergencies:em,distinctShapes:Object.keys(sc).length,verifyFails:vf,types:types};
      ge+=em;
      console.log('[SS_Sim] '+mk+' emerg='+em+' shapes='+Object.keys(sc).length+' vfails='+vf+' types=',types);
    });
    console.log('[SS_Sim] TOTAL emergencies='+ge);
    return r;
  }
  if(false){console.log('[SpatialSpin] Simulation results:',SS_runSimulation());}

  renderStart();
}
