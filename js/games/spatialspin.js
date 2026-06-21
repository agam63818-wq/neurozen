/* ===================== SPATIAL SPIN v3 — procedural redesign =====================
 *  Entry: playSpatialSpin(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed SS_ to avoid collisions with other games.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
 *  CSS prefix preserved: .ss-
 *  localStorage keys preserved: nz_ss_best_round, nz_ss_games, nz_ss_accuracy,
 *                               nz_ss_daily_date, nz_ss_daily_done
 *  New keys (additive): nz_ss_v3_seen, nz_ss_skill
 *
 *  Rotation/reflection convention (used IDENTICALLY at generation + validation):
 *    cells = [[row,col], ...] integer grid
 *    rotateCW : [r,c] -> [c, maxR - r], then normalize
 *    mirrorH  : [r,c] -> [r, maxC - c], then normalize
 *    rotation set of shape T = { T, CW(T), CW2(T), CW3(T) } deduped by hash
 *    mirror   set of shape T = { mirrorH(R) | R in rotation set } deduped, minus rotation set
 * ============================================================================ */

/* ---------- MODE DEFS ---------- */
const SS_MODES={
  easy   :{label:'Easy',         emoji:'\uD83D\uDFE2',sub:'4 blocks \u00B7 clean distractors',time:10000,minTime:6000,decay:300,rule:'rotation',nMin:4,nMax:4,recipe:'easy',  zen:false},
  medium :{label:'Medium',       emoji:'\uD83D\uDFE1',sub:'4-5 blocks \u00B7 near-match traps', time:8000, minTime:4500,decay:250,rule:'rotation',nMin:4,nMax:5,recipe:'medium',zen:false},
  hard   :{label:'Hard',         emoji:'\uD83D\uDD34',sub:'5-7 blocks \u00B7 mirror traps',     time:6000, minTime:3500,decay:200,rule:'rotation',nMin:5,nMax:7,recipe:'hard',  zen:false},
  speed  :{label:'Speed',        emoji:'\u26A1',         sub:'3.5s flat \u00B7 chain reflexes',    time:3500, minTime:2500,decay:0,  rule:'rotation',nMin:4,nMax:5,recipe:'easy',  zen:false},
  zen    :{label:'Zen',          emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 explanations',        time:0,    minTime:0,   decay:0,  rule:'rotation',nMin:4,nMax:6,recipe:'medium',zen:true},
  mirror :{label:'Mirror Hunter',emoji:'\uD83E\uDE9E',sub:'Pick the MIRROR, not the rotation',  time:7000, minTime:4500,decay:200,rule:'mirror',  nMin:4,nMax:6,recipe:'mirror',zen:false},
  missing:{label:'Missing Block',emoji:'\uD83E\uDDE9',sub:'Where does the missing block go?',   time:8000, minTime:5000,decay:200,rule:'missing', nMin:4,nMax:6,recipe:'missing',zen:false},
  chain  :{label:'Rotation Chain',emoji:'\uD83D\uDD17',sub:'By what angle was it rotated?',      time:7000, minTime:4500,decay:200,rule:'chain',   nMin:4,nMax:6,recipe:'chain', zen:false}
};
const SS_MODE_ORDER=['easy','medium','hard','speed','zen','mirror','missing','chain'];
const SS_PALETTE=['#7C3AED','#4F8EF7','#34D399','#F97316','#EC4899','#06B6D4','#A855F7','#EF4444'];

/* ---------- SHAPE MATH ---------- */
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
  let mode='easy';

  const G={
    round:0,lives:3,correctCount:0,attempts:0,
    barT:null,roundStart:0,roundOffPause:0,timerMs:0,
    pending:false,
    skill:{rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},mirrorErrors:0,nearErrors:0}
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

  /* ---------- shape factory with quality gate + mode-aware filtering ---------- */
  function SS_shapeOkForMode(cells){
    const rule=SS_MODES[mode].rule;
    if(rule==='mirror'&&SS_mirrorSet(cells).size===0)return false;
    if(rule==='missing'){
      const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(let i=0;i<cells.length;i++){let nb=0;for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}if(nb<=1)return true;}
      return false;
    }
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
      if(!SS_shapeOkForMode(cells))continue;
      const sil=SS_silhouetteKey(cells);
      if(Fresh.countIn(Fresh.silhouettes,sil,4)>=2)continue;
      return{cells:cells,canon:canon,sil:sil};
    }
    /* relaxed pass: only correctness rules + mode filter */
    while(attempts<20){
      attempts++;
      const cells=SS_genShape(n,{branching:0.5});
      if(cells.length<n)continue;
      if(SS_isDegenerate(cells,{banFullSym:true}))continue;
      if(!SS_shapeOkForMode(cells))continue;
      return{cells:cells,canon:SS_canonicalHash(cells),sil:SS_silhouetteKey(cells)};
    }
    const fb=SS_norm([[0,0],[1,0],[1,1]]);
    return{cells:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb)};
  }

  /* ---------- distractors ---------- */
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
      for(let j=0;j<4;j++){
        const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);
        if(setKey.has(k))nb++;
      }
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
      for(let j=0;j<4;j++){
        const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);
        if(setKey.has(k))nb++;
      }
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

  /* ---------- option assembly ---------- */
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

  function SS_buildOptions(target,recipe){
    const banSet=new Set();
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    let correctCells;
    if(recipe==='mirror'){
      const mirSet=SS_mirrorSet(target);
      const mirList=Array.from(mirSet.values());
      if(!mirList.length)return null;
      correctCells=mirList[Math.floor(Math.random()*mirList.length)];
    }else if(rotList.length>1){
      const nonIdentity=rotList.slice(1);
      correctCells=nonIdentity[Math.floor(Math.random()*nonIdentity.length)];
    }else{
      correctCells=rotList[0];
    }
    banSet.add(SS_hash(correctCells));

    const wrong=[];
    const tryAdd=(g)=>{if(g){const h=SS_hash(g.cells);if(!banSet.has(h)){banSet.add(h);wrong.push(g);}}};

    if(recipe==='easy'){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distRandom(target,banSet));
      tryAdd(SS_distRandom(target,banSet));
    }else if(recipe==='medium'){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distNearMatch(target,banSet));
      tryAdd(SS_distOneBlockMod(target,banSet)||SS_distNearMatch(target,banSet));
    }else if(recipe==='hard'){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distMirror(target,banSet,2));
      tryAdd(SS_distBranchSwap(target,banSet)||SS_distNearMatch(target,banSet));
    }else if(recipe==='mirror'){
      const fillers=rotList.filter(c=>SS_hash(c)!==SS_hash(promptCells));
      for(let i=0;i<fillers.length&&wrong.length<3;i++){
        const h=SS_hash(fillers[i]);
        if(!banSet.has(h)){banSet.add(h);wrong.push({cells:fillers[i],style:'rotationFiller'});}
      }
      while(wrong.length<3){
        const f=SS_distNearMatch(target,banSet)||SS_distRandom(target,banSet);
        if(!f)break;
        banSet.add(SS_hash(f.cells));
        wrong.push(f);
      }
    }
    while(wrong.length<3){
      const f=SS_distRandom(target,banSet);
      if(!f)break;
      banSet.add(SS_hash(f.cells));
      wrong.push(f);
    }
    if(wrong.length<3)return null;

    const correctStyle=recipe==='mirror'?'mirrorAnswer':'rotation';
    const opts=[{cells:correctCells,correct:true,style:correctStyle}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);
    SS_avoidStalePos(opts);
    return{promptCells:promptCells,options:opts};
  }

  function SS_buildMissingOptions(target){
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const candidates=[];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){
        const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);
        if(setKey.has(k))nb++;
      }
      if(nb===1)candidates.push(i);
    }
    if(!candidates.length)return null;
    const removedIdx=candidates[Math.floor(Math.random()*candidates.length)];
    const removedCell=target[removedIdx];
    const partial=target.filter((_,i)=>i!==removedIdx);
    if(!SS_isConnected(partial))return null;
    /* shift removed cell into partial-normalized frame */
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
    SS_shuffle(opts);
    SS_avoidStalePos(opts);
    return{rule:'missing',partial:partialNorm,options:opts};
  }

  function SS_buildChainOptions(target){
    const angle=[0,90,180,270][Math.floor(Math.random()*4)];
    const promptCells=SS_norm(target);
    let afterCells=promptCells;
    const steps=angle/90;
    for(let i=0;i<steps;i++)afterCells=SS_rotateCW(afterCells);
    const opts=[
      {label:'0\u00B0', angle:0,  correct:angle===0,  style:'chain0'},
      {label:'90\u00B0',angle:90, correct:angle===90, style:'chain90'},
      {label:'180\u00B0',angle:180,correct:angle===180,style:'chain180'},
      {label:'270\u00B0',angle:270,correct:angle===270,style:'chain270'}
    ];
    SS_shuffle(opts);
    SS_avoidStalePos(opts);
    return{rule:'chain',promptCells:promptCells,afterCells:afterCells,options:opts,angle:angle};
  }

  /* ---------- correctness verifier (always-on) ---------- */
  function SS_verifyRound(round){
    if(!round||!round.options||round.options.length!==4)return false;
    if(round.options.filter(o=>o.correct).length!==1)return false;
    if(round.rule==='rotation'||round.rule==='mirror'){
      const target=round.target;
      const rot=SS_rotationSet(target);
      const mir=SS_mirrorSet(target);
      const seen=new Set();
      for(let i=0;i<round.options.length;i++){
        const o=round.options[i];
        const h=SS_hash(o.cells);
        if(seen.has(h))return false;
        seen.add(h);
        if(round.rule==='rotation'){
          if(o.correct&&!rot.has(h))return false;
          if(!o.correct&&rot.has(h))return false;
        }else{
          if(o.correct&&!mir.has(h))return false;
          if(!o.correct&&mir.has(h))return false;
        }
      }
      return true;
    }
    if(round.rule==='missing'){
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
    if(round.rule==='chain'){
      const ok=round.options.filter(o=>o.angle===round.angle&&o.correct);
      if(ok.length!==1)return false;
      if(round.options.filter(o=>!o.correct).length!==3)return false;
      const angles=new Set(round.options.map(o=>o.angle));
      return angles.size===4;
    }
    return false;
  }

  /* ---------- daily / rank ---------- */
  function SS_dailyChallenge(){
    const dayN=Math.floor(Date.now()/86400000);
    const defs=[
      {label:'Get 10 correct rotations',target:10},
      {label:'Reach Round 15',target:15},
      {label:'Get 8 correct rotations',target:8},
      {label:'Reach Round 20',target:20},
      {label:'Get 12 correct rotations',target:12}
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
  function SS_recipeForRound(){
    const def=SS_MODES[mode];
    let r=def.recipe;
    if(def.zen)return r;
    if(r==='easy'&&Adapt.bias>=2)r='medium';
    else if(r==='medium'&&Adapt.bias>=2)r='hard';
    else if(r==='medium'&&Adapt.bias<=-1)r='easy';
    else if(r==='hard'&&Adapt.bias<=-1)r='medium';
    return r;
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

  /* ---------- start screen ---------- */
  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_ss_best_round')||0;
    const games=S('nz_ss_games')||0;
    const accH=S('nz_ss_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=SS_dailyChallenge();
    const dcDone=SS_dailyDone();
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
      '<div class="ss-modes ss-modes-v3" id="ssModes"></div>'+
      '<button class="btn-primary" id="ssGo" style="margin-top:18px;width:100%;">Start \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#ssModes');
    SS_MODE_ORDER.forEach(k=>{
      const m=SS_MODES[k];
      const card=$('<button class="ss-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid">'+(m.zen?'No timer':((m.time/1000).toFixed(1)+'s'))+' \u00B7 '+m.nMin+'-'+m.nMax+' blocks</div>'+
        '<div class="sm-sub">'+m.sub+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.ss-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#ssGo').onclick=()=>{
      playSound('tap');
      setS('nz_ss_v3_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ---------- game loop ---------- */
  let host=null;
  let _curRound=null;
  function startGame(){
    G.round=0;G.lives=SS_MODES[mode].zen?Infinity:3;G.correctCount=0;G.attempts=0;
    G.pending=false;
    G.skill={rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},mirrorErrors:0,nearErrors:0};
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
    const def=SS_MODES[mode];
    const n=SS_blockCountForRound(G.round);
    let round=null;
    for(let attempt=0;attempt<8;attempt++){
      const sh=SS_makeFreshShape(n,{branching:0.25+Math.random()*0.5});
      let built;
      if(def.rule==='missing'){
        built=SS_buildMissingOptions(sh.cells);
      }else if(def.rule==='chain'){
        built=SS_buildChainOptions(sh.cells);
      }else if(def.rule==='mirror'){
        built=SS_buildOptions(sh.cells,'mirror');
      }else{
        built=SS_buildOptions(sh.cells,SS_recipeForRound());
      }
      if(!built){Fresh.addCanon(sh.canon,n);continue;}
      const candidate={
        rule:def.rule,target:sh.cells,canon:sh.canon,sil:sh.sil,
        promptCells:built.promptCells||sh.cells,
        partial:built.partial,afterCells:built.afterCells,angle:built.angle,
        options:built.options
      };
      if(SS_verifyRound(candidate)){round=candidate;break;}
    }
    if(!round){
      console.warn('[SpatialSpin] Emergency fallback triggered (n='+n+', mode='+mode+', round='+G.round+')');
      // Ultimate safety net: hand-built shape + options that never depend on
      // Fresh-history-gated generators, so this path can NEVER return null/throw,
      // no matter how constrained the freshness history has become.
      const fb=SS_norm([[0,0],[1,0],[1,1]]);
      let built=null;
      try{built=SS_buildOptions(fb,'easy');}catch(e){built=null;}
      if(built&&built.promptCells&&built.options&&built.options.length===4){
        round={rule:'rotation',target:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb),promptCells:built.promptCells,options:built.options};
      }else{
        // Fully manual fallback — hardcoded 4-block shape, 3 genuinely different distractors.
        const manualCorrect=SS_norm([[0,0],[1,0],[2,0],[2,1]]);
        const manualWrong=[
          SS_norm([[0,0],[0,1],[0,2],[0,3]]),
          SS_norm([[0,0],[1,0],[1,1],[2,1]]),
          SS_norm([[0,0],[0,1],[1,0],[1,1]])
        ];
        const opts=[{cells:manualCorrect,correct:true,style:'rotation'}]
          .concat(manualWrong.map(c=>({cells:c,correct:false,style:'random'})));
        SS_shuffle(opts);
        round={rule:'rotation',target:manualCorrect,canon:SS_canonicalHash(manualCorrect),sil:SS_silhouetteKey(manualCorrect),promptCells:manualCorrect,options:opts};
      }
    }
    Fresh.addCanon(round.canon, round.target.length);
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

  function SS_taskChip(rule){
    const map={
      rotation:{icon:'\uD83D\uDD04',text:'TAP THE ROTATION', hue:'#7C3AED'},
      mirror:  {icon:'\uD83E\uDE9E',text:'TAP THE MIRROR',   hue:'#EC4899'},
      missing: {icon:'\uD83E\uDDE9',text:'WHERE DOES IT GO?',hue:'#34D399'},
      chain:   {icon:'\uD83D\uDD17',text:'WHICH ANGLE?',     hue:'#F97316'}
    };
    const m=map[rule]||map.rotation;
    return'<div class="ss-task-chip" style="background:'+m.hue+';"><span class="ss-task-icon">'+m.icon+'</span><span class="ss-task-text">'+m.text+'</span></div>';
  }
  function SS_helperFor(rule){
    const map={
      rotation:'Match the shape \u2014 NOT the mirror.',
      mirror:'Pick the shape that is FLIPPED, not rotated.',
      missing:'Place the missing block to complete the shape.',
      chain:'How much was BEFORE rotated to make AFTER?'
    };
    return map[rule]||map.rotation;
  }

  function renderRound(round){
    const def=SS_MODES[mode];
    const zen=def.zen;
    const cs=24;
    const promptColor=SS_PALETTE[G.round%SS_PALETTE.length];
    const optColors=[SS_PALETTE[(G.round+1)%SS_PALETTE.length],SS_PALETTE[(G.round+2)%SS_PALETTE.length],SS_PALETTE[(G.round+3)%SS_PALETTE.length],SS_PALETTE[(G.round+4)%SS_PALETTE.length]];
    const heartsHtml=zen?'<div class="qm-zen-tag">\uD83E\uDDD8 Zen \u2014 no timer / lives</div>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';
    const taskChip=SS_taskChip(round.rule);

    let promptSvg='';
    let optsHtml='';
    if(round.rule==='rotation'||round.rule==='mirror'){
      promptSvg=SS_drawShapeSvg(round.target,cs,promptColor);
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(round.rule==='missing'){
      promptSvg=SS_drawMissingPrompt(round.partial,cs,promptColor);
      optsHtml=round.options.map((o,i)=>{
        const merged=SS_norm(round.partial.concat([o.pos]));
        return '<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(merged,20,optColors[i],{ghostCell:o.pos,stroke:'#fff'})+'</button>';
      }).join('');
    }else if(round.rule==='chain'){
      promptSvg=
        '<div class="ss-chain-pair">'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">BEFORE</div>'+SS_drawShapeSvg(round.promptCells,cs,promptColor)+'</div>'+
          '<div class="ss-chain-arrow">\u2192</div>'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">AFTER</div>'+SS_drawShapeSvg(round.afterCells,cs,SS_PALETTE[(G.round+2)%SS_PALETTE.length])+'</div>'+
        '</div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt ss-opt-text" data-i="'+i+'"><span class="ss-angle">'+o.label+'</span></button>').join('');
    }

    const showHint=G.round<2&&!zen&&def.rule==='rotation';
    const recipe=round.rule==='rotation'?SS_recipeForRound():round.rule;
    const recipeChip='<span class="ss-mini-tag">'+recipe.toUpperCase()+'</span>';

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span><span>Correct <strong>'+G.correctCount+'</strong></span></div>'+
      taskChip+
      '<div class="ss-helper">'+SS_helperFor(round.rule)+' '+recipeChip+'</div>'+
      '<div class="ss-disp-wrap"><div id="ssDisp" class="ss-disp">'+promptSvg+'</div></div>'+
      (showHint?'<div class="ss-hint">\uD83D\uDCA1 Watch it rotate \u2014 pick the matching shape</div>':'')+
      '<div class="ss-opts" id="ssOpts">'+optsHtml+'</div>'+
      '<div id="ssFb" class="ss-fb"></div>';

    if(showHint){
      const dispEl=host.querySelector('#ssDisp');
      if(dispEl){
        _st(()=>{dispEl.style.transition='transform 1s ease-in-out';dispEl.style.transform='rotate(360deg)';
          _st(()=>{dispEl.style.transition='none';dispEl.style.transform='';},1050);},300);
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
    const skillKey=round.rule==='rotation'?'rotation':round.rule==='mirror'?'mirror':round.rule;
    if(G.skill[skillKey]){G.skill[skillKey].n++;if(isCorrect)G.skill[skillKey].ok++;}
    Adapt.record(isCorrect,ms,G.timerMs||5000,round.options[correctIdx]&&round.options[correctIdx].style,pickedStyle);

    if(isCorrect){
      playSound('correct');try{navigator.vibrate&&navigator.vibrate(10);}catch(e){}
      G.correctCount++;
      if(optEls[pickedIdx])optEls[pickedIdx].classList.add('ss-correct');
      if(fb){fb.style.color='#22C55E';fb.textContent='\u2705 Correct!';}
      G.round++;setScore(G.round);
      _st(nextQ,def.zen?500:520);
    }else{
      playSound('wrong');try{navigator.vibrate&&navigator.vibrate([20,40,20]);}catch(e){}
      if(pickedIdx>=0&&optEls[pickedIdx])optEls[pickedIdx].classList.add('ss-wrong');
      if(optEls[correctIdx])optEls[correctIdx].classList.add('ss-correct');
      if(fb){fb.style.color='#EF4444';fb.textContent=timedOut?'\u23F1 Time\u2019s up!':'\u274C Wrong!';}
      if(def.zen){
        const exp=$('<div class="ss-explain">'+SS_explainWrong(round,pickedIdx)+'</div>');
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
  function SS_explainWrong(round,pickedIdx){
    if(pickedIdx<0)return '\u23F1 Time ran out. Sahi answer highlighted hai.';
    const o=round.options[pickedIdx];
    if(!o)return 'Sahi answer highlighted hai.';
    if(o.style&&o.style.indexOf('mirror')===0)return '\uD83E\uDE9E That was a MIRROR \u2014 rotation chahiye thi.';
    if(o.style==='oneBlockMod'||o.style==='branchSwap')return '\uD83D\uDD0D Ek block alag jagah hai \u2014 dhyaan se dekho.';
    if(o.style==='nearMatch')return '\uD83C\uDFAF Bahut similar shape thi \u2014 lekin rotation match nahi.';
    if(o.style==='random')return '\uD83D\uDCA1 Yeh ek alag shape thi.';
    if(round.rule==='chain')return '\uD83D\uDD17 Galat angle. Block-by-block compare karo.';
    if(round.rule==='missing')return '\uD83E\uDDE9 Block correct frontier pe nahi tha.';
    return 'Sahi answer highlighted hai.';
  }
  function _loseLife(){
    if(SS_MODES[mode].zen)return false;
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    return G.lives<=0;
  }

  /* ---------- game over + insight ---------- */
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
    const skillStore=S('nz_ss_skill')||{rotation:[0,0],mirror:[0,0],missing:[0,0],chain:[0,0]};
    ['rotation','mirror','missing','chain'].forEach(k=>{
      skillStore[k]=skillStore[k]||[0,0];
      skillStore[k][0]+=G.skill[k].ok;
      skillStore[k][1]+=G.skill[k].n;
    });
    setS('nz_ss_skill',skillStore);

    const rank=SS_rank(finalRound);
    const xp=Math.max(2,Math.round(finalRound*2.7));
    const insight=SS_buildInsight();
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
        '<div class="row"><span>Mirror Errors</span><span class="val">'+G.skill.mirrorErrors+'</span></div>'+
        '<div class="row"><span>XP Earned</span><span class="val">+'+xp+'</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(finalRound,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      (insight?'<div class="ss-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }
  function SS_buildInsight(){
    const total=G.attempts;
    if(total<5)return '';
    const mErr=G.skill.mirrorErrors,nErr=G.skill.nearErrors;
    if(mErr>=Math.max(2,total*0.25))return '\uD83E\uDE9E You\u2019re strong at rotation but confused mirrors '+mErr+' times \u2014 try Mirror Hunter mode.';
    if(nErr>=Math.max(2,total*0.2))return '\uD83C\uDFAF Near-match traps got you '+nErr+' times \u2014 slow down and compare cell-by-cell.';
    const acc=G.correctCount/total;
    if(acc>=0.85&&Adapt.avgRT()<2000)return '\u26A1 Excellent rotation speed AND accuracy. Try Hard or Speed mode.';
    if(acc>=0.85)return '\u2705 High accuracy \u2014 try a faster mode for more challenge.';
    if(acc<0.5)return '\uD83C\uDF31 Build foundation in Easy / Zen modes \u2014 explanations help.';
    return '';
  }

  /* ---------- dev self-test (off in production; flip to true or call SS_runSimulation() from console) ---------- */
  function SS_runSimulation(){
    const TR=300;const r={};let ge=0;
    SS_MODE_ORDER.forEach(mk=>{
      mode=mk;Fresh.clear();Adapt.reset();G.round=0;G.lives=SS_MODES[mk].zen?Infinity:3;
      G.skill={rotation:{ok:0,n:0},mirror:{ok:0,n:0},missing:{ok:0,n:0},chain:{ok:0,n:0},mirrorErrors:0,nearErrors:0};
      let em=0;const sc={};let vf=0;
      for(let i=0;i<TR;i++){
        const def=SS_MODES[mk];const n=SS_blockCountForRound(G.round);
        let rd=null;
        for(let a=0;a<8;a++){
          const sh=SS_makeFreshShape(n,{branching:0.25+Math.random()*0.5});
          let bu;
          if(def.rule==='missing'){bu=SS_buildMissingOptions(sh.cells);if(!bu)continue;}
          else if(def.rule==='chain'){bu=SS_buildChainOptions(sh.cells);}
          else if(def.rule==='mirror'){bu=SS_buildOptions(sh.cells,'mirror');}
          else{bu=SS_buildOptions(sh.cells,SS_recipeForRound());}
          if(!bu)continue;
          const ca={rule:def.rule,target:sh.cells,canon:sh.canon,sil:sh.sil,
            promptCells:bu.promptCells||sh.cells,partial:bu.partial,
            afterCells:bu.afterCells,angle:bu.angle,options:bu.options};
          if(SS_verifyRound(ca)){rd=ca;break;}
        }
        if(!rd){em++;const fb=SS_norm([[0,0],[1,0],[1,1]]);let bu=null;
          try{bu=SS_buildOptions(fb,'easy');}catch(e){}
          if(bu&&bu.promptCells&&bu.options&&bu.options.length===4)
            rd={rule:'rotation',target:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb),promptCells:bu.promptCells,options:bu.options};
          else{const mc=SS_norm([[0,0],[1,0],[2,0],[2,1]]);const mw=[SS_norm([[0,0],[0,1],[0,2],[0,3]]),SS_norm([[0,0],[1,0],[1,1],[2,1]]),SS_norm([[0,0],[0,1],[1,0],[1,1]])];
            rd={rule:'rotation',target:mc,canon:SS_canonicalHash(mc),sil:SS_silhouetteKey(mc),promptCells:mc,
              options:[{cells:mc,correct:true,style:'rotation'}].concat(mw.map(c=>({cells:c,correct:false,style:'random'})))};
            SS_shuffle(rd.options);}
        }
        Fresh.addCanon(rd.canon,rd.target.length);
        Fresh.add(Fresh.silhouettes,rd.sil,Fresh.maxSil);
        const ss=(rd.options||[]).map(o=>o.style||'-').sort().join('+');
        Fresh.add(Fresh.distrStyles,ss,Fresh.maxStyle);
        const ci=(rd.options||[]).findIndex(o=>o.correct);
        if(ci>=0)Fresh.add(Fresh.correctPos,ci,Fresh.maxPos);
        sc[rd.canon]=(sc[rd.canon]||0)+1;
        if(!SS_verifyRound(rd))vf++;
        G.round++;
      }
      r[mk]={emergencies:em,distinctShapes:Object.keys(sc).length,verifyFails:vf};
      ge+=em;
      console.log('[SS_Sim] '+mk+' emerg='+em+' shapes='+Object.keys(sc).length+' vfails='+vf);
    });
    console.log('[SS_Sim] TOTAL emergencies='+ge);
    return r;
  }
  if(false){console.log('[SpatialSpin] Simulation results:',SS_runSimulation());}

  renderStart();
}
